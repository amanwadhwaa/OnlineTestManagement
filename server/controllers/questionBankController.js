const pool = require('../config/db');

async function createQuestionBank(req, res) {
  try {
    const { course_id, title, description } = req.body || {};
    const created_by = req.user && req.user.user_id;

    if (!course_id || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'course_id, title, and description are required.',
      });
    }

    if (!created_by) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized user context missing.',
      });
    }

    const query = 'INSERT INTO QUESTION_BANK (course_id, created_by, title, description) VALUES (?, ?, ?, ?)';
    const values = [course_id, created_by, title, description];
    const [rows] = await pool.execute(query, values);

    return res.status(201).json({
      success: true,
      message: 'Question bank created successfully.',
      bank_id: rows.insertId,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create question bank.',
      error: error.message,
    });
  }
}

async function getQuestionBanksByCourse(req, res) {
  try {
    const { course_id } = req.params;

    if (!course_id) {
      return res.status(400).json({
        success: false,
        message: 'course_id is required.',
      });
    }

    const query = 'SELECT bank_id, course_id, created_by, title, description FROM QUESTION_BANK WHERE course_id = ? ORDER BY bank_id DESC';
    const values = [course_id];
    const [rows] = await pool.execute(query, values);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch question banks.',
      error: error.message,
    });
  }
}

module.exports = {
  createQuestionBank,
  getQuestionBanksByCourse,
};
