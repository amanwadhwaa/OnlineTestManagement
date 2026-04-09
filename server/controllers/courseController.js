const pool = require('../config/db');

async function createCourse(req, res) {
  try {
    const { course_name, course_code } = req.body || {};

    if (!course_name || !course_code) {
      return res.status(400).json({
        success: false,
        message: 'course_name and course_code are required.',
      });
    }

    const query = 'INSERT INTO COURSE (course_name, course_code) VALUES (?, ?)';
    const values = [course_name, course_code];
    const [rows] = await pool.execute(query, values);

    return res.status(201).json({
      success: true,
      message: 'Course created successfully.',
      course_id: rows.insertId,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create course.',
      error: error.message,
    });
  }
}

async function getAllCourses(req, res) {
  try {
    const query = 'SELECT course_id, course_name, course_code FROM COURSE ORDER BY course_id DESC';
    const values = [];
    const [rows] = await pool.execute(query, values);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch courses.',
      error: error.message,
    });
  }
}

module.exports = {
  createCourse,
  getAllCourses,
};
