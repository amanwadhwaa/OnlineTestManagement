import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { getApiErrorMessage } from '../services/api';

function TestPage() {
  const { test_id } = useParams();
  const navigate = useNavigate();

  const [attemptId, setAttemptId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function startTest() {
      try {
        setLoading(true);
        setError('');

        const response = await api.post(`/test/start/${test_id}`);
        const data = response?.data?.data;

        if (data?.already_submitted && data?.attempt_id) {
          navigate(`/result/${data.attempt_id}`);
          return;
        }

        if (mounted) {
          setAttemptId(data?.attempt_id);
          setQuestions(data?.questions || []);
        }
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err, 'Could not start test.'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    startTest();
    return () => {
      mounted = false;
    };
  }, [test_id]);

  const currentQuestion = useMemo(() => questions[index], [questions, index]);

  const handleSelectOption = (questionId, optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmit = async () => {
    if (!attemptId) {
      setError('Attempt ID missing. Please restart the test.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = Object.entries(answers).map(([questionId, selectedOptionId]) => ({
        question_id: Number(questionId),
        selected_option_id: Number(selectedOptionId),
      }));

      const response = await api.post(`/test/submit/${attemptId}`, { answers: payload });
      navigate(`/result/${attemptId}`, { state: { result: response?.data?.data } });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to submit test.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-76px)] bg-gradient-to-br from-sky-100 via-indigo-100 to-purple-100 px-4 py-8">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/60 bg-white/80 p-5 text-slate-700 shadow-sm">Loading test...</div>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="min-h-[calc(100vh-76px)] bg-gradient-to-br from-sky-100 via-indigo-100 to-purple-100 px-4 py-8">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm">{error}</div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-[calc(100vh-76px)] bg-gradient-to-br from-sky-100 via-indigo-100 to-purple-100 px-4 py-8">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/60 bg-white/80 p-5 text-slate-700 shadow-sm">No questions available for this test.</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-76px)] bg-gradient-to-br from-sky-100 via-indigo-100 to-purple-100 px-4 py-8">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-white/60 bg-white/85 p-6 shadow-[0_14px_36px_rgba(30,41,59,0.12)] backdrop-blur-sm">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span className="rounded-full bg-indigo-100 px-3 py-1 font-medium text-indigo-700">Marks: {currentQuestion.marks}</span>
        </div>

        <h3 className="mt-4 text-xl font-semibold text-slate-900">{currentQuestion.question_text}</h3>

        <div className="mt-5 space-y-3">
          {currentQuestion.options.map((option) => (
            <label
              key={option.option_id}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/50"
            >
              <input
                type="radio"
                name={`question-${currentQuestion.question_id}`}
                checked={Number(answers[currentQuestion.question_id]) === Number(option.option_id)}
                onChange={() => handleSelectOption(currentQuestion.question_id, option.option_id)}
                className="h-4 w-4 accent-indigo-600"
              />
              <span>{option.option_text}</span>
            </label>
          ))}
        </div>

        {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
            disabled={index === 0}
          >
            Previous
          </button>

          {index < questions.length - 1 ? (
            <button
              className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(59,130,246,0.35)] transition hover:scale-[1.02] hover:from-blue-700 hover:to-violet-700"
              onClick={() => setIndex((prev) => Math.min(prev + 1, questions.length - 1))}
            >
              Next
            </button>
          ) : (
            <button
              className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(59,130,246,0.35)] transition hover:scale-[1.02] hover:from-blue-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Test'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TestPage;
