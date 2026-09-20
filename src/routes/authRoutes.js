const express = require('express');
const { login, userSignup } = require('../controllers/authControllers');
const { noCache, preventAuth, session_checker } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/login', noCache, preventAuth, login);
router.post('/userSignup', noCache, session_checker, userSignup);
router.get('/logout', session_checker, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

module.exports = router;
