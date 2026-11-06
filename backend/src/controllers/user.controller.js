// user.controller.js — System Admin Profile Management with Two-Way Keycloak Synchronization

const db = require("../config/database");
const kcAdmin = require("../services/keycloak-admin.service");

/**
 * Normalize role string to standard DB values: 'Student', 'Lecturer', 'System Admin'
 */
function normalizeDbRole(rawRole) {
  const r = String(rawRole || "").trim().toLowerCase();
  if (r.includes("admin")) return "System Admin";
  if (r === "lecturer" || r === "reviewer") return "Lecturer";
  return "Student";
}

/**
 * Generate a 9-character user_id (e.g. STU000005, LEC000005, ADM000005) if not provided.
 */
async function generateNextUserId(role) {
  const norm = normalizeDbRole(role);
  const prefix = norm === "System Admin" ? "ADM" : norm === "Lecturer" ? "LEC" : "STU";

  const res = await db.query(
    `SELECT user_id FROM public."Users" WHERE UPPER(user_id) LIKE $1 ORDER BY user_id DESC LIMIT 50`,
    [`${prefix}%`]
  );

  let maxNum = 0;
  for (const row of res.rows) {
    const numPart = parseInt(String(row.user_id).slice(3), 10);
    if (!isNaN(numPart) && numPart > maxNum) {
      maxNum = numPart;
    }
  }

  return `${prefix}${String(maxNum + 1).padStart(6, "0")}`;
}

/**
 * Ensure the Users table has `enabled` and `keycloak_username` columns for full Keycloak state tracking.
 */
async function ensureUsersProfileColumns() {
  try {
    await db.query(`
      ALTER TABLE public."Users"
      ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;
    `);
    await db.query(`
      ALTER TABLE public."Users"
      ADD COLUMN IF NOT EXISTS keycloak_username VARCHAR(100);
    `);
  } catch (err) {
    console.warn("[UserController] Schema check warning:", err.message);
  }
}

/**
 * Reconcile users between Keycloak and PostgreSQL so that:
 * 1) Any user created or modified in Keycloak (name, email, role, enabled status) is reflected in PostgreSQL "Users"
 * 2) Optionally, any PostgreSQL user missing from Keycloak is pushed into Keycloak
 */
