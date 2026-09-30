const express = require('express');

const upload = require('../middleware/upload.middleware');
const {
  submitPublication
} = require('../controllers/publication.controller');

const router = express.Router();

router.post(
  '/',
  upload.single('publicationFile'),
  submitPublication
);

module.exports = router;