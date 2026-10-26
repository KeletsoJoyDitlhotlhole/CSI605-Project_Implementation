// publication.routes.js

const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload.middleware");
const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const publicationsController = require("../controllers/publication.controller");

// ─── All routes below require a valid Keycloak JWT ─────────────────
router.use(authenticate);

// Get all publications (any authenticated user)
router.get("/", authorize("student", "reviewer", "admin"), publicationsController.getAllPublcations);

// Get review list
// publications that have to be reviewed
router.get("/review", authorize("reviewer", "admin"), publicationsController.getReviewList);

// get the publication file
router.get("/review/:id/file", authorize("reviewer", "admin"), publicationsController.getPubFile);

// get all registered comments for a particular publication
router.get("/review/:id/comments", authorize("reviewer", "admin"), publicationsController.getAllReviewComments);

// upload, create, register a review comment for a particular publication
router.post("/review/:id/comments", authorize("reviewer", "admin"), publicationsController.createReviewComment);

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

// Submit a publication (students and admins)
router.post("/", authorize("student", "admin"), uploadDocumentOrFile, publicationsController.createPublication);

// affect pub status: approve|reject (reviewers and admins)
router.patch("/:id/status", authorize("reviewer", "admin"), publicationsController.updatePubStatus);

module.exports = router;