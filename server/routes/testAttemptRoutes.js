const express = require('express');
const { startTest, submitTest, getAttemptResult } = require('../controllers/testAttemptController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/test/start/:test_id', authenticateToken, authorizeRoles('student'), startTest);
router.post('/test/submit/:attempt_id', authenticateToken, authorizeRoles('student'), submitTest);
router.get('/test/result/:attempt_id', authenticateToken, authorizeRoles('student'), getAttemptResult);

module.exports = router;
