const express = require('express');
const router = express.Router();

const { sendUserDetails } = require('../controllers/userControllers');
const { session_checker } = require('../middleware/authMiddleware');

router.get('/getDetails', session_checker, sendUserDetails);

module.exports = router;
