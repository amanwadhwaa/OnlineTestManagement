const pool = require('../config/db');

async function getStudentPerformance(req, res) {
  try {
    const student_id = req.query.student_id || 1;
    const [rows] = await pool.execute('CALL GetStudentPerformance(?)', [student_id]);
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false });
  }
}

async function getLeaderboard(req, res) {
  try {
    const test_id = req.query.test_id || 1;
    const [rows] = await pool.execute('CALL GetLeaderboard(?)', [test_id]);
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false });
  }
}

async function getTestStats(req, res) {
  try {
    const test_id = req.query.test_id || 1;
    const [rows] = await pool.execute('CALL GetTestStats(?)', [test_id]);
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false });
  }
}

// Not exported or used in routes, so does not affect any functionality
