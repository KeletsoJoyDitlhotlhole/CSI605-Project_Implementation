// publication.routes.js

const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload.middleware");
const publicationsController = require("../controllers/publication.controller");

/**
 * Get all publications
 */
router.get("/", publicationsController.getAllPublcations);

/**
 * Search publication.
 * 
 * Token searched in abstract, title, keywords. 
 */
router.get("/search", publicationsController.searchPublication);

// Get review list
// publications that have to be reviewed
/**
 * Review publications
 * 
 * Get publications that have a status != approved.
 */
router.get("/review", publicationsController.getReviewList);

/**
 * Get a publication physical file.
 * 
 * Retrieve file stored as PDF in ./uploads.
 */
router.get("/review/:id/file", publicationsController.getPubFile);

/**
 * Get comments.
 * 
 * Used by the reviewer to provide feedback to author.
 */
router.get("/review/:id/comments", publicationsController.getAllReviewComments);

// upload, create, register a review comment for a particular publication
/**
 * Add comment
 * 
 * Used by review to add comment for a publication when reviewing.
 */
router.post("/review/:id/comments", publicationsController.createReviewComment);


/**
 * Get a publication
 * 
 * Get a single publication using in ID.
 */
router.get("/publication/:id", publicationsController.getApprovedPublication);

/**
 * Upload publication
 * 
 */
router.post("/", upload.single("document"), publicationsController.createPublication);


/**
 * Change publication status
 * 
 * Use to change review status of the publication. 
 */
router.patch("/:id/status", publicationsController.updatePubStatus);



module.exports = router;