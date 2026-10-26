// role.middleware.js — Role-based access control middleware
//
// Must be used AFTER auth.middleware.js (which populates req.user).
// Checks that the authenticated user has at least one of the
// required roles before allowing the request to proceed.

/**
 * Returns an Express middleware that restricts access to users
 * who hold at least one of the specified roles.
 *
 * @param  {...string} allowedRoles - One or more role names (e.g. "student", "reviewer", "admin")
 * @returns {Function} Express middleware
 *
 * @example
 *   router.get("/review", authorize("reviewer", "admin"), controller.getReviewList);
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    // auth.middleware.js must run first
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required",
      });
    }

    const userRoles = req.user.roles || [];

    // Check if the user has at least one of the allowed roles
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        error: "Insufficient permissions",
        required: allowedRoles,
        your_roles: userRoles.filter(
          (r) => !r.startsWith("default-roles-") && r !== "offline_access" && r !== "uma_authorization"
        ),
      });
    }

    next();
  };
}

module.exports = authorize;