async function reconcileWithKeycloak({ pushMissingToKeycloak = false } = {}) {
  await ensureUsersProfileColumns();

  let kcConnected = false;
  let kcUsers = [];
  let kcError = null;

  try {
    const kcResult = await kcAdmin.fetchAllKeycloakUsers();
    kcUsers = kcResult.users || [];
    kcConnected = true;
  } catch (err) {
    kcError = err.message;
    console.warn("[KeycloakSync] Keycloak unreachable during profile sync:", err.message);
  }

  const dbRes = await db.query(`
    SELECT user_id, firstname, surname, email, role, supervisor_id, academic_level,
           enabled, keycloak_username, created_at, updated_at
    FROM public."Users"
    ORDER BY created_at DESC, user_id ASC
  `);
  const dbUsers = dbRes.rows;

  const matchedDbUserIds = new Set();
  let pulledFromKeycloak = 0;
  let pushedToKeycloak = 0;

  if (kcConnected) {
    // Pass 1: Pull changes from Keycloak into PostgreSQL
    for (const ku of kcUsers) {
      // Find matching DB user by user_id attribute, keycloak_username, email, or user_id == username
      const uidAttr = (ku.userId || "").trim().slice(0, 9);
      const match = dbUsers.find(
        (du) =>
          (uidAttr && String(du.user_id).toLowerCase() === uidAttr.toLowerCase()) ||
          (du.keycloak_username &&
            String(du.keycloak_username).toLowerCase() === String(ku.username).toLowerCase()) ||
          String(du.user_id).toLowerCase() === String(ku.username).toLowerCase() ||
          (ku.email && String(du.email).toLowerCase() === String(ku.email).toLowerCase()) ||
          `${du.firstname || ""}${du.surname || ""}`.replace(/\s+/g, "").toLowerCase() ===
            String(ku.username || "").replace(/\s+/g, "").toLowerCase()
      );

      const kcFirstName = (ku.firstName || ku.username || "User").trim().slice(0, 50);
      const kcLastName = (ku.lastName || "Account").trim().slice(0, 50);
      const kcEmail = (ku.email || `${ku.username}@ub.ac.bw`).trim().slice(0, 50);
      const kcRole = ku.mappedRole || "Student";
      const kcEnabled = ku.enabled !== false;

      if (match) {
        matchedDbUserIds.add(match.user_id);

        // Check if Keycloak has newer/different values (e.g., edited directly in Keycloak Admin Console)
        const roleChanged =
          ku.mappedRole && normalizeDbRole(match.role) !== normalizeDbRole(ku.mappedRole);
        const nameChanged =
          (ku.firstName && ku.firstName.trim() && ku.firstName.trim() !== match.firstname) ||
          (ku.lastName && ku.lastName.trim() && ku.lastName.trim() !== match.surname);
        const emailChanged =
          ku.email && ku.email.trim() && ku.email.trim().toLowerCase() !== String(match.email).toLowerCase();
        const enabledChanged = Boolean(match.enabled) !== kcEnabled;
        const usernameMissing = match.keycloak_username !== ku.username;

        if (roleChanged || nameChanged || emailChanged || enabledChanged || usernameMissing) {
          const updatedFirst = ku.firstName?.trim() ? kcFirstName : match.firstname;
          const updatedLast = ku.lastName?.trim() ? kcLastName : match.surname;
          const updatedEmail = ku.email?.trim() ? kcEmail : match.email;
          const updatedRole = ku.mappedRole ? kcRole : match.role;
          let updatedLevel = ku.academicLevel || match.academic_level;
          if (normalizeDbRole(updatedRole) !== "Student") {
            updatedLevel = null;
          } else if (!updatedLevel) {
            updatedLevel = "Master's";
          }

          await db.query(
            `UPDATE public."Users"
             SET firstname = $1,
                 surname = $2,
                 email = $3,
                 role = $4,
                 enabled = $5,
                 keycloak_username = $6,
                 academic_level = $7,
                 updated_at = NOW()
             WHERE user_id = $8`,
            [
              updatedFirst,
              updatedLast,
              updatedEmail,
              updatedRole,
              kcEnabled,
              ku.username,
              updatedLevel,
              match.user_id,
            ]
          );
          pulledFromKeycloak++;
        }
      } else {
        // User exists in Keycloak (`publications` realm) but not yet in PostgreSQL "Users" -> import into DB!
        let newUserId = uidAttr;
        if (!newUserId || dbUsers.some((d) => d.user_id.toLowerCase() === newUserId.toLowerCase())) {
          newUserId = await generateNextUserId(kcRole);
        }

        const defaultAcademicLevel =
          normalizeDbRole(kcRole) === "Student" ? ku.academicLevel || "Master's" : null;

        // Pick a default lecturer supervisor if student
        let defaultSupervisor = null;
        if (normalizeDbRole(kcRole) === "Student") {
          const supRes = await db.query(
            `SELECT user_id FROM public."Users" WHERE LOWER(role) = 'lecturer' ORDER BY user_id ASC LIMIT 1`
          );
          defaultSupervisor = supRes.rows[0]?.user_id || null;
        }

        await db.query(
          `INSERT INTO public."Users"
             (user_id, firstname, surname, email, role, supervisor_id, academic_level, enabled, keycloak_username, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE, NOW())
           ON CONFLICT (user_id) DO NOTHING`,
          [
            newUserId,
            kcFirstName,
            kcLastName,
            kcEmail,
            kcRole,
            defaultSupervisor,
            defaultAcademicLevel,
            kcEnabled,
            ku.username,
          ]
        );

        dbUsers.push({
          user_id: newUserId,
          firstname: kcFirstName,
          surname: kcLastName,
          email: kcEmail,
          role: kcRole,
          supervisor_id: defaultSupervisor,
          academic_level: defaultAcademicLevel,
          enabled: kcEnabled,
          keycloak_username: ku.username,
        });
        matchedDbUserIds.add(newUserId);
        pulledFromKeycloak++;

        // Ensure the user_id attribute is also stored back on the Keycloak user
        if (!ku.userId) {
          try {
            await kcAdmin.upsertUserInKeycloak({
              user_id: newUserId,
              username: ku.username,
              firstname: kcFirstName,
              surname: kcLastName,
              email: kcEmail,
              role: kcRole,
              academic_level: defaultAcademicLevel,
              enabled: kcEnabled,
            });
          } catch {}
        }
      }
    }

    // Pass 2: Optionally push DB users that aren't in Keycloak yet so all accounts are in Keycloak
    if (pushMissingToKeycloak) {
      for (const du of dbUsers) {
        if (!matchedDbUserIds.has(du.user_id)) {
          try {
            const syncRes = await kcAdmin.upsertUserInKeycloak({
              user_id: du.user_id,
              username: du.keycloak_username,
              firstname: du.firstname,
              surname: du.surname,
              email: du.email,
              role: du.role,
              academic_level: du.academic_level,
              enabled: du.enabled !== false,
            });
            if (syncRes.username) {
              await db.query(
                `UPDATE public."Users" SET keycloak_username = $1 WHERE user_id = $2`,
                [syncRes.username, du.user_id]
              );
            }
            pushedToKeycloak++;
          } catch (pushErr) {
            console.warn(`[KeycloakSync] Failed to push user ${du.user_id} to Keycloak:`, pushErr.message);
          }
        }
      }

      // Refresh kcUsers after pushing
      try {
        const refreshed = await kcAdmin.fetchAllKeycloakUsers();
        kcUsers = refreshed.users || kcUsers;
      } catch {}
    }
  }

  // Fetch final enriched list from PostgreSQL with supervisor names and publication counts
  const finalRes = await db.query(`
    SELECT
      u.user_id,
      u.firstname,
      u.surname,
      u.email,
      u.role,
      u.supervisor_id,
      u.academic_level,
      COALESCE(u.enabled, TRUE) AS enabled,
      u.keycloak_username,
      u.created_at,
      u.updated_at,
      s.firstname AS supervisor_firstname,
      s.surname AS supervisor_surname,
      s.email AS supervisor_email,
      (SELECT COUNT(*)::int FROM public."Publications" p WHERE p.submitted_by = u.user_id) AS submitted_count,
      (SELECT COUNT(*)::int FROM public."Publications" p WHERE p.lecturer_id = u.user_id) AS assigned_review_count
    FROM public."Users" u
    LEFT JOIN public."Users" s ON u.supervisor_id = s.user_id
    ORDER BY
      CASE
        WHEN LOWER(u.role) LIKE '%admin%' THEN 1
        WHEN LOWER(u.role) = 'lecturer' THEN 2
        ELSE 3
      END ASC,
      u.user_id ASC
  `);

  const profiles = finalRes.rows.map((u) => {
    const kcMatch = kcConnected
      ? kcAdmin.matchKeycloakUser(kcUsers, {
          user_id: u.user_id,
          username: u.keycloak_username,
          email: u.email,
          firstname: u.firstname,
          surname: u.surname,
        })
      : null;

    return {
      ...u,
      keycloak_synced: Boolean(kcMatch),
      keycloak_id: kcMatch?.kcId || null,
      keycloak_username: kcMatch?.username || u.keycloak_username || null,
      keycloak_roles: kcMatch?.realmRoles || kcAdmin.dbRoleToKeycloakRoles(u.role),
      keycloak_enabled: kcMatch ? kcMatch.enabled : u.enabled !== false,
    };
  });

  if (kcConnected) {
    kcAdmin.updateRealmExportJson(profiles);
  }

  return {
    keycloakConnected: kcConnected,
    keycloakError: kcError,
    pulledFromKeycloak,
    pushedToKeycloak,
    total: profiles.length,
    users: profiles,
  };
}

