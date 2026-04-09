const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function registerUser(req, res) {
	console.log('REGISTER START');
	console.log('REGISTER BODY:', req.body);
	let connection;

	try {
		const { name, email, password, role, reg_no, sem, dept, designation, assigned_instructor, admin_level, privileges } = req.body || {};

		if (!name || !email || !password || !role) {
			console.log('REGISTER after validation: failed');
			console.log('REGISTER before sending response');
			return res.status(400).json({
				success: false,
				message: 'name, email, password, and role are required.',
			});
		}
		console.log('REGISTER after validation: passed');

		const hashedPassword = await bcrypt.hash(password, 10);
		console.log('REGISTER after password hashing');

		connection = await pool.getConnection();
		await connection.beginTransaction();

		const [rows] = await connection.execute(
			'INSERT INTO USERS (name, email, password, role) VALUES (?, ?, ?, ?)',
			[name, email, hashedPassword, role]
		);
		const user_id = rows.insertId;

		if (role === 'student') {
			const studentRegNo = reg_no || `REG${String(user_id).padStart(6, '0')}`;
			const studentDept = dept || 'General';
			await connection.execute('INSERT INTO STUDENT (user_id, reg_no, sem, dept) VALUES (?, ?, ?, ?)', [
				user_id,
				studentRegNo,
				sem || null,
				studentDept,
			]);
		} else if (role === 'instructor') {
			await connection.execute('INSERT INTO INSTRUCTOR (user_id, dept, designation) VALUES (?, ?, ?)', [
				user_id,
				dept || 'General',
				designation || 'Instructor',
			]);
		} else if (role === 'teaching_asst') {
			if (!assigned_instructor) {
				throw new Error('assigned_instructor is required for teaching_asst role.');
			}
			await connection.execute('INSERT INTO TEACHING_ASST (user_id, assigned_instructor) VALUES (?, ?)', [
				user_id,
				assigned_instructor,
			]);
		} else if (role === 'admin') {
			await connection.execute('INSERT INTO ADMIN (user_id, admin_level, privileges) VALUES (?, ?, ?)', [
				user_id,
				admin_level || 1,
				privileges || null,
			]);
		} else {
			throw new Error('Unsupported role for registration profile creation.');
		}

		await connection.commit();
		console.log('REGISTER after DB query:', rows);
		console.log('REGISTER before sending response');

		return res.status(200).json({
			success: true,
			message: 'User registered successfully.',
			user_id,
		});
	} catch (error) {
		if (connection) {
			await connection.rollback();
		}
		if (error && error.code === 'ER_DUP_ENTRY') {
			return res.status(409).json({
				success: false,
				message: 'Registration failed.',
				error: 'Email or unique identifier already exists.',
			});
		}
		console.error(error);
		console.log('REGISTER before sending response');
		return res.status(500).json({
			success: false,
			message: 'Registration failed.',
			error: error.message,
		});
	} finally {
		if (connection) {
			connection.release();
		}
	}

}

async function loginUser(req, res) {
	console.log('LOGIN START');
	console.log('LOGIN BODY:', req.body);

	try {
		const { email, password } = req.body || {};

		if (!email || !password) {
			console.log('LOGIN after validation: failed');
			console.log('LOGIN before sending response');
			return res.status(400).json({
				success: false,
				message: 'email and password are required.',
			});
		}
		console.log('LOGIN after validation: passed');

		const [rows] = await pool.execute(
			'SELECT user_id, password, role FROM USERS WHERE email = ? LIMIT 1',
			[email]
		);
		console.log('LOGIN after DB query:', rows);

		if (rows.length === 0) {
			console.log('LOGIN failure: user not found');
			console.log('LOGIN before sending response');
			return res.status(404).json({
				success: false,
				message: 'User not found.',
			});
		}

		const user = rows[0];
		const isPasswordValid = await bcrypt.compare(password, user.password);
		console.log('LOGIN after password hashing/compare:', { isPasswordValid });

		if (!isPasswordValid) {
			console.log('LOGIN failure: invalid password');
			console.log('LOGIN before sending response');
			return res.status(401).json({
				success: false,
				message: 'Invalid credentials.',
			});
		}

		if (!process.env.JWT_SECRET) {
			console.log('LOGIN failure: JWT_SECRET not configured');
			console.log('LOGIN before sending response');
			return res.status(500).json({
				success: false,
				message: 'JWT_SECRET is not configured.',
			});
		}

		const token = jwt.sign(
			{
				user_id: user.user_id,
				role: user.role,
			},
			process.env.JWT_SECRET,
			{ expiresIn: '1h' }
		);
		console.log('LOGIN success:', { user_id: user.user_id, role: user.role });
		console.log('LOGIN before sending response');

		return res.status(200).json({
			success: true,
			message: 'Login successful.',
			token,
			user_id: user.user_id,
			role: user.role,
		});
	} catch (error) {
		console.error(error);
		console.log('LOGIN before sending response');
		return res.status(500).json({
			success: false,
			message: 'Login failed.',
			error: error.message,
		});
	}

}

async function getAllUsers(req, res) {
	try {
		const [rows] = await pool.execute(
			'SELECT user_id, name, email, role FROM USERS ORDER BY user_id ASC'
		);

		return res.status(200).json({
			success: true,
			data: rows,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: 'Failed to fetch users.',
			error: error.message,
		});
	}
}

