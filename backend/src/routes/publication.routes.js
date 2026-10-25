// publication.routes.js

const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload.middleware");
const publicationsController = require("../controllers/publication.controller");

router.get("/", publicationsController.getAllPublcations);

// Get review list
// publications that have to be reviewed
router.get("/review", publicationsController.getReviewList);

// get the publication file
router.get("/review/:id/file", publicationsController.getPubFile);

// get all registered comments for a particular publication
router.get("/review/:id/comments", publicationsController.getAllReviewComments);

// upload, create, register a review comment for a particular publication
router.post("/review/:id/comments", publicationsController.createReviewComment);

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

router.post("/", uploadDocumentOrFile, publicationsController.createPublication);

// affect pub status: approve|reject
router.patch("/:id/status", publicationsController.updatePubStatus);

module.exports = router;