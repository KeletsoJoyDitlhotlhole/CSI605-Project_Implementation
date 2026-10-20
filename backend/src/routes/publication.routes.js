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

// Upload only one file found in the form field document
router.post("/", upload.single("document"), publicationsController.createPublication);

// affect pub status: approve|reject
router.patch("/:id/status", publicationsController.updatePubStatus);



module.exports = router;