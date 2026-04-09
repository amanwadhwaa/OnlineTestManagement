import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getApiErrorMessage } from '../services/api';
import { ROLES, getRoleLabel } from '../services/auth';

const ROLE_OPTIONS = [
  { value: ROLES.STUDENT, label: getRoleLabel(ROLES.STUDENT) },
  { value: ROLES.INSTRUCTOR, label: getRoleLabel(ROLES.INSTRUCTOR) },
  { value: ROLES.TEACHING_ASST, label: getRoleLabel(ROLES.TEACHING_ASST) },
  { value: ROLES.ADMIN, label: getRoleLabel(ROLES.ADMIN) },
];

function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [assignedInstructor, setAssignedInstructor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        name,
        email,
        password,
        role,
      };

      if (role === ROLES.TEACHING_ASST && assignedInstructor.trim()) {
        payload.assigned_instructor = assignedInstructor.trim();
      }

      await api.post('/auth/register', payload);

      setSuccess('Registration successful. Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-8 shadow-[0_20px_60px_rgba(30,41,59,0.45)] backdrop-blur-xl">
        <p className="inline-flex rounded-full border border-blue-300/30 bg-blue-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
          Online Test System
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Create account</h1>
        <p className="mt-2 text-sm text-slate-300">Register to access the platform.</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <label htmlFor="name" className="block text-sm font-medium text-slate-200">
            Name
          </label>
          <input
            id="name"
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 transition focus:border-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-400/30"
            required
          />

          <label htmlFor="email" className="block text-sm font-medium text-slate-200">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 transition focus:border-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-400/30"
            required
          />

          <label htmlFor="password" className="block text-sm font-medium text-slate-200">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Create password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 transition focus:border-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-400/30"
            required
          />

          <label htmlFor="role" className="block text-sm font-medium text-slate-200">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white transition focus:border-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-400/30"
            required
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                {option.label}
              </option>
            ))}
          </select>

          {role === ROLES.TEACHING_ASST && (
            <>
              <label htmlFor="assigned_instructor" className="block text-sm font-medium text-slate-200">
                Assigned Instructor ID
              </label>
              <input
                id="assigned_instructor"
                type="text"
                placeholder="Instructor user_id"
                value={assignedInstructor}
                onChange={(event) => setAssignedInstructor(event.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-400 transition focus:border-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-400/30"
                required
              />
            </>
          )}

          {error && (
            <div className="rounded-xl border border-rose-300/40 bg-rose-500/20 px-3 py-2 text-sm text-rose-100">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-300/40 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-100">
              {success}
            </div>
          )}

          <button
            className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(59,130,246,0.35)] transition duration-200 hover:scale-[1.02] hover:from-blue-700 hover:to-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-300">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-blue-300 hover:text-blue-200">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
