// auth.middleware.js — JWT verification middleware
//
// Verifies the Bearer token in the Authorization header against
// Keycloak's JWKS endpoint. On success, attaches `req.user` with
// the decoded token payload (sub, email, realm_roles, user_id, etc.).

const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const keycloakConfig = require("../config/keycloak");

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
 * Express middleware that:
 * 1. Extracts the Bearer token from the Authorization header
 * 2. Verifies the token signature against Keycloak's public key
 * 3. Validates issuer and audience claims
 * 4. Populates req.user with decoded token data
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Missing or invalid Authorization header",
    });
  }

  const token = authHeader.split(" ")[1];

  const verifyOptions = {
    issuer: keycloakConfig.issuer,
    algorithms: ["RS256"],
  };

  jwt.verify(token, getKey, verifyOptions, (err, decoded) => {
    if (err) {
      console.error("JWT verification failed:", err.message);

      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token has expired" });
      }

      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Build a clean user object from the decoded JWT claims
    req.user = {
      // Keycloak subject (unique user identifier in Keycloak)
      sub: decoded.sub,

      // Custom user_id attribute mapped from Keycloak (e.g. "U0000001")
      id: decoded.user_id || decoded.sub,

      // User profile
      email: decoded.email,
      name: decoded.name || `${decoded.given_name || ""} ${decoded.family_name || ""}`.trim(),
      firstName: decoded.given_name,
      lastName: decoded.family_name,
      username: decoded.preferred_username,

      // Realm roles — extracted from the custom `realm_roles` claim
      // (set up via the protocol mapper in realm-export.json)
      // Falls back to the standard Keycloak claim path
      roles:
        decoded.realm_roles ||
        (decoded.realm_access && decoded.realm_access.roles) ||
        [],
    };

    next();
  });
}

module.exports = authenticate;
