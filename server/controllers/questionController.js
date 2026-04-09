const pool = require('../config/db');

async function addQuestionWithOptions(req, res) {
  let connection;

  try {
    const { bank_id, question_text, difficulty_level, marks, options } = req.body || {};

    if (!bank_id || !question_text || !difficulty_level || marks === undefined || !Array.isArray(options)) {
      return res.status(400).json({
        success: false,
        message: 'bank_id, question_text, difficulty_level, marks, and options are required.',
      });
    }

    if (options.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'At least 4 options are required.',
      });
    }

    const correctCount = options.filter((option) => option && option.is_correct === true).length;
    if (correctCount !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Exactly one option must be marked as correct.',
      });
    }

    const invalidOption = options.find((option) => !option || !option.option_text || typeof option.is_correct !== 'boolean');
    if (invalidOption) {
      return res.status(400).json({
        success: false,
        message: 'Each option must have option_text and boolean is_correct.',
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const questionQuery = 'INSERT INTO QUESTION (bank_id, question_text, difficulty_level, marks) VALUES (?, ?, ?, ?)';
    const questionValues = [bank_id, question_text, difficulty_level, marks];
    const [questionRows] = await connection.execute(questionQuery, questionValues);
    const question_id = questionRows.insertId;

    const optionQuery = 'INSERT INTO OPTIONS (question_id, option_text, is_correct) VALUES (?, ?, ?)';
    for (const option of options) {
      const optionValues = [question_id, option.option_text, option.is_correct ? 1 : 0];
      await connection.execute(optionQuery, optionValues);
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Question and options added successfully.',
      question_id,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to add question with options.',
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function getQuestionsByBank(req, res) {
  try {
    const { bank_id } = req.params;

    if (!bank_id) {
      return res.status(400).json({
        success: false,
        message: 'bank_id is required.',
      });
    }

    const [questionRows] = await pool.execute(
      'SELECT question_id, bank_id, question_text, difficulty_level, marks FROM QUESTION WHERE bank_id = ? ORDER BY question_id DESC',
      [bank_id]
    );

    if (questionRows.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const questionIds = questionRows.map((question) => question.question_id);
    const placeholders = questionIds.map(() => '?').join(', ');
    const [optionRows] = await pool.execute(
      `SELECT option_id, question_id, option_text, is_correct FROM OPTIONS WHERE question_id IN (${placeholders}) ORDER BY option_id ASC`,
      questionIds
    );

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
      data: questionRows.map((question) => ({
        ...question,
        options: optionsByQuestion.get(question.question_id) || [],
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch questions.',
      error: error.message,
    });
  }
}

module.exports = {
  addQuestionWithOptions,
  getQuestionsByBank,
};
