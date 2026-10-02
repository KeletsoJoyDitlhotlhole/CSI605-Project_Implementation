const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload.middleware");
const publicationsController = require("../controllers/publication.controller");

router.get("/", publicationsController.getAllPublcations);

// Get review list
// publications that have to be reviewed
router.get("/review", publicationsController.getReviewList);

// Upload only one file found in the form field document
router.post("/", upload.single("document"), publicationsController.createPublication);

module.exports = router;