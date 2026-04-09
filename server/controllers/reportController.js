const pool = require('../config/db');

async function createReport(req, res) {
  try {
    const { report_type, title, description } = req.body || {};
    const user = req.user || {};
    const allowedTypes = new Set(['bug', 'complaint', 'issue', 'feedback']);
    const normalizedType = String(report_type || 'issue').trim().toLowerCase();

    if (!user.user_id || !user.role) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized user context missing.',
      });
    }

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'title and description are required.',
      });
    }

    if (!allowedTypes.has(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: 'report_type must be one of: bug, complaint, issue, feedback.',
      });
    }

    const [rows] = await pool.execute(
      'INSERT INTO REPORT (user_id, role, report_type, title, description) VALUES (?, ?, ?, ?, ?)',
      [user.user_id, user.role, normalizedType, title, description]
    );

    return res.status(201).json({
      success: true,
      message: 'Report submitted successfully.',
      data: {
        report_id: rows.insertId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to submit report.',
      error: error.message,
    });
  }
}

async function getAllReports(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT r.report_id, r.user_id, u.name AS user_name, u.email, r.role, r.report_type, r.title, r.description, r.status, r.created_at FROM REPORT r INNER JOIN USERS u ON u.user_id = r.user_id ORDER BY r.report_id DESC'
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reports.',
      error: error.message,
    });
  }
}

async function updateReportStatus(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Report id is required.',
      });
    }

    const [existingRows] = await pool.execute('SELECT report_id FROM REPORT WHERE report_id = ? LIMIT 1', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found.',
      });
    }

    await pool.execute("UPDATE REPORT SET status = 'resolved' WHERE report_id = ?", [id]);

    return res.status(200).json({
      success: true,
      message: 'Report marked as resolved.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update report status.',
      error: error.message,
    });
  }
}

module.exports = {
  createReport,
  getAllReports,
  updateReportStatus,
};
