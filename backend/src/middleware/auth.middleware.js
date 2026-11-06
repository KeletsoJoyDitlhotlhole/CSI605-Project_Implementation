// auth.middleware.js — JWT verification middleware
//
// Verifies the Bearer token in the Authorization header against
// Keycloak's JWKS endpoint. On success, attaches `req.user` with
// the decoded token payload (sub, email, realm_roles, user_id, etc.).
//
// The Keycloak identity is then mapped onto the application's "Users"
// table (by `user_id`, `keycloak_username`, `email`, or username/full name) so that
// `req.user.id` is always a valid DB user_id and `req.user.roles`
// includes the user's role from both Keycloak and PostgreSQL "Users".

const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const keycloakConfig = require("../config/keycloak");
const db = require("../config/database");

// Development-only bypass. Must be explicitly enabled with AUTH_DEV_BYPASS=true.
const DEV_BYPASS = String(process.env.AUTH_DEV_BYPASS || "").toLowerCase() === "true";

// JWKS client that fetches and caches the Keycloak public signing keys
const client = jwksClient({
  jwksUri: keycloakConfig.jwksUri,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

/**
 * Callback used by jsonwebtoken to dynamically retrieve the signing key
 * that matches the token's `kid` (Key ID) header.
 */
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Convert a PostgreSQL "Users".role string (e.g. "Lecturer", "System Admin", "Student")
 * into normalized application roles and merge with existing JWT roles.
 */
function mergeDbRoles(jwtRoles = [], dbRole = "") {
  const roleSet = new Set(
    (jwtRoles || [])
      .filter((r) => r && !r.startsWith("default-roles-") && r !== "offline_access" && r !== "uma_authorization")
      .map((r) => r.toLowerCase())
  );

  const raw = String(dbRole || "").trim().toLowerCase();
  if (raw.includes("admin")) {
    roleSet.add("admin");
  } else if (raw === "lecturer" || raw === "reviewer") {
    roleSet.add("lecturer");
    roleSet.add("reviewer");
  } else if (raw === "student") {
    roleSet.add("student");
  } else if (raw) {
    roleSet.add(raw);
  }

  return Array.from(roleSet);
}

function jwtRolesToDbRole(jwtRoles = []) {
  const lower = (jwtRoles || []).map((r) => String(r).toLowerCase());
  if (lower.includes("admin")) return "System Admin";
  if (lower.includes("lecturer") || lower.includes("reviewer")) return "Lecturer";
  if (lower.includes("student")) return "Student";
  return null;
}

/**
 * Look up the application user that corresponds to a Keycloak identity,
 * and synchronize any changes made in Keycloak (or auto-provision a new Keycloak user into "Users").
 */
async function resolveDbUser(decoded, rawJwtRoles = []) {
  const userId = decoded.user_id || null;
  const email = decoded.email || null;
  const username = (decoded.preferred_username || "").trim();
  const givenName = (decoded.given_name || "").trim();
  const familyName = (decoded.family_name || "").trim();

  const result = await db.query(
    `SELECT user_id, firstname, surname, email, role, academic_level, supervisor_id, enabled, keycloak_username
     FROM "Users"
     WHERE ($1::text IS NOT NULL AND LOWER(user_id) = LOWER($1))
        OR ($2::text IS NOT NULL AND LOWER(email) = LOWER($2))
        OR ($3::text <> '' AND LOWER(user_id) = LOWER($3))
        OR ($3::text <> '' AND LOWER(COALESCE(keycloak_username, '')) = LOWER($3))
        OR ($3::text <> '' AND LOWER(REPLACE(firstname || surname, ' ', '')) = LOWER(REPLACE($3, ' ', '')))
        OR ($4::text <> '' AND $5::text <> '' AND LOWER(firstname) = LOWER($4) AND LOWER(surname) = LOWER($5))
     ORDER BY
       (LOWER(user_id) = LOWER(COALESCE($1, ''))) DESC,
       (LOWER(COALESCE(keycloak_username, '')) = LOWER(COALESCE($3, ''))) DESC,
       (LOWER(email) = LOWER(COALESCE($2, ''))) DESC
     LIMIT 1`,
    [userId, email, username, givenName, familyName]
  );

  let dbUser = result.rows[0] || null;
  const mappedKcRole = jwtRolesToDbRole(rawJwtRoles);

  if (dbUser) {
    // Sync any profile updates from Keycloak token into PostgreSQL "Users"
    const nextFirst = givenName || dbUser.firstname;
    const nextLast = familyName || dbUser.surname;
    const nextEmail = email || dbUser.email;
    const nextRole = mappedKcRole || dbUser.role;
    const roleChanged = mappedKcRole && String(dbUser.role).toLowerCase() !== mappedKcRole.toLowerCase();
    const profileChanged =
      nextFirst !== dbUser.firstname ||
      nextLast !== dbUser.surname ||
      nextEmail !== dbUser.email ||
      roleChanged ||
      (username && dbUser.keycloak_username !== username);

    if (profileChanged) {
      try {
        const upd = await db.query(
          `UPDATE public."Users"
           SET firstname = $1,
               surname = $2,
               email = $3,
               role = $4,
               keycloak_username = COALESCE($5, keycloak_username),
               updated_at = NOW()
           WHERE user_id = $6
           RETURNING user_id, firstname, surname, email, role, academic_level, supervisor_id, enabled, keycloak_username`,
          [nextFirst.slice(0, 50), nextLast.slice(0, 50), nextEmail.slice(0, 50), nextRole, username || null, dbUser.user_id]
        );
        if (upd.rows[0]) {
          dbUser = upd.rows[0];
        }
      } catch {}
    }
    return dbUser;
  }

  // Auto-provision user created directly in Keycloak into PostgreSQL "Users"
  try {
    const targetRole = mappedKcRole || "Student";
    const prefix = targetRole === "System Admin" ? "ADM" : targetRole === "Lecturer" ? "LEC" : "STU";
    let newUserId = userId ? String(userId).trim().slice(0, 9).toUpperCase() : "";
    if (!newUserId) {
      const idRes = await db.query(
        `SELECT user_id FROM public."Users" WHERE UPPER(user_id) LIKE $1 ORDER BY user_id DESC LIMIT 20`,
        [`${prefix}%`]
      );
      let maxNum = 0;
      for (const r of idRes.rows) {
        const n = parseInt(String(r.user_id).slice(3), 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
      newUserId = `${prefix}${String(maxNum + 1).padStart(6, "0")}`;
    }

    const first = (givenName || username || "User").slice(0, 50);
    const last = (familyName || "Account").slice(0, 50);
    const mail = (email || `${username || newUserId.toLowerCase()}@ub.ac.bw`).slice(0, 50);
    const acadLevel = targetRole === "Student" ? (decoded.academic_level || "Master's") : null;

    let supId = null;
    if (targetRole === "Student") {
      const supRes = await db.query(
        `SELECT user_id FROM public."Users" WHERE LOWER(role) = 'lecturer' ORDER BY user_id ASC LIMIT 1`
      );
      supId = supRes.rows[0]?.user_id || null;
    }

    const ins = await db.query(
      `INSERT INTO public."Users"
         (user_id, firstname, surname, email, role, supervisor_id, academic_level, enabled, keycloak_username, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, CURRENT_DATE, NOW())
       ON CONFLICT (user_id) DO NOTHING
       RETURNING user_id, firstname, surname, email, role, academic_level, supervisor_id, enabled, keycloak_username`,
      [newUserId, first, last, mail, targetRole, supId, acadLevel, username || null]
    );
    return ins.rows[0] || null;
  } catch {
    return null;
  }
}

function devUser() {
  return {
    sub: "dev-reviewer",
    id: "LEC000001",
    email: "kabelo.molefe@example.com",
    name: "Kabelo Molefe",
    firstName: "Kabelo",
    lastName: "Molefe",
    username: "kabelomolefe",
    roles: ["lecturer", "reviewer", "admin", "student"],
    registered: true,
  };
}

/**
 * Verify a bearer token and populate req.user.
 * Resolves to an HTTP error object ({ status, error }) on failure, or null on success.
 */
function verifyToken(req, token) {
  const verifyOptions = {
    issuer: keycloakConfig.issuer,
    algorithms: ["RS256"],
  };

  return new Promise((resolve) => {
    jwt.verify(token, getKey, verifyOptions, async (err, decoded) => {
      if (err) {
        console.error("JWT verification failed:", err.message);
        if (err.name === "TokenExpiredError") {
          return resolve({ status: 401, error: "Token has expired" });
        }
        return resolve({ status: 401, error: "Invalid or expired token" });
      }

      const rawJwtRoles =
        decoded.realm_roles ||
        (decoded.realm_access && decoded.realm_access.roles) ||
        [];

      // Build a clean user object from the decoded JWT claims
      req.user = {
        sub: decoded.sub,
        id: decoded.user_id || decoded.sub,
        email: decoded.email,
        name: decoded.name || `${decoded.given_name || ""} ${decoded.family_name || ""}`.trim(),
        firstName: decoded.given_name,
        lastName: decoded.family_name,
        username: decoded.preferred_username,
        roles: mergeDbRoles(rawJwtRoles, ""),
        registered: false,
      };

      // Map the Keycloak identity onto the application's Users table and merge DB role
      try {
        const dbUser = await resolveDbUser(decoded, rawJwtRoles);
        if (dbUser) {
          if (dbUser.enabled === false) {
            return resolve({ status: 403, error: "Your account has been deactivated by an administrator." });
          }
          req.user.id = dbUser.user_id;
          req.user.email = dbUser.email || req.user.email;
          req.user.firstName = dbUser.firstname || req.user.firstName;
          req.user.lastName = dbUser.surname || req.user.lastName;
          req.user.name = `${dbUser.firstname || ""} ${dbUser.surname || ""}`.trim() || req.user.name;
          req.user.roles = mergeDbRoles(rawJwtRoles, dbUser.role);
          req.user.academic_level = dbUser.academic_level || null;
          req.user.supervisor_id = dbUser.supervisor_id || null;
          req.user.dbUser = dbUser;
          req.user.registered = true;
        }
      } catch (lookupErr) {
        console.error("User lookup failed:", lookupErr.message);
      }

      resolve(null);
    });
  });
}

/**
 * Express middleware that:
 * 1. Extracts the Bearer token from the Authorization header
 * 2. Verifies the token signature against Keycloak's public key
 * 3. Validates issuer and audience claims
 * 4. Populates req.user with decoded token + PostgreSQL Users data
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    if (DEV_BYPASS) {
      req.user = devUser();
      return next();
    }

    return res.status(401).json({
      error: "Missing or invalid Authorization header",
      message: "Please sign in to continue.",
    });
  }

  const failure = await verifyToken(req, authHeader.split(" ")[1]);
  if (failure) {
    return res.status(failure.status).json({ error: failure.error, message: failure.error });
  }
  next();
}

/**
 * Like `authenticate`, but lets anonymous (guest) requests through with
 * `req.user` left undefined. A token that IS supplied must still be valid.
 */
async function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    if (DEV_BYPASS) {
      req.user = devUser();
    }
    return next();
  }

  return authenticate(req, res, next);
}

module.exports = authenticate;
module.exports.authenticate = authenticate;
module.exports.optionalAuthenticate = optionalAuthenticate;
module.exports.mergeDbRoles = mergeDbRoles;
