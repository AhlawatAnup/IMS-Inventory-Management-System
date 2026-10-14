const express = require('express');
const {
  uploadBulkParts,
  fetchPartsPage,
  fetchById,
  updateById,
  deleteById,
  adjustQuantity,
  checkAvailabilityStatus,
  updateProjectComponents,
} = require('../controllers/partControllers.js');
const { noCache, session_checker } = require('../middleware/authMiddleware.js');

const router = express.Router();

router.post('/bulkUpload', noCache, session_checker, uploadBulkParts);
router.get('/fetchPage', session_checker, fetchPartsPage);
router.get('/fetchById/:id', session_checker, fetchById);
router.put('/updateById/:id', session_checker, updateById);
router.delete('/deleteById/:id', session_checker, deleteById);
router.put('/updateQty/:id', session_checker, adjustQuantity);
router.post('/checkAvailability', session_checker, checkAvailabilityStatus);
router.post('/updateProjectComponents', session_checker, updateProjectComponents);
module.exports = router;
