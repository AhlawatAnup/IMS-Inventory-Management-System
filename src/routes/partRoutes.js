const express = require('express');
const {
  uploadBulkParts,
  fetchPartsPage,
  fetchById,
  updateById,
  deleteById,
} = require('../controllers/partControllers.js');
const { noCache, session_checker } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/bulkUpload', noCache, session_checker, uploadBulkParts);
router.get('/fetchPage', session_checker, fetchPartsPage);
router.get('/fetchById/:id', session_checker, fetchById);
router.put('/updateById/:id', session_checker, updateById);
router.delete('/deleteById/:id', session_checker, deleteById);

module.exports = router;
