const mysql = require('mysql2/promise');

const databaseName = process.env.DB_NAME || 'online_test_system';

const pool = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: databaseName,
	port: Number(process.env.DB_PORT) || 3306,
	waitForConnections: true,
	connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
	queueLimit: 0,
});

if (typeof pool.on === 'function') {
	pool.on('error', (error) => {
		console.error('MySQL pool error:', error.message);
	});
}

async function createDatabaseIfNeeded() {
	const rootConnection = await mysql.createConnection({
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		port: Number(process.env.DB_PORT) || 3306,
	});

	try {
		await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\``);
	} finally {
		await rootConnection.end();
	}
}

async function createSchema(connection) {
	await connection.execute(`
		CREATE TABLE IF NOT EXISTS USERS (
			user_id INT AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(150) NOT NULL,
			email VARCHAR(190) NOT NULL UNIQUE,
			password VARCHAR(255) NOT NULL,
			role ENUM('student', 'instructor', 'teaching_asst', 'admin') NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`);

	await connection.execute(`
		CREATE TABLE IF NOT EXISTS STUDENT (
			user_id INT PRIMARY KEY,
			reg_no VARCHAR(64) NOT NULL UNIQUE,
			sem VARCHAR(20) DEFAULT NULL,
			dept VARCHAR(120) DEFAULT NULL,
			CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
		)
	`);

	await connection.execute(`
		CREATE TABLE IF NOT EXISTS INSTRUCTOR (
			user_id INT PRIMARY KEY,
			dept VARCHAR(120) DEFAULT NULL,
			designation VARCHAR(120) DEFAULT NULL,
			CONSTRAINT fk_instructor_user FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
		)
	`);

	await connection.execute(`
		CREATE TABLE IF NOT EXISTS ADMIN (
			user_id INT PRIMARY KEY,
			admin_level INT NOT NULL DEFAULT 1,
			privileges VARCHAR(255) DEFAULT NULL,
			CONSTRAINT fk_admin_user FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
		)
	`);

	await connection.execute(`
		CREATE TABLE IF NOT EXISTS TEACHING_ASST (
			user_id INT PRIMARY KEY,
			assigned_instructor INT NOT NULL,
			CONSTRAINT fk_ta_user FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
			CONSTRAINT fk_ta_instructor FOREIGN KEY (assigned_instructor) REFERENCES INSTRUCTOR(user_id) ON DELETE RESTRICT
		)
	`);

	await connection.execute(`
		CREATE TABLE IF NOT EXISTS COURSE (
			course_id INT AUTO_INCREMENT PRIMARY KEY,
			course_name VARCHAR(190) NOT NULL,
			course_code VARCHAR(50) NOT NULL UNIQUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`);

	await connection.execute(`
		CREATE TABLE IF NOT EXISTS QUESTION_BANK (
			bank_id INT AUTO_INCREMENT PRIMARY KEY,
			course_id INT NOT NULL,
			created_by INT NOT NULL,
			title VARCHAR(190) NOT NULL,
			description TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT fk_bank_course FOREIGN KEY (course_id) REFERENCES COURSE(course_id) ON DELETE CASCADE,
			CONSTRAINT fk_bank_creator FOREIGN KEY (created_by) REFERENCES USERS(user_id) ON DELETE RESTRICT
		)
	`);

	await connection.execute(`
		CREATE TABLE IF NOT EXISTS QUESTION (
			question_id INT AUTO_INCREMENT PRIMARY KEY,
			bank_id INT NOT NULL,
			question_text TEXT NOT NULL,
			difficulty_level VARCHAR(50) NOT NULL,
			marks INT NOT NULL DEFAULT 1,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT fk_question_bank FOREIGN KEY (bank_id) REFERENCES QUESTION_BANK(bank_id) ON DELETE CASCADE
		)
	`);

	await connection.execute(`
		CREATE TABLE IF NOT EXISTS OPTIONS (
			option_id INT AUTO_INCREMENT PRIMARY KEY,
			question_id INT NOT NULL,
			option_text TEXT NOT NULL,
			is_correct TINYINT(1) NOT NULL DEFAULT 0,
			CONSTRAINT fk_option_question FOREIGN KEY (question_id) REFERENCES QUESTION(question_id) ON DELETE CASCADE
		)
	`);

	await connection.execute(`
		CREATE TABLE IF NOT EXISTS TEST (
			test_id INT AUTO_INCREMENT PRIMARY KEY,
			course_id INT NOT NULL,
			title VARCHAR(190) NOT NULL,
			total_marks INT NOT NULL DEFAULT 0,
			duration INT NOT NULL DEFAULT 0,
			start_time DATETIME NOT NULL,
			end_time DATETIME NOT NULL,
			created_by INT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT fk_test_course FOREIGN KEY (course_id) REFERENCES COURSE(course_id) ON DELETE CASCADE,
			CONSTRAINT fk_test_creator FOREIGN KEY (created_by) REFERENCES USERS(user_id) ON DELETE RESTRICT
		)
	`);

	await connection.execute(`
		CREATE TABLE IF NOT EXISTS INCLUDES (
			test_id INT NOT NULL,
			bank_id INT NOT NULL,
			PRIMARY KEY (test_id, bank_id),
			CONSTRAINT fk_includes_test FOREIGN KEY (test_id) REFERENCES TEST(test_id) ON DELETE CASCADE,
			CONSTRAINT fk_includes_bank FOREIGN KEY (bank_id) REFERENCES QUESTION_BANK(bank_id) ON DELETE CASCADE
		)
	`);

	await connection.execute(`
		CREATE TABLE IF NOT EXISTS TEST_ATTEMPT (
			attempt_id INT AUTO_INCREMENT PRIMARY KEY,
			student_id INT NOT NULL,
			test_id INT NOT NULL,
			start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			end_time DATETIME DEFAULT NULL,
			score INT NOT NULL DEFAULT 0,
			CONSTRAINT fk_attempt_student FOREIGN KEY (student_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
			CONSTRAINT fk_attempt_test FOREIGN KEY (test_id) REFERENCES TEST(test_id) ON DELETE CASCADE
		)
	`);

	await connection.execute(`
		CREATE TABLE IF NOT EXISTS STUDENT_RESPONSE (
			attempt_id INT NOT NULL,
			question_id INT NOT NULL,
			selected_option_id INT NOT NULL,
			is_correct TINYINT(1) NOT NULL DEFAULT 0,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (attempt_id, question_id),
			CONSTRAINT fk_response_attempt FOREIGN KEY (attempt_id) REFERENCES TEST_ATTEMPT(attempt_id) ON DELETE CASCADE,
			CONSTRAINT fk_response_question FOREIGN KEY (question_id) REFERENCES QUESTION(question_id) ON DELETE CASCADE,
			CONSTRAINT fk_response_option FOREIGN KEY (selected_option_id) REFERENCES OPTIONS(option_id) ON DELETE CASCADE
		)
	`);

	await connection.execute(`
		CREATE TABLE IF NOT EXISTS REPORT (
			report_id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			role ENUM('student', 'instructor', 'teaching_asst', 'admin') NOT NULL,
			report_type ENUM('bug', 'complaint', 'issue', 'feedback') NOT NULL DEFAULT 'issue',
			title VARCHAR(255) NOT NULL,
			description TEXT NOT NULL,
			status ENUM('pending', 'resolved') NOT NULL DEFAULT 'pending',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT fk_report_user FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
		)
	`);

	const [reportTypeColumnRows] = await connection.execute(
		"SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'REPORT' AND COLUMN_NAME = 'report_type' LIMIT 1"
	);

	if (reportTypeColumnRows.length === 0) {
		await connection.execute(
			"ALTER TABLE REPORT ADD COLUMN report_type ENUM('bug', 'complaint', 'issue', 'feedback') NOT NULL DEFAULT 'issue' AFTER role"
		);
	}

	await connection.query('DROP TRIGGER IF EXISTS set_default_status');
	await connection.query(`
		CREATE TRIGGER set_default_status
		BEFORE INSERT ON REPORT
		FOR EACH ROW
		SET NEW.status = 'pending'
	`);
}

async function initializeDatabase() {
	let connection;

	try {
		await createDatabaseIfNeeded();
		connection = await pool.getConnection();
		await createSchema(connection);
		await connection.ping();
		console.log('MySQL connection pool is ready.');
	} catch (error) {
		console.error('Failed to initialize MySQL schema:', error.message);
		throw error;
	} finally {
		if (connection) {
			connection.release();
		}
	}
}

module.exports = pool;
module.exports.initializeDatabase = initializeDatabase;