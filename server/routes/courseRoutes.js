const express = require('express');
const { createCourse, getAllCourses } = require('../controllers/courseController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/course', authenticateToken, authorizeRoles('instructor', 'admin'), createCourse);
router.get('/course', getAllCourses);

// Backward-compatible aliases
router.post('/courses', authenticateToken, authorizeRoles('instructor', 'admin'), createCourse);
router.get('/courses', getAllCourses);

module.exports = router;
