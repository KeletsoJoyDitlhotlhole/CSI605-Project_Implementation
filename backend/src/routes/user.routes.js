// user.routes.js — System Admin routes for Manage Profiles & Keycloak synchronization

const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const userController = require("../controllers/user.controller");

// All Manage Profiles routes require an authenticated System Admin
router.use(authenticate, authorize("admin"));

// List all users (automatically pulls updates from Keycloak)
router.get("/", userController.getAllUsers);

// Explicit two-way sync between PostgreSQL and Keycloak
router.post("/sync", userController.syncWithKeycloak);

// Create a new user profile in PostgreSQL and Keycloak
router.post("/", userController.createUser);

// Update an existing user profile in PostgreSQL and Keycloak
router.put("/:id", userController.updateUser);

// Toggle active/deactivated status in PostgreSQL and Keycloak
router.patch("/:id/status", userController.toggleUserStatus);

// Delete a user profile from PostgreSQL and Keycloak
router.delete("/:id", userController.deleteUser);

module.exports = router;

