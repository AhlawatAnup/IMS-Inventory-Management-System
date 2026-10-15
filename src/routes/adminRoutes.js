const express = require('express');
const {
  resetPassword,
  fetchAllUsers,
  fetchUserById,
  updateUser,
  getResetPassPage,
  deleteUserById,
} = require('../controllers/adminControllers.js');
const { noCache, preventAuth, session_checker } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/resetPassword', session_checker, resetPassword);
router.get('/AllUsers', session_checker, fetchAllUsers);
router.get('/fetchUser/:userId', session_checker, fetchUserById);
router.put('/updateUser/:userId', session_checker, updateUser);
router.get('/resetPass', noCache, getResetPassPage);
router.delete('/deleteById/:userId', session_checker, deleteUserById);

module.exports = router;
