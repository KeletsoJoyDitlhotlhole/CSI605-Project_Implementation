// publication.routes.js

const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload.middleware");
const { authenticate, optionalAuthenticate } = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const publicationsController = require("../controllers/publication.controller");

const ALL_ROLES = ["student", "lecturer", "reviewer", "admin"];
const REVIEW_ROLES = ["lecturer", "reviewer", "admin"];

// ─── Public (guest) browsing — guests only see Approved publications ──
// A supplied token is still verified; signed-in users see everything.

// Get all publications
router.get("/", optionalAuthenticate, publicationsController.getAllPublcations);

// ─── Routes below require a valid Keycloak JWT ─────────────────────

// Get review list
// publications that have to be reviewed (lecturers, reviewers, and admins)
router.get("/review", authenticate, authorize(...REVIEW_ROLES), publicationsController.getReviewList);

// Get current user's own submitted publications (for student review notifications)
router.get("/my-submissions", authenticate, authorize(...ALL_ROLES), publicationsController.getMySubmissions);

// get the publication file
router.get("/review/:id/file", authenticate, authorize(...REVIEW_ROLES), publicationsController.getPubFile);

// get all registered comments for a particular publication
router.get("/review/:id/comments", authenticate, authorize(...REVIEW_ROLES), publicationsController.getAllReviewComments);

// upload, create, register a review comment for a particular publication
router.post("/review/:id/comments", authenticate, authorize(...REVIEW_ROLES), publicationsController.createReviewComment);

// Upload only one file found in form field document or publicationFile
const uploadDocumentOrFile = (req, res, next) => {
  upload.fields([{ name: 'document', maxCount: 1 }, { name: 'publicationFile', maxCount: 1 }])(req, res, (err) => {
    if (err) return next(err);
    if (req.files) {
      if (req.files.document && req.files.document[0]) {
        req.file = req.files.document[0];
      } else if (req.files.publicationFile && req.files.publicationFile[0]) {
        req.file = req.files.publicationFile[0];
      }
    }
    next();
  });
};

// Submit a publication (students, lecturers, reviewers, and admins)
router.post("/", authenticate, authorize(...ALL_ROLES), uploadDocumentOrFile, publicationsController.createPublication);

// affect pub status: approve|reject (lecturers, reviewers, and admins)
router.patch("/:id/status", authenticate, authorize(...REVIEW_ROLES), publicationsController.updatePubStatus);

// Get publication file (guests: Approved only)
router.get("/:id/file", optionalAuthenticate, publicationsController.getPubFile);

// Get single publication by ID (guests: Approved only)
router.get("/:id", optionalAuthenticate, publicationsController.getPublicationById);

module.exports = router;