// GET /api/admin/users — List all user profiles (automatically reconciles changes made in Keycloak)
exports.getAllUsers = async (req, res) => {
  try {
    const syncMissing = req.query.pushMissing !== "false";
    const data = await reconcileWithKeycloak({ pushMissingToKeycloak: syncMissing });
    return res.status(200).json(data);
  } catch (err) {
    console.error("[UserController] getAllUsers error:", err);
    return res.status(500).json({ error: "Failed to load user profiles: " + err.message });
  }
};

// POST /api/admin/users/sync — Explicit two-way sync between PostgreSQL and Keycloak
exports.syncWithKeycloak = async (req, res) => {
  try {
    const data = await reconcileWithKeycloak({ pushMissingToKeycloak: true });
    return res.status(200).json({
      message: data.keycloakConnected
        ? `Synchronized ${data.total} profiles with Keycloak (${data.pulledFromKeycloak} updated from Keycloak, ${data.pushedToKeycloak} pushed to Keycloak).`
        : "Keycloak server is currently unreachable; displaying local database profiles.",
      ...data,
    });
  } catch (err) {
    console.error("[UserController] syncWithKeycloak error:", err);
    return res.status(500).json({ error: "Failed to synchronize with Keycloak: " + err.message });
  }
};

// POST /api/admin/users — Create a new user profile in PostgreSQL and Keycloak
exports.createUser = async (req, res) => {
  try {
    await ensureUsersProfileColumns();

    const {
      user_id,
      username,
      firstname,
      surname,
      email,
      role,
      supervisor_id,
      academic_level,
      password,
      enabled,
    } = req.body;

    if (!firstname || !String(firstname).trim() || !surname || !String(surname).trim()) {
      return res.status(400).json({ error: "First name and surname are required." });
    }
    if (!email || !String(email).trim()) {
      return res.status(400).json({ error: "Email address is required." });
    }

    const cleanFirst = String(firstname).trim().slice(0, 50);
    const cleanLast = String(surname).trim().slice(0, 50);
    const cleanEmail = String(email).trim().slice(0, 50);
    const cleanRole = normalizeDbRole(role);
    const isStudent = cleanRole === "Student";
    const cleanAcademicLevel = isStudent ? (academic_level || "Master's") : null;
    const cleanSupervisorId = isStudent && supervisor_id ? String(supervisor_id).trim() : null;
    const isEnabled = enabled !== false;

    let cleanUserId = user_id ? String(user_id).trim().toUpperCase() : "";
    if (!cleanUserId) {
      cleanUserId = await generateNextUserId(cleanRole);
    }
    if (cleanUserId.length > 9) {
      return res.status(400).json({ error: "User ID must not exceed 9 characters (e.g. STU000003, LEC000003)." });
    }

    // Check duplicate user_id or email
    const dupCheck = await db.query(
      `SELECT user_id, email FROM public."Users" WHERE LOWER(user_id) = LOWER($1) OR LOWER(email) = LOWER($2) LIMIT 1`,
      [cleanUserId, cleanEmail]
    );
    if (dupCheck.rowCount > 0) {
      return res.status(409).json({
        error: `A user with ID "${cleanUserId}" or email "${cleanEmail}" already exists.`,
      });
    }

    const cleanUsername =
      (username && String(username).trim()) ||
      `${cleanFirst}${cleanLast}`.replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase() ||
      cleanUserId.toLowerCase();

    // 1. Insert into PostgreSQL "Users"
    await db.query(
      `INSERT INTO public."Users"
         (user_id, firstname, surname, email, role, supervisor_id, academic_level, enabled, keycloak_username, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE, NOW())`,
      [
        cleanUserId,
        cleanFirst,
        cleanLast,
        cleanEmail,
        cleanRole,
        cleanSupervisorId,
        cleanAcademicLevel,
        isEnabled,
        cleanUsername,
      ]
    );

    // 2. Sync to Keycloak
    let keycloakSyncWarning = null;
    try {
      const kcRes = await kcAdmin.upsertUserInKeycloak(
        {
          user_id: cleanUserId,
          username: cleanUsername,
          firstname: cleanFirst,
          surname: cleanLast,
          email: cleanEmail,
          role: cleanRole,
          academic_level: cleanAcademicLevel,
          enabled: isEnabled,
        },
        password || "password"
      );
      if (kcRes.username && kcRes.username !== cleanUsername) {
        await db.query(`UPDATE public."Users" SET keycloak_username = $1 WHERE user_id = $2`, [
          kcRes.username,
          cleanUserId,
        ]);
      }
    } catch (kcErr) {
      console.warn("[UserController] Keycloak create warning:", kcErr.message);
      keycloakSyncWarning = kcErr.message;
    }

    const data = await reconcileWithKeycloak({ pushMissingToKeycloak: false });
    const createdProfile = data.users.find((u) => u.user_id === cleanUserId);

    return res.status(201).json({
      message: keycloakSyncWarning
        ? `Profile ${cleanUserId} created in database (Keycloak warning: ${keycloakSyncWarning}).`
        : `Profile ${cleanUserId} (${cleanFirst} ${cleanLast}) created in PostgreSQL and Keycloak.`,
      user: createdProfile,
      users: data.users,
    });
  } catch (err) {
    console.error("[UserController] createUser error:", err);
    return res.status(500).json({ error: "Failed to create user profile: " + err.message });
  }
};

