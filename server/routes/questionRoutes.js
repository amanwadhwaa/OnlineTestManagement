const express = require('express');
const { addQuestionWithOptions, getQuestionsByBank } = require('../controllers/questionController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/question', authenticateToken, authorizeRoles('instructor', 'admin', 'teaching_asst'), addQuestionWithOptions);
router.get('/questions/by-bank/:bank_id', authenticateToken, getQuestionsByBank);

// Backward-compatible aliases
router.post('/questions', authenticateToken, authorizeRoles('instructor', 'admin', 'teaching_asst'), addQuestionWithOptions);
router.get('/question/by-bank/:bank_id', authenticateToken, getQuestionsByBank);

module.exports = router;
