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
const { authenticate, optionalAuthenticate, mergeDbRoles } = require("./middleware/auth.middleware");

// Add middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure the Users table has the academic_level column and student seed values
async function ensureAcademicLevelSchema() {
  try {
    await pool.query(`
      ALTER TABLE public."Users"
      ADD COLUMN IF NOT EXISTS academic_level VARCHAR(50);
    `);
    await pool.query(`
      UPDATE public."Users"
      SET academic_level = 'Master''s'
      WHERE user_id IN ('STU000001', '02002023') AND academic_level IS NULL;
    `);
    await pool.query(`
      UPDATE public."Users"
      SET academic_level = 'PhD'
      WHERE user_id IN ('STU000002') AND academic_level IS NULL;
    `);
    await pool.query(`
      UPDATE public."Users"
      SET academic_level = 'Master''s'
      WHERE LOWER(role) = 'student' AND academic_level IS NULL;
    `);
  } catch (err) {
    console.error("Schema check warning (Users.academic_level):", err.message);
  }
}
ensureAcademicLevelSchema();

// Ensure the "Review Comments" table exists (created on first backend start if missing)
async function ensureReviewCommentsTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public."Review Comments" (
        id            SERIAL PRIMARY KEY,
        publication_id VARCHAR(50)   NOT NULL
                        REFERENCES public."Publications"(publication_id) ON DELETE CASCADE,
        reviewer_id   VARCHAR(50),
        title         VARCHAR(150)  NOT NULL,
        details       TEXT          NOT NULL,
        created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_comments_publication_id
        ON public."Review Comments"(publication_id);
    `);
    console.log('Schema check OK: "Review Comments" table is ready.');
  } catch (err) {
    console.error('Schema check warning ("Review Comments"):', err.message);
  }
}
ensureReviewCommentsTable();

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
    let dbUser = req.user.dbUser;
    if (!dbUser) {
      const userQuery = await pool.query(
        `SELECT user_id, firstname, surname, email, role, academic_level, supervisor_id 
         FROM "Users" 
         WHERE LOWER(user_id) = LOWER($1)
            OR LOWER(email) = LOWER($2)
            OR ($3::text <> '' AND LOWER(REPLACE(firstname || surname, ' ', '')) = LOWER(REPLACE($3, ' ', '')))
         LIMIT 1`,
        [req.user.id || '', req.user.email || '', req.user.username || '']
      );
      dbUser = userQuery.rows[0];
    }

    const mergedRoles = mergeDbRoles(req.user.roles, dbUser?.role);

    res.json({
      id: dbUser?.user_id || req.user.id,
      registered: !!dbUser,
      sub: req.user.sub,
      username: req.user.username,
      email: dbUser?.email || req.user.email,
      name: (dbUser ? `${dbUser.firstname} ${dbUser.surname}`.trim() : '') || req.user.name,
      firstName: dbUser?.firstname || req.user.firstName,
      lastName: dbUser?.surname || req.user.lastName,
      roles: mergedRoles,
      academic_level: dbUser?.academic_level || null,
      supervisor_id: dbUser?.supervisor_id || null,
    });
  } catch (err) {
    console.error("Error in /api/me:", err);
    res.json({
      id: req.user.id,
      registered: false,
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

// Lookup a user's academic_level from the Users table by user_id or email
app.get("/api/users/:id", optionalAuthenticate, async (req, res) => {
  try {
    const identifier = (req.params.id || '').trim();
    if (!identifier) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const result = await pool.query(
      `SELECT user_id, firstname, surname, email, role, academic_level, supervisor_id
       FROM "Users"
       WHERE LOWER(user_id) = LOWER($1) OR LOWER(email) = LOWER($1)
       LIMIT 1`,
      [identifier]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const u = result.rows[0];
    return res.json({
      id: u.user_id,
      firstName: u.firstname,
      lastName: u.surname,
      name: `${u.firstname || ''} ${u.surname || ''}`.trim(),
      email: u.email,
      role: u.role,
      academic_level: u.academic_level || null,
      supervisor_id: u.supervisor_id || null,
    });
  } catch (err) {
    console.error("Error in /api/users/:id:", err.message);
    return res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Mount routes/endpoints (supporting both root and /api/publications paths)
app.use("/api/publications", publicationsRoutes);
app.use(publicationsRoutes);

// Multer and general error handling middleware
app.use((err, req, res, next) => {
  const isClientError =
    err.name === "MulterError" ||
    err.type === "entity.parse.failed" ||
    err.message === "Only PDF files are allowed.";
  const status = err.status || err.statusCode || (isClientError ? 400 : 500);
  let message = err.message || "Unexpected server error";
  if (err.code === "LIMIT_FILE_SIZE") {
    message = "The PDF must not exceed 100 MB.";
  }

  if (status >= 500) {
    console.error("UNHANDLED ROUTE ERROR:", err);
  }
  res.status(status).json({ success: false, error: message, message });
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
