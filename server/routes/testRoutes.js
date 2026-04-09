const express = require('express');
const { createTest, getTestsByCourse, getAvailableTests, getTestDetails, getAllTests, deleteTest } = require('../controllers/testController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/test', authenticateToken, authorizeRoles('instructor', 'admin'), createTest);
router.get('/test/available', authenticateToken, getAvailableTests);
router.get('/test/all', authenticateToken, authorizeRoles('admin'), getAllTests);
router.delete('/test/:test_id', authenticateToken, authorizeRoles('admin'), deleteTest);
router.get('/test/details/:test_id', authenticateToken, authorizeRoles('instructor', 'admin', 'teaching_asst'), getTestDetails);
router.get('/test/:course_id', authenticateToken, authorizeRoles('instructor', 'admin', 'teaching_asst'), getTestsByCourse);

// Backward-compatible aliases
router.post('/tests', authenticateToken, authorizeRoles('instructor', 'admin'), createTest);
router.get('/tests/available', authenticateToken, getAvailableTests);
router.get('/tests/all', authenticateToken, authorizeRoles('admin'), getAllTests);
router.delete('/tests/:test_id', authenticateToken, authorizeRoles('admin'), deleteTest);
router.get('/tests/details/:test_id', authenticateToken, authorizeRoles('instructor', 'admin', 'teaching_asst'), getTestDetails);
router.get('/tests/:course_id', authenticateToken, authorizeRoles('instructor', 'admin', 'teaching_asst'), getTestsByCourse);

module.exports = router;
