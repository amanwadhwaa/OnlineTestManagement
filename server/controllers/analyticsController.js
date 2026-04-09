const pool = require('../config/db');

async function getLeaderboard(req, res) {
  try {
    const { test_id } = req.params;

    if (!test_id) {
      return res.status(400).json({
        success: false,
        message: 'test_id is required.',
      });
    }

    const query =
      'SELECT ta.attempt_id, ta.student_id, u.name AS student_name, ta.test_id, t.title AS test_title, ta.score, ta.start_time, ta.end_time FROM TEST_ATTEMPT ta INNER JOIN USERS u ON u.user_id = ta.student_id INNER JOIN TEST t ON t.test_id = ta.test_id WHERE ta.test_id = ? AND ta.end_time IS NOT NULL ORDER BY ta.score DESC, ta.end_time ASC LIMIT 5';
    const [rows] = await pool.execute(query, [test_id]);

    return res.status(200).json({
      success: true,
      data: {
        test_id: Number(test_id),
        total_ranked: rows.length,
          leaderboard: rows,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard.',
      error: error.message,
    });
  }
}

async function getStudentPerformance(req, res) {
  try {
    const { student_id } = req.params;
    const requester = req.user || {};

    if (!student_id) {
      return res.status(400).json({
        success: false,
        message: 'student_id is required.',
      });
    }

    if (requester.role === 'student' && Number(requester.user_id) !== Number(student_id)) {
      return res.status(403).json({
        success: false,
        message: 'Students can only view their own performance.',
      });
    }

    const attemptsQuery =
      'SELECT ta.attempt_id, ta.student_id, ta.test_id, t.title AS test_title, ta.score, t.total_marks, ta.start_time, ta.end_time FROM TEST_ATTEMPT ta INNER JOIN TEST t ON t.test_id = ta.test_id WHERE ta.student_id = ? AND ta.end_time IS NOT NULL ORDER BY ta.attempt_id DESC';
    const [attemptRows] = await pool.execute(attemptsQuery, [student_id]);

    const summaryQuery =
      'SELECT COUNT(*) AS total_attempts, AVG(score) AS avg_score, MAX(score) AS highest_score, MIN(score) AS lowest_score FROM TEST_ATTEMPT WHERE student_id = ? AND end_time IS NOT NULL';
    const [summaryRows] = await pool.execute(summaryQuery, [student_id]);

    return res.status(200).json({
      success: true,
      data: {
        student_id: Number(student_id),
        summary: summaryRows[0] || {
          total_attempts: 0,
          avg_score: null,
          highest_score: null,
          lowest_score: null,
        },
        attempts: attemptRows,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch student performance.',
      error: error.message,
    });
  }
}

async function getTestStats(req, res) {
  try {
    const { test_id } = req.params;

    if (!test_id) {
      return res.status(400).json({
        success: false,
        message: 'test_id is required.',
      });
    }

    const query =
      'SELECT COUNT(*) AS total_attempts, AVG(score) AS avg_score, MAX(score) AS highest_score, MIN(score) AS lowest_score FROM TEST_ATTEMPT WHERE test_id = ? AND end_time IS NOT NULL';
    const [rows] = await pool.execute(query, [test_id]);

    return res.status(200).json({
      success: true,
      data: {
        test_id: Number(test_id),
        stats: rows[0] || {
          total_attempts: 0,
          avg_score: null,
          highest_score: null,
          lowest_score: null,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch test stats.',
      error: error.message,
    });
  }
}

async function getGlobalLeaderboard(req, res) {
  try {
    const query =
      'SELECT ta.attempt_id, ta.student_id, u.name AS student_name, ta.test_id, t.title AS test_title, ta.score, ta.end_time FROM TEST_ATTEMPT ta INNER JOIN USERS u ON u.user_id = ta.student_id INNER JOIN TEST t ON t.test_id = ta.test_id WHERE ta.end_time IS NOT NULL ORDER BY ta.score DESC, ta.end_time ASC LIMIT 20';
    const [rows] = await pool.execute(query);

    return res.status(200).json({
      success: true,
      data: {
        total_ranked: rows.length,
        leaderboard: rows,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch global leaderboard.',
      error: error.message,
    });
  }
}

module.exports = {
  getLeaderboard,
  getStudentPerformance,
  getTestStats,
  getGlobalLeaderboard,
};
