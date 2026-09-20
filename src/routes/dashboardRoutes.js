const express = require('express');
const { session_checker, noCache } = require('../middleware/authMiddleware.js');
const { getDashboard } = require('../controllers/dashboardControllers.js');

const router = express.Router();

router.get('/', noCache, session_checker, getDashboard);

module.exports = router;