// PUT /api/admin/users/:id — Update user profile in PostgreSQL and Keycloak
exports.updateUser = async (req, res) => {
  try {
    await ensureUsersProfileColumns();
    const targetId = String(req.params.id || "").trim();
    if (!targetId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    const existingRes = await db.query(
      `SELECT * FROM public."Users" WHERE user_id = $1 LIMIT 1`,
      [targetId]
    );
    if (existingRes.rowCount === 0) {
      return res.status(404).json({ error: `User "${targetId}" was not found.` });
    }
    const existing = existingRes.rows[0];

    const {
      firstname,
      surname,
      email,
      role,
      supervisor_id,
      academic_level,
      enabled,
      password,
      username,
    } = req.body;

    const cleanFirst = firstname !== undefined ? String(firstname).trim().slice(0, 50) : existing.firstname;
    const cleanLast = surname !== undefined ? String(surname).trim().slice(0, 50) : existing.surname;
    const cleanEmail = email !== undefined ? String(email).trim().slice(0, 50) : existing.email;
    const cleanRole = role !== undefined ? normalizeDbRole(role) : existing.role;
    const isStudent = cleanRole === "Student";
    const cleanAcademicLevel = isStudent
      ? academic_level !== undefined
        ? academic_level || "Master's"
        : existing.academic_level || "Master's"
      : null;
    const cleanSupervisorId = isStudent
      ? supervisor_id !== undefined
        ? supervisor_id || null
        : existing.supervisor_id
      : null;
    const isEnabled = enabled !== undefined ? Boolean(enabled) : existing.enabled !== false;
    const cleanUsername =
      (username && String(username).trim()) || existing.keycloak_username || null;

    if (!cleanFirst || !cleanLast || !cleanEmail) {
      return res.status(400).json({ error: "First name, surname, and email cannot be empty." });
    }

    // 1. Update PostgreSQL "Users"
    await db.query(
      `UPDATE public."Users"
       SET firstname = $1,
           surname = $2,
           email = $3,
           role = $4,
           supervisor_id = $5,
           academic_level = $6,
           enabled = $7,
           keycloak_username = COALESCE($8, keycloak_username),
           updated_at = NOW()
       WHERE user_id = $9`,
      [
        cleanFirst,
        cleanLast,
        cleanEmail,
        cleanRole,
        cleanSupervisorId,
        cleanAcademicLevel,
        isEnabled,
        cleanUsername,
        targetId,
      ]
    );

    // 2. Sync update to Keycloak
    let keycloakSyncWarning = null;
    try {
      const kcRes = await kcAdmin.upsertUserInKeycloak(
        {
          user_id: targetId,
          username: cleanUsername,
          firstname: cleanFirst,
          surname: cleanLast,
          email: cleanEmail,
          role: cleanRole,
          academic_level: cleanAcademicLevel,
          enabled: isEnabled,
        },
        password && String(password).trim() ? String(password).trim() : null
      );
      if (kcRes.username && kcRes.username !== cleanUsername) {
        await db.query(`UPDATE public."Users" SET keycloak_username = $1 WHERE user_id = $2`, [
          kcRes.username,
          targetId,
        ]);
      }
    } catch (kcErr) {
      console.warn("[UserController] Keycloak update warning:", kcErr.message);
      keycloakSyncWarning = kcErr.message;
    }

    const data = await reconcileWithKeycloak({ pushMissingToKeycloak: false });
    const updatedProfile = data.users.find((u) => u.user_id === targetId);

    return res.status(200).json({
      message: keycloakSyncWarning
        ? `Profile ${targetId} updated in database (Keycloak warning: ${keycloakSyncWarning}).`
        : `Profile ${targetId} (${cleanFirst} ${cleanLast}) updated in PostgreSQL and Keycloak.`,
      user: updatedProfile,
      users: data.users,
    });
  } catch (err) {
    console.error("[UserController] updateUser error:", err);
    return res.status(500).json({ error: "Failed to update user profile: " + err.message });
  }
};

// PATCH /api/admin/users/:id/status — Activate or deactivate a user in PostgreSQL and Keycloak
exports.toggleUserStatus = async (req, res) => {
  try {
    await ensureUsersProfileColumns();
    const targetId = String(req.params.id || "").trim();
    const existingRes = await db.query(
      `SELECT * FROM public."Users" WHERE user_id = $1 LIMIT 1`,
      [targetId]
    );
    if (existingRes.rowCount === 0) {
      return res.status(404).json({ error: `User "${targetId}" was not found.` });
    }
    const existing = existingRes.rows[0];
    const nextEnabled =
      req.body.enabled !== undefined ? Boolean(req.body.enabled) : existing.enabled === false;

    await db.query(
      `UPDATE public."Users" SET enabled = $1, updated_at = NOW() WHERE user_id = $2`,
      [nextEnabled, targetId]
    );

    let keycloakSyncWarning = null;
    try {
      await kcAdmin.upsertUserInKeycloak({
        user_id: targetId,
        username: existing.keycloak_username,
        firstname: existing.firstname,
        surname: existing.surname,
        email: existing.email,
        role: existing.role,
        academic_level: existing.academic_level,
        enabled: nextEnabled,
      });
    } catch (kcErr) {
      keycloakSyncWarning = kcErr.message;
    }

    const data = await reconcileWithKeycloak({ pushMissingToKeycloak: false });
    return res.status(200).json({
      message: `User ${targetId} has been ${nextEnabled ? "activated" : "deactivated"} in PostgreSQL${
        keycloakSyncWarning ? "" : " and Keycloak"
      }.`,
      users: data.users,
    });
  } catch (err) {
    console.error("[UserController] toggleUserStatus error:", err);
    return res.status(500).json({ error: "Failed to change user status: " + err.message });
  }
};

// DELETE /api/admin/users/:id — Delete user from PostgreSQL and Keycloak
exports.deleteUser = async (req, res) => {
  try {
    const targetId = String(req.params.id || "").trim();
    if (req.user?.id && String(req.user.id).toLowerCase() === targetId.toLowerCase()) {
      return res.status(400).json({ error: "You cannot delete your own active administrator account." });
    }

    const existingRes = await db.query(
      `SELECT * FROM public."Users" WHERE user_id = $1 LIMIT 1`,
      [targetId]
    );
    if (existingRes.rowCount === 0) {
      return res.status(404).json({ error: `User "${targetId}" was not found.` });
    }
    const existing = existingRes.rows[0];

    // Check if user has submitted publications that prevent hard deletion
    const pubCheck = await db.query(
      `SELECT COUNT(*)::int AS cnt FROM public."Publications" WHERE submitted_by = $1`,
      [targetId]
    );
    if ((pubCheck.rows[0]?.cnt || 0) > 0) {
      return res.status(400).json({
        error: `User "${targetId}" has ${pubCheck.rows[0].cnt} submitted publication(s). Deactivate their account instead of deleting to preserve repository history.`,
      });
    }

    // Clear references where this user is lecturer_id or supervisor_id
    await db.query(`UPDATE public."Users" SET supervisor_id = NULL WHERE supervisor_id = $1`, [targetId]);
    await db.query(`UPDATE public."Publications" SET lecturer_id = NULL WHERE lecturer_id = $1`, [targetId]);
    await db.query(`DELETE FROM public."Publication Status History" WHERE changed_by = $1`, [targetId]);
    await db.query(`DELETE FROM public."Users" WHERE user_id = $1`, [targetId]);

    try {
      await kcAdmin.deleteUserFromKeycloak({
        user_id: targetId,
        username: existing.keycloak_username,
        email: existing.email,
      });
    } catch (kcErr) {
      console.warn("[UserController] Keycloak delete warning:", kcErr.message);
    }

    const data = await reconcileWithKeycloak({ pushMissingToKeycloak: false });
    return res.status(200).json({
      message: `Profile ${targetId} (${existing.firstname} ${existing.surname}) deleted from PostgreSQL and Keycloak.`,
      users: data.users,
    });
  } catch (err) {
    console.error("[UserController] deleteUser error:", err);
    return res.status(500).json({ error: "Failed to delete user profile: " + err.message });
  }
};

