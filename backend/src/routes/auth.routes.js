
const express = require('express');
const { login } = require('../controllers/auth.controller');
const authRoutes = require('./routes/auth.routes');

const router = express.Router();

router.post('/login', login);

module.exports = router;
