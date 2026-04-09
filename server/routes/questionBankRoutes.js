const express = require('express');
const { createQuestionBank, getQuestionBanksByCourse } = require('../controllers/questionBankController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/question-bank', authenticateToken, authorizeRoles('instructor', 'admin'), createQuestionBank);
router.get('/question-bank/:course_id', getQuestionBanksByCourse);

// Backward-compatible aliases
router.post('/question-banks', authenticateToken, authorizeRoles('instructor', 'admin'), createQuestionBank);
router.get('/question-banks/:course_id', getQuestionBanksByCourse);

module.exports = router;
