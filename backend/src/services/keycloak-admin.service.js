// keycloak-admin.service.js — Two-way synchronization & user management with Keycloak Admin REST API

const keycloakConfig = require("../config/keycloak");
const fs = require("fs");
const path = require("path");

const KC_ADMIN_USER = process.env.KEYCLOAK_ADMIN_USERNAME || "admin";
const KC_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || "admin";

/**
 * Obtain a short-lived admin access token from Keycloak master realm.
 */
async function getAdminToken() {
  const tokenUrl = `${keycloakConfig.serverUrl}/realms/master/protocol/openid-connect/token`;
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: "admin-cli",
    username: KC_ADMIN_USER,
    password: KC_ADMIN_PASSWORD,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Keycloak admin auth failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Helper for calling Keycloak Admin REST API in the `publications` realm.
 */
async function kcAdminFetch(endpoint, options = {}, token = null) {
  const accessToken = token || (await getAdminToken());
  const url = `${keycloakConfig.serverUrl}/admin/realms/${keycloakConfig.realm}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Map a PostgreSQL role ('Student', 'Lecturer', 'System Admin') to Keycloak realm role names.
 */
function dbRoleToKeycloakRoles(dbRole) {
  const r = String(dbRole || "").trim().toLowerCase();
  if (r.includes("admin")) return ["admin"];
  if (r === "lecturer" || r === "reviewer") return ["lecturer", "reviewer"];
  return ["student"];
}

/**
 * Map Keycloak realm role names to a normalized PostgreSQL "Users".role label.
 */
function keycloakRolesToDbRole(kcRoles = []) {
  const lower = kcRoles.map((r) => String(r).toLowerCase());
  if (lower.includes("admin")) return "System Admin";
  if (lower.includes("lecturer") || lower.includes("reviewer")) return "Lecturer";
  if (lower.includes("student")) return "Student";
  return null;
}

/**
 * Fetch all available realm roles in `publications` realm so we have their IDs and names.
 */
async function getRealmRolesMap(token) {
  const res = await kcAdminFetch("/roles", { method: "GET" }, token);
  if (!res.ok) return new Map();
  const roles = await res.json();
  const map = new Map();
  for (const role of roles) {
    if (role && role.name) {
      map.set(role.name.toLowerCase(), { id: role.id, name: role.name });
    }
  }
  return map;
}

/**
 * Fetch a single Keycloak user's realm role mappings.
 */
async function getUserRealmRoles(kcUserId, token) {
  const res = await kcAdminFetch(`/users/${kcUserId}/role-mappings/realm`, { method: "GET" }, token);
  if (!res.ok) return [];
  const roles = await res.json();
  return roles
    .map((r) => r.name)
    .filter(
      (n) =>
        n &&
        !n.startsWith("default-roles-") &&
        n !== "offline_access" &&
        n !== "uma_authorization"
    );
}

/**
 * Synchronize a Keycloak user's realm roles to match the target DB role.
 */
async function syncUserRealmRoles(kcUserId, dbRole, token, realmRolesMap = null) {
  const rolesMap = realmRolesMap || (await getRealmRolesMap(token));
  const desiredNames = dbRoleToKeycloakRoles(dbRole);
  const managedRoleNames = ["student", "lecturer", "reviewer", "admin"];

  const currentRes = await kcAdminFetch(`/users/${kcUserId}/role-mappings/realm`, { method: "GET" }, token);
  const currentRoles = currentRes.ok ? await currentRes.json() : [];

  const toRemove = currentRoles.filter(
    (r) =>
      managedRoleNames.includes(String(r.name).toLowerCase()) &&
      !desiredNames.includes(String(r.name).toLowerCase())
  );

  if (toRemove.length > 0) {
    await kcAdminFetch(
      `/users/${kcUserId}/role-mappings/realm`,
      {
        method: "DELETE",
        body: JSON.stringify(toRemove.map((r) => ({ id: r.id, name: r.name }))),
      },
      token
    );
  }

  const toAdd = [];
  for (const name of desiredNames) {
    const roleObj = rolesMap.get(name.toLowerCase());
    if (roleObj) {
      toAdd.push({ id: roleObj.id, name: roleObj.name });
    }
  }

  if (toAdd.length > 0) {
    await kcAdminFetch(
      `/users/${kcUserId}/role-mappings/realm`,
      {
        method: "POST",
        body: JSON.stringify(toAdd),
      },
      token
    );
  }
}

/**
 * Fetch all users from Keycloak along with their realm roles and attributes.
 */
async function fetchAllKeycloakUsers() {
  const token = await getAdminToken();
  const res = await kcAdminFetch("/users?max=500", { method: "GET" }, token);
  if (!res.ok) {
    throw new Error(`Failed to list Keycloak users (${res.status})`);
  }

  const users = await res.json();
  const enriched = await Promise.all(
    users.map(async (u) => {
      const realmRoles = await getUserRealmRoles(u.id, token);
      const attrUserId =
        u.attributes?.user_id?.[0] ||
        u.attributes?.userId?.[0] ||
        null;
      const attrAcademicLevel = u.attributes?.academic_level?.[0] || null;
      return {
        kcId: u.id,
        username: u.username,
        email: u.email || "",
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        enabled: u.enabled !== false,
        userId: attrUserId,
        academicLevel: attrAcademicLevel,
        realmRoles,
        mappedRole: keycloakRolesToDbRole(realmRoles),
        createdTimestamp: u.createdTimestamp || null,
      };
    })
  );

  return { token, users: enriched };
}

/**
 * Find a Keycloak user matching a given DB user_id, username, or email.
 */
function matchKeycloakUser(kcUsers, { user_id, username, email, firstname, surname }) {
  const uidLower = String(user_id || "").trim().toLowerCase();
  const unameLower = String(username || "").trim().toLowerCase();
  const emailLower = String(email || "").trim().toLowerCase();
  const concatName = `${firstname || ""}${surname || ""}`.replace(/\s+/g, "").toLowerCase();

  // 1. Exact user_id attribute match
  if (uidLower) {
    const byAttr = kcUsers.find((k) => String(k.userId || "").toLowerCase() === uidLower);
    if (byAttr) return byAttr;
  }
  // 2. Exact username match (or username == user_id)
  if (unameLower) {
    const byUname = kcUsers.find((k) => String(k.username || "").toLowerCase() === unameLower);
    if (byUname) return byUname;
  }
  if (uidLower) {
    const byUidAsUname = kcUsers.find((k) => String(k.username || "").toLowerCase() === uidLower);
    if (byUidAsUname) return byUidAsUname;
  }
  // 3. Exact email match
  if (emailLower) {
    const byEmail = kcUsers.find((k) => String(k.email || "").toLowerCase() === emailLower);
    if (byEmail) return byEmail;
  }
  // 4. Concatenated firstname+surname matching username (e.g., kabelomolefe)
  if (concatName) {
    const byConcat = kcUsers.find(
      (k) => String(k.username || "").replace(/\s+/g, "").toLowerCase() === concatName
    );
    if (byConcat) return byConcat;
  }

  return null;
}

/**
 * Upsert a user into Keycloak (create if not found, update if found) and sync realm roles + password.
 */
async function upsertUserInKeycloak(userPayload, password = null) {
  const { token, users: kcUsers } = await fetchAllKeycloakUsers();
  const realmRolesMap = await getRealmRolesMap(token);

  const existing = matchKeycloakUser(kcUsers, userPayload);
  const desiredUsername =
    (userPayload.username || "").trim() ||
    existing?.username ||
    `${userPayload.firstname || ""}${userPayload.surname || ""}`
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .toLowerCase() ||
    String(userPayload.user_id).toLowerCase();

  const attributes = {
    user_id: [String(userPayload.user_id)],
  };
  if (userPayload.academic_level) {
    attributes.academic_level = [String(userPayload.academic_level)];
  }

  let kcUserId = existing?.kcId || null;

  if (existing) {
    // Update existing Keycloak user
    const updateBody = {
      username: existing.username, // Keycloak generally locks username if editUsernameAllowed is false
      email: userPayload.email,
      firstName: userPayload.firstname,
      lastName: userPayload.surname,
      enabled: userPayload.enabled !== false,
      emailVerified: true,
      attributes,
    };

    const putRes = await kcAdminFetch(
      `/users/${existing.kcId}`,
      {
        method: "PUT",
        body: JSON.stringify(updateBody),
      },
      token
    );

    if (!putRes.ok) {
      const txt = await putRes.text().catch(() => "");
      throw new Error(`Keycloak user update failed (${putRes.status}): ${txt}`);
    }
  } else {
    // Create new user in Keycloak
    const createBody = {
      username: desiredUsername,
      email: userPayload.email,
      firstName: userPayload.firstname,
      lastName: userPayload.surname,
      enabled: userPayload.enabled !== false,
      emailVerified: true,
      attributes,
      credentials: [
        {
          type: "password",
          value: password && password.trim() ? password.trim() : "password",
          temporary: false,
        },
      ],
    };

    const postRes = await kcAdminFetch(
      "/users",
      {
        method: "POST",
        body: JSON.stringify(createBody),
      },
      token
    );

    if (!postRes.ok) {
      const txt = await postRes.text().catch(() => "");
      throw new Error(`Keycloak user creation failed (${postRes.status}): ${txt}`);
    }

    // Retrieve the newly created user's Keycloak UUID from Location header or lookup
    const loc = postRes.headers.get("location") || "";
    const parts = loc.split("/");
    kcUserId = parts[parts.length - 1] || null;

    if (!kcUserId) {
      const lookupRes = await kcAdminFetch(
        `/users?username=${encodeURIComponent(desiredUsername)}&exact=true`,
        { method: "GET" },
        token
      );
      if (lookupRes.ok) {
        const found = await lookupRes.json();
        kcUserId = found[0]?.id || null;
      }
    }
  }

  if (kcUserId) {
    await syncUserRealmRoles(kcUserId, userPayload.role, token, realmRolesMap);

    // If an explicit password was provided for an existing user, reset it in Keycloak
    if (existing && password && password.trim()) {
      await kcAdminFetch(
        `/users/${kcUserId}/reset-password`,
        {
          method: "PUT",
          body: JSON.stringify({
            type: "password",
            value: password.trim(),
            temporary: false,
          }),
        },
        token
      );
    }
  }

  return {
    kcId: kcUserId,
    username: existing?.username || desiredUsername,
    synced: true,
  };
}

/**
 * Delete a user from Keycloak by matching user_id, username, or email.
 */
async function deleteUserFromKeycloak(userPayload) {
  const { token, users: kcUsers } = await fetchAllKeycloakUsers();
  const matches = kcUsers.filter(
    (k) =>
      (userPayload.user_id &&
        String(k.userId || "").toLowerCase() === String(userPayload.user_id).toLowerCase()) ||
      (userPayload.username &&
        String(k.username || "").toLowerCase() === String(userPayload.username).toLowerCase()) ||
      (userPayload.email &&
        String(k.email || "").toLowerCase() === String(userPayload.email).toLowerCase())
  );

  for (const m of matches) {
    await kcAdminFetch(`/users/${m.kcId}`, { method: "DELETE" }, token);
  }

  return { deletedCount: matches.length };
}

/**
 * Best-effort update of keycloak/realm-export.json so future container imports stay consistent.
 */
function updateRealmExportJson(dbUsers) {
  try {
    const exportPath = path.resolve(__dirname, "../../../keycloak/realm-export.json");
    if (!fs.existsSync(exportPath)) return;
    const raw = fs.readFileSync(exportPath, "utf8");
    const realmData = JSON.parse(raw);
    if (!Array.isArray(realmData.users)) return;

    for (const u of dbUsers) {
      const uname = (
        u.keycloak_username ||
        `${u.firstname || ""}${u.surname || ""}`.replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase() ||
        u.user_id
      ).toLowerCase();

      const realmRoles = [
        ...dbRoleToKeycloakRoles(u.role),
        "default-roles-publications",
      ];

      const existingIdx = realmData.users.findIndex(
        (ku) =>
          ku.attributes?.user_id?.[0]?.toLowerCase() === String(u.user_id).toLowerCase() ||
          String(ku.username || "").toLowerCase() === uname ||
          String(ku.email || "").toLowerCase() === String(u.email || "").toLowerCase()
      );

      if (existingIdx !== -1) {
        realmData.users[existingIdx].firstName = u.firstname;
        realmData.users[existingIdx].lastName = u.surname;
        realmData.users[existingIdx].email = u.email;
        realmData.users[existingIdx].enabled = u.enabled !== false;
        realmData.users[existingIdx].attributes = {
          ...(realmData.users[existingIdx].attributes || {}),
          user_id: [u.user_id],
        };
        realmData.users[existingIdx].realmRoles = realmRoles;
      } else {
        realmData.users.push({
          username: uname,
          email: u.email,
          firstName: u.firstname,
          lastName: u.surname,
          enabled: u.enabled !== false,
          emailVerified: true,
          attributes: { user_id: [u.user_id] },
          credentials: [{ type: "password", value: "password", temporary: false }],
          realmRoles,
        });
      }
    }

    fs.writeFileSync(exportPath, JSON.stringify(realmData, null, 2), "utf8");
  } catch (err) {
    console.warn("[KeycloakSync] Could not update realm-export.json:", err.message);
  }
}

module.exports = {
  getAdminToken,
  fetchAllKeycloakUsers,
  matchKeycloakUser,
  upsertUserInKeycloak,
  deleteUserFromKeycloak,
  dbRoleToKeycloakRoles,
  keycloakRolesToDbRole,
  updateRealmExportJson,
};

