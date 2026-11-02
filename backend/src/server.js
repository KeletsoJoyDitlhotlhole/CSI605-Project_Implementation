// Import required modules
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./config/database");
const keycloakConfig = require("./config/keycloak");

// Initialize the app
const app = express();
const port = process.env.PORT || 3000;

// import routes
const publicationsRoutes = require("./routes/publication.routes");

// import auth middleware
const authenticate = require("./middleware/auth.middleware");

// Add middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (public — no auth required)
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      message: "Backend and PostgreSQL are connected",
      databaseTime: result.rows[0].now,
      keycloak: {
        url: keycloakConfig.serverUrl,
        realm: keycloakConfig.realm,
      },
    });
  } catch (error) {
    console.error("--------------------------------");
    console.error("POSTGRESQL CONNECTION ERROR");
    console.error(error);
    console.error("--------------------------------");

    res.status(500).json({
      success: false,
      message: "Database connection failed"
    });
  }
});

// Token introspection endpoint — returns the authenticated user's profile from Keycloak and DB
app.get("/api/me", authenticate, async (req, res) => {
  try {
    const userQuery = await pool.query(
      `SELECT user_id, firstname, surname, email, role, academic_level, supervisor_id 
       FROM "Users" 
       WHERE user_id = $1 OR LOWER(email) = LOWER($2) 
       LIMIT 1`,
      [req.user.id, req.user.email || '']
    );

    const dbUser = userQuery.rows[0];

    res.json({
      id: dbUser?.user_id || req.user.id,
      sub: req.user.sub,
      username: req.user.username,
      email: dbUser?.email || req.user.email,
      name: req.user.name || (dbUser ? `${dbUser.firstname} ${dbUser.surname}` : ''),
      firstName: dbUser?.firstname || req.user.firstName,
      lastName: dbUser?.surname || req.user.lastName,
      roles: req.user.roles,
      academic_level: dbUser?.academic_level || req.user.academic_level || null,
      supervisor_id: dbUser?.supervisor_id || null,
    });
  } catch (err) {
    console.error("Error in /api/me:", err);
    res.json({
      id: req.user.id,
      sub: req.user.sub,
      username: req.user.username,
      email: req.user.email,
      name: req.user.name,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      roles: req.user.roles,
      academic_level: null,
    });
  }
});

// Mount routes/endpoints (supporting both root and /api/publications paths)
app.use(publicationsRoutes);
app.use("/api/publications", publicationsRoutes);

// Multer and general error handling middleware
app.use((err, req, res, next) => {
  res.status(err.status || 400).json({ error: err.message });
});

// Start server
const server = app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});

server.on("error", (error) => {
  console.error("SERVER ERROR:", error);
});

process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("UNHANDLED REJECTION:", error);
});