import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api, { getApiErrorMessage } from '../services/api';

function ResultPage() {
  const { attempt_id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState(location.state?.result || null);
  const [loading, setLoading] = useState(!location.state?.result);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function fetchResult() {
      if (result) return;

      try {
        setLoading(true);
        setError('');

        const response = await api.get(`/test/result/${attempt_id}`);
        if (mounted) {
          setResult(response?.data?.data || null);
        }
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err, 'Could not load result.'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchResult();
    return () => {
      mounted = false;
    };
  }, [attempt_id, result]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-76px)] bg-gradient-to-br from-sky-100 via-indigo-100 to-purple-100 px-4 py-8">
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/60 bg-white/80 p-5 text-slate-700 shadow-sm">Loading result...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-76px)] bg-gradient-to-br from-sky-100 via-indigo-100 to-purple-100 px-4 py-8">
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm">{error}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-[calc(100vh-76px)] bg-gradient-to-br from-sky-100 via-indigo-100 to-purple-100 px-4 py-8">
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/60 bg-white/80 p-5 text-slate-700 shadow-sm">No result found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-76px)] bg-gradient-to-br from-sky-100 via-indigo-100 to-purple-100 px-4 py-8">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/60 bg-white/85 p-6 shadow-[0_14px_36px_rgba(30,41,59,0.12)] backdrop-blur-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Test Result</h1>
        <p className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-slate-800">
          <strong>Score:</strong> {result.score} / {result.total_marks ?? 0}
        </p>
        <p className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-slate-800">
          <strong>Correct Answers:</strong> {result.correct_answers}
        </p>
        <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-slate-800">
          <strong>Wrong Answers:</strong> {result.wrong_answers}
        </p>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mt-6 w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(59,130,246,0.35)] transition hover:from-blue-700 hover:to-violet-700"
        >
          Back To Dashboard
        </button>
      </div>
    </div>
  );
}

export default ResultPage;
