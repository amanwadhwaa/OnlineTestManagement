const express = require('express');
const { getLeaderboard, getStudentPerformance, getTestStats, getGlobalLeaderboard } = require('../controllers/analyticsController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/analytics/leaderboard/:test_id', authenticateToken, authorizeRoles('instructor', 'admin', 'teaching_asst'), getLeaderboard);
router.get('/analytics/leaderboard-global', authenticateToken, authorizeRoles('instructor', 'admin', 'teaching_asst'), getGlobalLeaderboard);
router.get('/analytics/student/:student_id', authenticateToken, authorizeRoles('student', 'instructor', 'admin', 'teaching_asst'), getStudentPerformance);
router.get('/analytics/test/:test_id', authenticateToken, authorizeRoles('instructor', 'admin', 'teaching_asst'), getTestStats);

module.exports = router;
