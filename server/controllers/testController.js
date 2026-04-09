const pool = require('../config/db');

async function createTest(req, res) {
  let connection;

  try {
    const { course_id, title, total_marks, duration, start_time, end_time, bank_ids } = req.body || {};
    const created_by = req.user && req.user.user_id;

    if (!course_id || !title || total_marks === undefined || duration === undefined || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'course_id, title, total_marks, duration, start_time, and end_time are required.',
      });
    }

    if (!created_by) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized user context missing.',
      });
    }

    const parsedDuration = Number(duration);
    if (Number.isNaN(parsedDuration) || parsedDuration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'duration must be greater than 0.',
      });
    }

    const start = new Date(start_time);
    const end = new Date(end_time);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'start_time and end_time must be valid datetime values.',
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'end_time must be greater than start_time.',
      });
    }

    const normalizedBankIds = Array.isArray(bank_ids)
      ? bank_ids.map((bankId) => Number(bankId)).filter((bankId) => Number.isFinite(bankId))
      : [];

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const insertTestQuery =
      'INSERT INTO TEST (course_id, title, total_marks, duration, start_time, end_time, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const testValues = [course_id, title, total_marks, parsedDuration, start_time, end_time, created_by];
    const [testRows] = await connection.execute(insertTestQuery, testValues);

    const test_id = testRows.insertId;

    if (normalizedBankIds.length > 0) {
      const insertIncludesQuery = 'INSERT INTO INCLUDES (test_id, bank_id) VALUES (?, ?)';
      for (const bank_id of normalizedBankIds) {
        await connection.execute(insertIncludesQuery, [test_id, bank_id]);
      }
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Test created successfully.',
      data: {
        test_id,
        course_id,
        title,
        total_marks,
        duration: parsedDuration,
        start_time,
        end_time,
        created_by,
        bank_ids: normalizedBankIds,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create test.',
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function getTestsByCourse(req, res) {
  try {
    const { course_id } = req.params;

    if (!course_id) {
      return res.status(400).json({
        success: false,
        message: 'course_id is required.',
      });
    }

    const query =
      'SELECT test_id, course_id, title, total_marks, duration, start_time, end_time, created_by FROM TEST WHERE course_id = ? ORDER BY test_id DESC';
    const [rows] = await pool.execute(query, [course_id]);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch tests by course.',
      error: error.message,
    });
  }
}

async function getAvailableTests(req, res) {
  try {
    const query =
      'SELECT test_id, title, duration, total_marks, start_time, end_time FROM TEST WHERE NOW() BETWEEN start_time AND end_time ORDER BY start_time ASC';
    const [rows] = await pool.execute(query, []);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch available tests.',
      error: error.message,
    });
  }
}

async function getTestDetails(req, res) {
  try {
    const { test_id } = req.params;

    if (!test_id) {
      return res.status(400).json({
        success: false,
        message: 'test_id is required.',
      });
    }

    const testQuery =
      'SELECT test_id, course_id, title, total_marks, duration, start_time, end_time, created_by FROM TEST WHERE test_id = ? LIMIT 1';
    const [testRows] = await pool.execute(testQuery, [test_id]);

    if (testRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test not found.',
      });
    }

    const banksQuery =
      'SELECT qb.bank_id, qb.course_id, qb.created_by, qb.title, qb.description FROM INCLUDES i INNER JOIN QUESTION_BANK qb ON qb.bank_id = i.bank_id WHERE i.test_id = ? ORDER BY qb.bank_id DESC';
    const [bankRows] = await pool.execute(banksQuery, [test_id]);

    const questionsQuery =
      'SELECT q.question_id, q.bank_id, q.question_text, q.difficulty_level, q.marks, qb.title AS bank_title FROM INCLUDES i INNER JOIN QUESTION_BANK qb ON qb.bank_id = i.bank_id INNER JOIN QUESTION q ON q.bank_id = qb.bank_id WHERE i.test_id = ? ORDER BY q.question_id ASC';
    const [questionRows] = await pool.execute(questionsQuery, [test_id]);

    const questionIds = questionRows.map((question) => question.question_id);
    let optionRows = [];

    if (questionIds.length > 0) {
      const placeholders = questionIds.map(() => '?').join(', ');
      const optionQuery = `SELECT option_id, question_id, option_text, is_correct FROM OPTIONS WHERE question_id IN (${placeholders}) ORDER BY option_id ASC`;
      [optionRows] = await pool.execute(optionQuery, questionIds);
    }

    const optionsByQuestion = new Map();
    for (const option of optionRows) {
      if (!optionsByQuestion.has(option.question_id)) {
        optionsByQuestion.set(option.question_id, []);
      }
      optionsByQuestion.get(option.question_id).push({
        option_id: option.option_id,
        option_text: option.option_text,
        is_correct: Boolean(option.is_correct),
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        test: testRows[0],
        question_banks: bankRows,
        questions: questionRows.map((question) => ({
          ...question,
          options: optionsByQuestion.get(question.question_id) || [],
        })),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch test details.',
      error: error.message,
    });
  }
}

async function getAllTests(req, res) {
  try {
    const query =
      'SELECT t.test_id, t.course_id, c.course_name, t.title, t.total_marks, t.duration, t.start_time, t.end_time, t.created_by FROM TEST t LEFT JOIN COURSE c ON c.course_id = t.course_id ORDER BY t.test_id DESC';
    const [rows] = await pool.execute(query);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch all tests.',
      error: error.message,
    });
  }
}

async function deleteTest(req, res) {
  try {
    const { test_id } = req.params;

    if (!test_id) {
      return res.status(400).json({
        success: false,
        message: 'test_id is required.',
      });
    }

    const [existingRows] = await pool.execute('SELECT test_id FROM TEST WHERE test_id = ? LIMIT 1', [test_id]);
    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test not found.',
      });
    }

    await pool.execute('DELETE FROM TEST WHERE test_id = ?', [test_id]);

    return res.status(200).json({
      success: true,
      message: 'Test deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete test.',
      error: error.message,
    });
  }
}

module.exports = {
  createTest,
  getTestsByCourse,
  getAvailableTests,
  getTestDetails,
  getAllTests,
  deleteTest,
};
