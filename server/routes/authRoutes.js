const express = require('express');
const {
	registerUser,
	loginUser,
	getAllUsers,
	deleteUser,
	promoteUserToInstructor,
} = require('../controllers/authController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', (req, res) => {
	console.log('REGISTER ROUTE HIT');
	return registerUser(req, res);
});

router.post('/login', (req, res) => {
	console.log('LOGIN ROUTE HIT');
	return loginUser(req, res);
});

router.get('/users', authenticateToken, authorizeRoles('admin'), getAllUsers);
router.delete('/users/:user_id', authenticateToken, authorizeRoles('admin'), deleteUser);
router.patch('/users/:user_id/promote', authenticateToken, authorizeRoles('admin'), promoteUserToInstructor);

module.exports = router;
