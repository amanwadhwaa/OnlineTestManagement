const express = require('express');
const { createReport, getAllReports, updateReportStatus } = require('../controllers/reportController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/report', authenticateToken, createReport);
router.get('/report', authenticateToken, authorizeRoles('admin'), getAllReports);
router.put('/report/:id', authenticateToken, authorizeRoles('admin'), updateReportStatus);

module.exports = router;
