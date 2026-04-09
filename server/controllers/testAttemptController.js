const pool = require('../config/db');

async function startTest(req, res) {
  let connection;

  try {
    const { test_id } = req.params;
    const student_id = req.user && req.user.user_id;

    if (!test_id) {
      return res.status(400).json({ success: false, message: 'test_id is required.' });
    }

    if (!student_id) {
      return res.status(401).json({ success: false, message: 'Unauthorized user context missing.' });
    }

    const [userRows] = await pool.execute(
      'SELECT user_id, role FROM USERS WHERE user_id = ? LIMIT 1',
      [student_id]
    );

    if (userRows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Session user is no longer valid. Please login again.',
      });
    }

    if (userRows[0].role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can start a test attempt.',
      });
    }

    const [studentRows] = await pool.execute(
      'SELECT user_id FROM STUDENT WHERE user_id = ? LIMIT 1',
      [student_id]
    );

    if (studentRows.length === 0) {
      // Backfill legacy student profile row so TEST_ATTEMPT foreign key constraints pass.
      const defaultRegNo = `REG${String(student_id).padStart(6, '0')}`;

      try {
        await pool.execute(
          'INSERT INTO STUDENT (user_id, reg_no, sem, dept) VALUES (?, ?, ?, ?)',
          [student_id, defaultRegNo, null, 'General']
        );
      } catch (studentInsertError) {
        if (studentInsertError && studentInsertError.code !== 'ER_DUP_ENTRY') {
          throw studentInsertError;
        }
      }
    }

    const [testRows] = await pool.execute(
      'SELECT test_id, title, start_time, end_time FROM TEST WHERE test_id = ? LIMIT 1',
      [test_id]
    );

    if (testRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Test not found.' });
    }

    const test = testRows[0];
    const now = new Date();
    const testEnd = new Date(test.end_time);

    const testStart = new Date(test.start_time);

    if (now < testStart) {
      return res.status(400).json({ success: false, message: 'Test has not started yet.' });
    }

    if (now > testEnd) {
      return res.status(400).json({ success: false, message: 'Test expired.' });
    }

    const [questionRows] = await pool.execute(
      'SELECT q.question_id, q.bank_id, q.question_text, q.difficulty_level, q.marks FROM INCLUDES i INNER JOIN QUESTION q ON q.bank_id = i.bank_id WHERE i.test_id = ? ORDER BY q.question_id ASC',
      [test_id]
    );

		if (questionRows.length === 0) {
			return res.status(404).json({
				success: false,
				message: 'No questions found for this test.',
			});
		}

		const [existingAttempts] = await pool.execute(
      'SELECT attempt_id, end_time, score FROM TEST_ATTEMPT WHERE student_id = ? AND test_id = ? ORDER BY attempt_id DESC LIMIT 1',
      [student_id, test_id]
    );

    let attempt_id;

    if (existingAttempts.length > 0) {
      const latest = existingAttempts[0];

      if (latest.end_time) {
        return res.status(200).json({
          success: true,
          message: 'Attempt already submitted. Returning existing attempt result reference.',
          data: {
            attempt_id: latest.attempt_id,
            already_submitted: true,
            score: Number(latest.score) || 0,
          },
        });
      }

      attempt_id = latest.attempt_id;
    } else {
      connection = await pool.getConnection();
      await connection.beginTransaction();

      const [attemptRows] = await connection.execute(
        'INSERT INTO TEST_ATTEMPT (student_id, test_id, start_time, score) VALUES (?, ?, NOW(), 0)',
        [student_id, test_id]
      );

      attempt_id = attemptRows.insertId;
    }

    const questionIds = questionRows.map((row) => row.question_id);
    const placeholders = questionIds.map(() => '?').join(', ');
    const optionQuery = `SELECT option_id, question_id, option_text FROM OPTIONS WHERE question_id IN (${placeholders}) ORDER BY option_id ASC`;
    const executor = connection || pool;
    const [optionRows] = await executor.execute(optionQuery, questionIds);

    const optionsByQuestion = new Map();
    for (const option of optionRows) {
      if (!optionsByQuestion.has(option.question_id)) {
        optionsByQuestion.set(option.question_id, []);
      }
      optionsByQuestion.get(option.question_id).push({
        option_id: option.option_id,
        option_text: option.option_text,
      });
    }

    const questions = questionRows.map((question) => ({
      question_id: question.question_id,
      bank_id: question.bank_id,
      question_text: question.question_text,
      difficulty_level: question.difficulty_level,
      marks: question.marks,
      options: optionsByQuestion.get(question.question_id) || [],
    }));

    if (connection) {
      await connection.commit();
    }

    return res.status(200).json({
      success: true,
      message: 'Test started successfully.',
      data: {
        attempt_id,
        test: {
          test_id: test.test_id,
          title: test.title,
          start_time: test.start_time,
          end_time: test.end_time,
        },
        questions,
      },
    });
  } catch (error) {
    console.error('startTest failed:', error);

    if (connection) {
      await connection.rollback();
    }

    if (error && (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452)) {
      const detail = String(error.message || '').toLowerCase();
      const missingStudent = detail.includes('student_id') || detail.includes('test_attempt_ibfk_1') || detail.includes('fk_attempt_student');

      return res.status(401).json({
        success: false,
        message: missingStudent
          ? 'Student profile is missing for this account. Please contact admin.'
          : 'Session user is invalid for test attempt. Please login again.',
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to start test.',
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function submitTest(req, res) {
  let connection;

  try {
    const { attempt_id } = req.params;
    const { answers } = req.body || {};
    const student_id = req.user && req.user.user_id;

    if (!attempt_id) {
      return res.status(400).json({ success: false, message: 'attempt_id is required.' });
    }

    if (!student_id) {
      return res.status(401).json({ success: false, message: 'Unauthorized user context missing.' });
    }

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'answers must be a non-empty array.',
      });
    }

    const [attemptRows] = await pool.execute(
      'SELECT ta.attempt_id, ta.student_id, ta.test_id, ta.start_time, ta.end_time, ta.score, t.end_time AS test_end_time, t.total_marks FROM TEST_ATTEMPT ta INNER JOIN TEST t ON t.test_id = ta.test_id WHERE ta.attempt_id = ? LIMIT 1',
      [attempt_id]
    );

    if (attemptRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid attempt_id.' });
    }

    const attempt = attemptRows[0];

    if (Number(attempt.student_id) !== Number(student_id)) {
      return res.status(403).json({ success: false, message: 'Forbidden attempt access.' });
    }

    if (attempt.end_time) {
      return res.status(409).json({ success: false, message: 'Attempt is already submitted.' });
    }

    const now = new Date();
    const testEnd = new Date(attempt.test_end_time);
    if (now > testEnd) {
      return res.status(400).json({ success: false, message: 'Test expired. Submission not allowed.' });
    }

    const [questionRows] = await pool.execute(
      'SELECT q.question_id, q.marks, co.option_id AS correct_option_id FROM INCLUDES i INNER JOIN QUESTION q ON q.bank_id = i.bank_id INNER JOIN OPTIONS co ON co.question_id = q.question_id AND co.is_correct = 1 WHERE i.test_id = ?',
      [attempt.test_id]
    );

    const questionMap = new Map();
    for (const row of questionRows) {
      questionMap.set(Number(row.question_id), {
        marks: Number(row.marks) || 0,
        correct_option_id: Number(row.correct_option_id),
      });
    }

    const optionIds = answers.map((answer) => answer && answer.selected_option_id).filter(Boolean);
    if (optionIds.length !== answers.length) {
      return res.status(400).json({
        success: false,
        message: 'Each answer must include question_id and selected_option_id.',
      });
    }

    const optionPlaceholders = optionIds.map(() => '?').join(', ');
    const [optionRows] = await pool.execute(
      `SELECT option_id, question_id FROM OPTIONS WHERE option_id IN (${optionPlaceholders})`,
      optionIds
    );

    const optionMap = new Map();
    for (const option of optionRows) {
      optionMap.set(Number(option.option_id), Number(option.question_id));
    }

    let score = 0;
    let correct_answers = 0;
    let wrong_answers = 0;
    const validatedAnswers = [];

    for (const answer of answers) {
      const question_id = Number(answer.question_id);
      const selected_option_id = Number(answer.selected_option_id);

      if (!questionMap.has(question_id)) {
        return res.status(400).json({
          success: false,
          message: `Question ${question_id} does not belong to this test.`,
        });
      }

      if (!optionMap.has(selected_option_id) || optionMap.get(selected_option_id) !== question_id) {
        return res.status(400).json({
          success: false,
          message: `Invalid selected_option_id ${selected_option_id} for question ${question_id}.`,
        });
      }

      const questionData = questionMap.get(question_id);
      const is_correct = selected_option_id === questionData.correct_option_id;

      if (is_correct) {
        score += questionData.marks;
        correct_answers += 1;
      } else {
        wrong_answers += 1;
      }

      validatedAnswers.push({
        question_id,
        selected_option_id,
        is_correct,
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    for (const answer of validatedAnswers) {
      await connection.execute(
        'INSERT INTO STUDENT_RESPONSE (attempt_id, question_id, selected_option_id, is_correct) VALUES (?, ?, ?, ?)',
        [attempt_id, answer.question_id, answer.selected_option_id, answer.is_correct ? 1 : 0]
      );
    }

    await connection.execute('UPDATE TEST_ATTEMPT SET score = ?, end_time = NOW() WHERE attempt_id = ?', [score, attempt_id]);

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: 'Test submitted successfully.',
      data: {
        attempt_id: Number(attempt_id),
        score,
        total_marks: Number(attempt.total_marks) || 0,
        correct_answers,
        wrong_answers,
      },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to submit test.',
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function getAttemptResult(req, res) {
  try {
    const { attempt_id } = req.params;
    const student_id = req.user && req.user.user_id;

    if (!attempt_id) {
      return res.status(400).json({ success: false, message: 'attempt_id is required.' });
    }

    const [attemptRows] = await pool.execute(
      'SELECT ta.attempt_id, ta.student_id, ta.test_id, ta.start_time, ta.end_time, ta.score, t.total_marks FROM TEST_ATTEMPT ta INNER JOIN TEST t ON t.test_id = ta.test_id WHERE ta.attempt_id = ? LIMIT 1',
      [attempt_id]
    );

    if (attemptRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid attempt_id.' });
    }

    const attempt = attemptRows[0];

    if (Number(attempt.student_id) !== Number(student_id)) {
      return res.status(403).json({ success: false, message: 'Forbidden result access.' });
    }

    if (!attempt.end_time) {
      return res.status(400).json({ success: false, message: 'Attempt is not submitted yet.' });
    }

    const [summaryRows] = await pool.execute(
      'SELECT COUNT(*) AS total_answered, SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct_answers, SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) AS wrong_answers FROM STUDENT_RESPONSE WHERE attempt_id = ?',
      [attempt_id]
    );

    const summary = summaryRows[0] || {};

    return res.status(200).json({
      success: true,
      data: {
        attempt_id: attempt.attempt_id,
        test_id: attempt.test_id,
        score: Number(attempt.score) || 0,
        total_marks: Number(attempt.total_marks) || 0,
        correct_answers: Number(summary.correct_answers) || 0,
        wrong_answers: Number(summary.wrong_answers) || 0,
        total_answered: Number(summary.total_answered) || 0,
        start_time: attempt.start_time,
        end_time: attempt.end_time,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch attempt result.',
      error: error.message,
    });
  }
}

module.exports = {
  startTest,
  submitTest,
  getAttemptResult,
};
