// Import required modules
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./config/database");

// Initialize the app
const app = express();
const port = process.env.PORT || 3000;

// import routes
const publicationsRoutes = require("./routes/publication.routes");

// Add middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      success: true,
      message: "Backend and PostgreSQL are connected",
      databaseTime: result.rows[0].now
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