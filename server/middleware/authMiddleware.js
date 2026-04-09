const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
	try {
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({
				success: false,
				message: 'Access token is missing or malformed.',
			});
		}

		const token = authHeader.split(' ')[1];

		if (!process.env.JWT_SECRET) {
			return res.status(500).json({
				success: false,
				message: 'JWT_SECRET is not configured.',
			});
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = {
			user_id: decoded.user_id,
			role: decoded.role,
		};

		return next();
	} catch (error) {
		if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
			return res.status(403).json({
				success: false,
				message: 'Forbidden: invalid or expired token.',
			});
		}

		return res.status(403).json({
			success: false,
			message: 'Forbidden: token verification failed.',
			error: error.message,
		});
	}
}

function authorizeRoles(...roles) {
	return (req, res, next) => {
		if (!req.user) {
			return res.status(401).json({
				success: false,
				message: 'Unauthorized. User context missing.',
			});
		}

		if (!roles.includes(req.user.role)) {
			return res.status(403).json({
				success: false,
				message: 'Forbidden. You do not have permission to access this resource.',
			});
		}

		return next();
	};
}

module.exports = {
	authenticateToken,
	authorizeRoles,
};