async function deleteUser(req, res) {
	let connection;

	try {
		const { user_id } = req.params;
		const requesterId = req.user && req.user.user_id;

		if (!user_id) {
			return res.status(400).json({ success: false, message: 'user_id is required.' });
		}

		if (Number(user_id) === Number(requesterId)) {
			return res.status(400).json({ success: false, message: 'Admin cannot delete own account.' });
		}

		connection = await pool.getConnection();
		await connection.beginTransaction();

		const [existingRows] = await connection.execute('SELECT user_id, role FROM USERS WHERE user_id = ? LIMIT 1', [user_id]);
		if (existingRows.length === 0) {
			await connection.rollback();
			return res.status(404).json({ success: false, message: 'User not found.' });
		}

		const targetUser = existingRows[0];

		if (targetUser.role === 'student') {
			await connection.execute(
				'DELETE sr FROM STUDENT_RESPONSE sr INNER JOIN TEST_ATTEMPT ta ON ta.attempt_id = sr.attempt_id WHERE ta.student_id = ?',
				[user_id]
			);
			await connection.execute('DELETE FROM TEST_ATTEMPT WHERE student_id = ?', [user_id]);
		}

		if (targetUser.role === 'instructor') {
			const [fallbackRows] = await connection.execute(
				"SELECT user_id FROM USERS WHERE role = 'instructor' AND user_id <> ? ORDER BY user_id ASC LIMIT 1",
				[user_id]
			);

			const fallbackInstructorId = fallbackRows.length > 0 ? fallbackRows[0].user_id : null;

			if (!fallbackInstructorId) {
				const [blockingRows] = await connection.execute(
					'SELECT (SELECT COUNT(*) FROM TEST WHERE created_by = ?) AS test_count, (SELECT COUNT(*) FROM QUESTION_BANK WHERE created_by = ?) AS bank_count, (SELECT COUNT(*) FROM TEACHING_ASST WHERE assigned_instructor = ?) AS ta_count',
					[user_id, user_id, user_id]
				);

				const blockers = blockingRows[0] || {};
				if ((Number(blockers.test_count) || 0) > 0 || (Number(blockers.bank_count) || 0) > 0 || (Number(blockers.ta_count) || 0) > 0) {
					await connection.rollback();
					return res.status(400).json({
						success: false,
						message: 'Cannot delete this instructor because they own tests/banks or have assigned TAs, and no fallback instructor exists.',
					});
				}
			} else {
				await connection.execute('UPDATE TEST SET created_by = ? WHERE created_by = ?', [fallbackInstructorId, user_id]);
				await connection.execute('UPDATE QUESTION_BANK SET created_by = ? WHERE created_by = ?', [fallbackInstructorId, user_id]);
				await connection.execute('UPDATE TEACHING_ASST SET assigned_instructor = ? WHERE assigned_instructor = ?', [fallbackInstructorId, user_id]);
			}
		}

		await connection.execute('DELETE FROM USERS WHERE user_id = ?', [user_id]);
		await connection.commit();

		return res.status(200).json({
			success: true,
			message: 'User deleted successfully.',
		});
	} catch (error) {
		if (connection) {
			await connection.rollback();
		}

		return res.status(500).json({
			success: false,
			message: 'Failed to delete user.',
			error: error.message,
		});
	} finally {
		if (connection) {
			connection.release();
		}
	}
}

async function promoteUserToInstructor(req, res) {
	let connection;

	try {
		const { user_id } = req.params;
		const { dept, designation } = req.body || {};

		if (!user_id) {
			return res.status(400).json({ success: false, message: 'user_id is required.' });
		}

		connection = await pool.getConnection();
		await connection.beginTransaction();

		const [userRows] = await connection.execute('SELECT user_id, role FROM USERS WHERE user_id = ? LIMIT 1', [user_id]);
		if (userRows.length === 0) {
			await connection.rollback();
			return res.status(404).json({ success: false, message: 'User not found.' });
		}

		const user = userRows[0];
		if (user.role !== 'teaching_asst') {
			await connection.rollback();
			return res.status(400).json({ success: false, message: 'Only teaching assistant can be promoted to instructor.' });
		}

		await connection.execute('UPDATE USERS SET role = ? WHERE user_id = ?', ['instructor', user_id]);
		await connection.execute('DELETE FROM TEACHING_ASST WHERE user_id = ?', [user_id]);

		const [instructorRows] = await connection.execute('SELECT user_id FROM INSTRUCTOR WHERE user_id = ? LIMIT 1', [user_id]);
		if (instructorRows.length === 0) {
			await connection.execute(
				'INSERT INTO INSTRUCTOR (user_id, dept, designation) VALUES (?, ?, ?)',
				[user_id, dept || 'General', designation || 'Instructor']
			);
		}

		await connection.commit();

		return res.status(200).json({
			success: true,
			message: 'User promoted to instructor successfully.',
		});
	} catch (error) {
		if (connection) {
			await connection.rollback();
		}

		return res.status(500).json({
			success: false,
			message: 'Failed to promote user.',
			error: error.message,
		});
	} finally {
		if (connection) {
			connection.release();
		}
	}
}

module.exports = {
	registerUser,
	loginUser,
	getAllUsers,
	deleteUser,
	promoteUserToInstructor,
};
