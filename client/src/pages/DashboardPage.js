import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getApiErrorMessage } from '../services/api';
import { ROLES, getCurrentUserRole, getRoleCapabilities, getRoleLabel } from '../services/auth';

function emptyOption() {
  return { option_text: '', is_correct: false };
}

function formatDateTime(value) {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function DashboardPage() {
  const navigate = useNavigate();
  const role = getCurrentUserRole() || ROLES.STUDENT;
  const capabilities = getRoleCapabilities(role);
  const roleLabel = getRoleLabel(role);
  const userId = localStorage.getItem('user_id') || 'N/A';

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [questionBanks, setQuestionBanks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [bankQuestions, setBankQuestions] = useState([]);
  const [availableTests, setAvailableTests] = useState([]);
  const [courseTests, setCourseTests] = useState([]);
  const [testDetails, setTestDetails] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [studentPerformance, setStudentPerformance] = useState(null);
  const [testStats, setTestStats] = useState(null);
  const [myResults, setMyResults] = useState([]);
  const [myResultsLoading, setMyResultsLoading] = useState(false);
  const [myResultsMessage, setMyResultsMessage] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [allTests, setAllTests] = useState([]);
  const [reports, setReports] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [reportForm, setReportForm] = useState({ report_type: 'issue', title: '', description: '' });
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportMessage, setReportMessage] = useState('');

  const [courseForm, setCourseForm] = useState({ course_name: '', course_code: '' });
  const [courseSaving, setCourseSaving] = useState(false);
  const [courseMessage, setCourseMessage] = useState('');

  const [bankForm, setBankForm] = useState({ title: '', description: '' });
  const [bankSaving, setBankSaving] = useState(false);
  const [bankMessage, setBankMessage] = useState('');

  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    difficulty_level: 'easy',
    marks: 1,
    correctIndex: 0,
    options: [emptyOption(), emptyOption(), emptyOption(), emptyOption()],
  });
  const [questionSaving, setQuestionSaving] = useState(false);
  const [questionMessage, setQuestionMessage] = useState('');

  const [testForm, setTestForm] = useState({
    title: '',
    total_marks: '',
    duration: '',
    start_time: '',
    end_time: '',
    selectedBankIds: [],
  });
  const [testSaving, setTestSaving] = useState(false);
  const [testMessage, setTestMessage] = useState('');

  const [analyticsForm, setAnalyticsForm] = useState({ test_id: '', student_id: '' });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsMessage, setAnalyticsMessage] = useState('');

  const canAccessAcademicViews = capabilities.canCreateTests || capabilities.canViewReadOnly;

  const selectedCourse = useMemo(
    () => courses.find((course) => String(course.course_id) === String(selectedCourseId)) || null,
    [courses, selectedCourseId]
  );

  const selectedBank = useMemo(
    () => questionBanks.find((bank) => String(bank.bank_id) === String(selectedBankId)) || null,
    [questionBanks, selectedBankId]
  );

  const clearAnalytics = () => {
    setTestDetails(null);
    setLeaderboard([]);
    setGlobalLeaderboard([]);
    setStudentPerformance(null);
    setTestStats(null);
    setAnalyticsMessage('');
  };

  const loadCourses = async () => {
    const response = await api.get('/course');
    const nextCourses = response?.data?.data || [];
    setCourses(nextCourses);

    if (!selectedCourseId && nextCourses.length > 0) {
      setSelectedCourseId(String(nextCourses[0].course_id));
    }
  };

  const loadQuestionBanks = async (courseId) => {
    if (!courseId) {
      setQuestionBanks([]);
      setSelectedBankId('');
      return;
    }

    const response = await api.get(`/question-bank/${courseId}`);
    const nextBanks = response?.data?.data || [];
    setQuestionBanks(nextBanks);

    if (nextBanks.length > 0) {
      setSelectedBankId((currentValue) => {
        if (currentValue && nextBanks.some((bank) => String(bank.bank_id) === String(currentValue))) {
          return currentValue;
        }

        return String(nextBanks[0].bank_id);
      });
    } else {
      setSelectedBankId('');
      setBankQuestions([]);
    }
  };

  const loadQuestions = async (bankId) => {
    if (!bankId) {
      setBankQuestions([]);
      return;
    }

    const response = await api.get(`/questions/by-bank/${bankId}`);
    setBankQuestions(response?.data?.data || []);
  };

  const loadCourseTests = async (courseId) => {
    if (!courseId || !canAccessAcademicViews) {
      setCourseTests([]);
      return;
    }

    const response = await api.get(`/test/${courseId}`);
    setCourseTests(response?.data?.data || []);
  };

  const loadAvailableTests = async () => {
    const response = await api.get('/test/available');
    setAvailableTests(response?.data?.data || []);
  };

  const loadMyResults = async () => {
    if (!capabilities.canAttemptTests || !userId || userId === 'N/A') {
      setMyResults([]);
      return;
    }

    setMyResultsLoading(true);
    setMyResultsMessage('');

    try {
      const response = await api.get(`/analytics/student/${userId}`);
      setMyResults(response?.data?.data?.attempts || []);
    } catch (err) {
      setMyResultsMessage(getApiErrorMessage(err, 'Could not load your test results.'));
      setMyResults([]);
    } finally {
      setMyResultsLoading(false);
    }
  };

  const loadAllUsers = async () => {
    if (!capabilities.canAdminUsers) {
      setAllUsers([]);
      return;
    }

    const response = await api.get('/auth/users');
    setAllUsers(response?.data?.data || []);
  };

  const loadAllTests = async () => {
    if (!capabilities.canAdminTests) {
      setAllTests([]);
      return;
    }

    const response = await api.get('/test/all');
    setAllTests(response?.data?.data || []);
  };

  const loadGlobalLeaderboard = async () => {
    if (!capabilities.canViewStudentResults) {
      setGlobalLeaderboard([]);
      return;
    }

    const response = await api.get('/analytics/leaderboard-global');
    setGlobalLeaderboard(response?.data?.data?.leaderboard || []);
  };

  const loadAllReports = async () => {
    if (!capabilities.canManageReports) {
      setReports([]);
      return;
    }

    const response = await api.get('/report');
    setReports(response?.data?.data || []);
  };

  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      try {
        setLoading(true);
        setError('');

        const initialTasks = [loadCourses(), loadAvailableTests()];

        if (capabilities.canAttemptTests) {
          initialTasks.push(loadMyResults());
        }

        if (capabilities.canAdminUsers) {
          initialTasks.push(loadAllUsers());
        }

        if (capabilities.canAdminTests) {
          initialTasks.push(loadAllTests());
        }

        if (capabilities.canViewStudentResults) {
          initialTasks.push(loadGlobalLeaderboard());
        }

        if (capabilities.canManageReports) {
          initialTasks.push(loadAllReports());
        }

        await Promise.all(initialTasks);

        if (mounted) {
          setError('');
        }
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err, 'Could not load dashboard data.'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capabilities.canAttemptTests, capabilities.canAdminUsers, capabilities.canAdminTests, capabilities.canViewStudentResults, capabilities.canManageReports]);

  useEffect(() => {
    let mounted = true;

    async function refreshCourseData() {
      if (!selectedCourseId) {
        return;
      }

      try {
        setError('');
        await Promise.all([loadQuestionBanks(selectedCourseId), loadCourseTests(selectedCourseId)]);
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err, 'Could not load course data.'));
        }
      }
    }

    refreshCourseData();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId, canAccessAcademicViews]);

  useEffect(() => {
    let mounted = true;

    async function refreshQuestions() {
      if (!selectedBankId) {
        setBankQuestions([]);
        return;
      }

      try {
        await loadQuestions(selectedBankId);
      } catch (err) {
        if (mounted) {
          setError(getApiErrorMessage(err, 'Could not load questions.'));
        }
      }
    }

    refreshQuestions();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBankId]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user_id');
    navigate('/login');
  };

  const handleDeleteUser = async (targetUserId) => {
    try {
      setAdminLoading(true);
      setAdminMessage('');
      await api.delete(`/auth/users/${targetUserId}`);
      setAdminMessage('User deleted successfully.');
      await loadAllUsers();
    } catch (err) {
      setAdminMessage(getApiErrorMessage(err, 'Failed to delete user.'));
    } finally {
      setAdminLoading(false);
    }
  };

  const handlePromoteUser = async (targetUserId) => {
    try {
      setAdminLoading(true);
      setAdminMessage('');
      await api.patch(`/auth/users/${targetUserId}/promote`, {});
      setAdminMessage('User promoted to instructor successfully.');
      await loadAllUsers();
    } catch (err) {
      setAdminMessage(getApiErrorMessage(err, 'Failed to promote user.'));
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDeleteTest = async (targetTestId) => {
    try {
      setAdminLoading(true);
      setAdminMessage('');
      await api.delete(`/test/${targetTestId}`);
      setAdminMessage('Test deleted successfully.');
      await loadAllTests();
      await loadAvailableTests();
    } catch (err) {
      setAdminMessage(getApiErrorMessage(err, 'Failed to delete test.'));
    } finally {
      setAdminLoading(false);
    }
  };

  const handleSubmitReport = async (event) => {
    event.preventDefault();
    setReportSubmitting(true);
    setReportMessage('');

    try {
      await api.post('/report', {
        report_type: reportForm.report_type,
        title: reportForm.title,
        description: reportForm.description,
      });

      setReportMessage('Report submitted successfully.');
      setReportForm({ report_type: 'issue', title: '', description: '' });
    } catch (err) {
      setReportMessage(getApiErrorMessage(err, 'Failed to submit report.'));
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleMarkReportResolved = async (reportId) => {
    try {
      setAdminLoading(true);
      setAdminMessage('');
      await api.put(`/report/${reportId}`, {});
      setAdminMessage('Report marked as resolved.');
      await loadAllReports();
    } catch (err) {
      setAdminMessage(getApiErrorMessage(err, 'Failed to update report status.'));
    } finally {
      setAdminLoading(false);
    }
  };

  const handleCreateCourse = async (event) => {
    event.preventDefault();
    setCourseMessage('');
    setCourseSaving(true);

    try {
      await api.post('/course', courseForm);
      setCourseForm({ course_name: '', course_code: '' });
      setCourseMessage('Course created successfully.');
      await loadCourses();
    } catch (err) {
      setCourseMessage(getApiErrorMessage(err, 'Failed to create course.'));
    } finally {
      setCourseSaving(false);
    }
  };

  const handleCreateQuestionBank = async (event) => {
    event.preventDefault();
    setBankMessage('');
    setBankSaving(true);

    try {
      await api.post('/question-bank', {
        course_id: Number(selectedCourseId),
        ...bankForm,
      });

      setBankForm({ title: '', description: '' });
      setBankMessage('Question bank created successfully.');
      await loadQuestionBanks(selectedCourseId);
    } catch (err) {
      setBankMessage(getApiErrorMessage(err, 'Failed to create question bank.'));
    } finally {
      setBankSaving(false);
    }
  };

  const handleOptionChange = (index, value) => {
    setQuestionForm((currentValue) => {
      const nextOptions = [...currentValue.options];
      nextOptions[index] = {
        ...nextOptions[index],
        option_text: value,
      };

      return {
        ...currentValue,
        options: nextOptions,
      };
    });
  };

  const handleCreateQuestion = async (event) => {
    event.preventDefault();
    setQuestionMessage('');
    setQuestionSaving(true);

    try {
      const options = questionForm.options.map((option, index) => ({
        option_text: option.option_text.trim(),
        is_correct: index === Number(questionForm.correctIndex),
      }));

      await api.post('/question', {
        bank_id: Number(selectedBankId),
        question_text: questionForm.question_text,
        difficulty_level: questionForm.difficulty_level,
        marks: Number(questionForm.marks),
        options,
      });

      setQuestionForm({
        question_text: '',
        difficulty_level: 'easy',
        marks: 1,
        correctIndex: 0,
        options: [emptyOption(), emptyOption(), emptyOption(), emptyOption()],
      });
      setQuestionMessage('Question added successfully.');
      await loadQuestions(selectedBankId);
    } catch (err) {
      setQuestionMessage(getApiErrorMessage(err, 'Failed to create question.'));
    } finally {
      setQuestionSaving(false);
    }
  };

  const handleBankSelection = (bankId) => {
    setTestForm((currentValue) => {
      const bankIdText = String(bankId);
      const selectedBankIds = currentValue.selectedBankIds.includes(bankIdText)
        ? currentValue.selectedBankIds.filter((value) => value !== bankIdText)
        : [...currentValue.selectedBankIds, bankIdText];

      return {
        ...currentValue,
        selectedBankIds,
      };
    });
  };

  const handleCreateTest = async (event) => {
    event.preventDefault();
    setTestMessage('');
    setTestSaving(true);

    try {
      await api.post('/test', {
        course_id: Number(selectedCourseId),
        title: testForm.title,
        total_marks: Number(testForm.total_marks),
        duration: Number(testForm.duration),
        start_time: testForm.start_time,
        end_time: testForm.end_time,
        bank_ids: testForm.selectedBankIds.map((value) => Number(value)),
      });

      setTestForm({
        title: '',
        total_marks: '',
        duration: '',
        start_time: '',
        end_time: '',
        selectedBankIds: [],
      });
      setTestMessage('Test created successfully.');
      await loadCourseTests(selectedCourseId);
      await loadAvailableTests();
    } catch (err) {
      setTestMessage(getApiErrorMessage(err, 'Failed to create test.'));
    } finally {
      setTestSaving(false);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsMessage('');
    clearAnalytics();

    try {
      if (analyticsForm.test_id) {
        const [statsResponse, leaderboardResponse, detailsResponse] = await Promise.all([
          api.get(`/analytics/test/${analyticsForm.test_id}`),
          api.get(`/analytics/leaderboard/${analyticsForm.test_id}`),
          api.get(`/test/details/${analyticsForm.test_id}`),
        ]);

        setTestStats(statsResponse?.data?.data || null);
        setLeaderboard(leaderboardResponse?.data?.data?.leaderboard || []);
        setTestDetails(detailsResponse?.data?.data || null);
      }

      if (analyticsForm.student_id) {
        const studentResponse = await api.get(`/analytics/student/${analyticsForm.student_id}`);
        setStudentPerformance(studentResponse?.data?.data || null);
      }

      if (!analyticsForm.test_id && !analyticsForm.student_id) {
        setAnalyticsMessage('Enter a test ID or student ID to load analytics.');
      }
    } catch (err) {
      setAnalyticsMessage(getApiErrorMessage(err, 'Could not load analytics.'));
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const canAttemptTests = capabilities.canAttemptTests;

  const renderFeedback = (message, tone = 'default') => {
    if (!message) {
      return null;
    }

    const toneClass = tone === 'error'
      ? 'border-rose-300/40 bg-rose-500/20 text-rose-100'
      : tone === 'success'
        ? 'border-emerald-300/40 bg-emerald-500/20 text-emerald-100'
        : 'border-white/20 bg-white/10 text-slate-100';

    return <div className={`rounded-xl border px-3 py-2 text-sm ${toneClass}`}>{message}</div>;
  };

  const renderTestCard = (test) => {
    const isActive = canAttemptTests && role !== ROLES.INSTRUCTOR && role !== ROLES.TEACHING_ASST;

    return (
      <div key={test.test_id} className="rounded-xl border border-white/20 bg-white/10 p-5 text-slate-100 backdrop-blur">
        <h3 className="text-lg font-semibold text-white">{test.title}</h3>
        <p className="mt-2 text-sm text-slate-300">Test ID: {test.test_id}</p>
        <p className="mt-2 text-sm text-slate-300">Course ID: {test.course_id}</p>
        <p className="text-sm text-slate-300">Duration: {test.duration} minutes</p>
        <p className="text-sm text-slate-300">Total Marks: {test.total_marks}</p>
        <p className="text-sm text-slate-300">
          {formatDateTime(test.start_time)} to {formatDateTime(test.end_time)}
        </p>

        {isActive ? (
          <button
            type="button"
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] hover:from-blue-600 hover:to-violet-600"
            onClick={() => navigate(`/test/${test.test_id}`)}
          >
            Start Test
          </button>
        ) : (
          <div className="mt-4 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-blue-200">
            View Only
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <div className="rounded-xl border border-white/20 bg-white/10 p-5 text-slate-200 backdrop-blur">Loading dashboard...</div>;
    }

    if (error) {
      return <div className="rounded-xl border border-rose-300/40 bg-rose-500/20 p-5 text-rose-100 backdrop-blur">{error}</div>;
    }

    if (activeTab === 'overview') {
      return (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-blue-200">Role</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{roleLabel}</h3>
              <p className="mt-2 text-sm text-slate-300">User ID: {userId}</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-blue-200">Courses</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{courses.length}</h3>
              <p className="mt-2 text-sm text-slate-300">Available course records</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-blue-200">Live Tests</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{availableTests.length}</h3>
              <p className="mt-2 text-sm text-slate-300">Tests currently open for attempts</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/10 p-5 text-slate-100 backdrop-blur">
            <h3 className="text-lg font-semibold text-white">Current Context</h3>
            <p className="mt-2 text-sm text-slate-300">
              {selectedCourse ? `Selected course: ${selectedCourse.course_name} (${selectedCourse.course_code})` : 'No course selected.'}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {selectedBank ? `Selected question bank: ${selectedBank.title}` : 'No question bank selected.'}
            </p>
          </div>

          {canAttemptTests ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{availableTests.map(renderTestCard)}</div>
          ) : (
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 text-slate-200 backdrop-blur">
              Use the sections below to create courses, banks, questions, and tests.
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'courses') {
      return (
        <div className="space-y-4">
          {capabilities.canCreateCourses && (
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <h3 className="text-lg font-semibold text-white">Create Course</h3>
              <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={handleCreateCourse}>
                <input
                  type="text"
                  placeholder="course_name"
                  value={courseForm.course_name}
                  onChange={(event) => setCourseForm((currentValue) => ({ ...currentValue, course_name: event.target.value }))}
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-300 focus:outline-none"
                  required
                />
                <input
                  type="text"
                  placeholder="course_code"
                  value={courseForm.course_code}
                  onChange={(event) => setCourseForm((currentValue) => ({ ...currentValue, course_code: event.target.value }))}
                  className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-300 focus:outline-none"
                  required
                />
                <div className="sm:col-span-2">
                  {renderFeedback(courseMessage, courseMessage.includes('successfully') ? 'success' : 'error')}
                  <button
                    type="submit"
                    className="mt-3 w-full rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-blue-600 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={courseSaving}
                  >
                    {courseSaving ? 'Saving...' : 'Create Course'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <button
                key={course.course_id}
                type="button"
                onClick={() => setSelectedCourseId(String(course.course_id))}
                className={`rounded-xl border p-5 text-left backdrop-blur transition ${
                  String(course.course_id) === String(selectedCourseId)
                    ? 'border-blue-300 bg-blue-500/20 text-white'
                    : 'border-white/20 bg-white/10 text-slate-100 hover:bg-white/15'
                }`}
              >
                <h4 className="text-lg font-semibold">{course.course_name}</h4>
                <p className="mt-2 text-sm text-slate-300">Code: {course.course_code}</p>
                <p className="text-sm text-slate-300">ID: {course.course_id}</p>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'banks') {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur">
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-300 focus:outline-none"
              >
                <option value="" className="bg-slate-900 text-white">
                  Select course
                </option>
                {courses.map((course) => (
                  <option key={course.course_id} value={course.course_id} className="bg-slate-900 text-white">
                    {course.course_name} ({course.course_code})
                  </option>
                ))}
              </select>

              {capabilities.canCreateQuestionBanks && (
                <form onSubmit={handleCreateQuestionBank} className="grid gap-3 sm:col-span-1">
                  <input
                    type="text"
                    placeholder="title"
                    value={bankForm.title}
                    onChange={(event) => setBankForm((currentValue) => ({ ...currentValue, title: event.target.value }))}
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-300 focus:outline-none"
                    required
                  />
                  <textarea
                    placeholder="description"
                    value={bankForm.description}
                    onChange={(event) => setBankForm((currentValue) => ({ ...currentValue, description: event.target.value }))}
                    className="min-h-28 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-300 focus:outline-none"
                    required
                  />
                  {renderFeedback(bankMessage, bankMessage.includes('successfully') ? 'success' : 'error')}
                  <button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-blue-600 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={bankSaving || !selectedCourseId}
                  >
                    {bankSaving ? 'Saving...' : 'Create Question Bank'}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {questionBanks.map((bank) => (
              <button
                key={bank.bank_id}
                type="button"
                onClick={() => setSelectedBankId(String(bank.bank_id))}
                className={`rounded-xl border p-5 text-left backdrop-blur transition ${
                  String(bank.bank_id) === String(selectedBankId)
                    ? 'border-blue-300 bg-blue-500/20 text-white'
                    : 'border-white/20 bg-white/10 text-slate-100 hover:bg-white/15'
                }`}
              >
                <h4 className="text-lg font-semibold">{bank.title}</h4>
                <p className="mt-2 text-sm text-slate-300">Bank ID: {bank.bank_id}</p>
                <p className="text-sm text-slate-300">Course ID: {bank.course_id}</p>
                <p className="mt-2 text-sm text-slate-300">{bank.description}</p>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'questions') {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur">
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={selectedBankId}
                onChange={(event) => setSelectedBankId(event.target.value)}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-300 focus:outline-none"
              >
                <option value="" className="bg-slate-900 text-white">
                  Select question bank
                </option>
                {questionBanks.map((bank) => (
                  <option key={bank.bank_id} value={bank.bank_id} className="bg-slate-900 text-white">
                    {bank.title}
                  </option>
                ))}
              </select>

              {capabilities.canAddQuestions && (
                <form onSubmit={handleCreateQuestion} className="grid gap-3 md:col-span-2">
                <textarea
                  placeholder="question_text"
                  value={questionForm.question_text}
                  onChange={(event) => setQuestionForm((currentValue) => ({ ...currentValue, question_text: event.target.value }))}
                  className="min-h-24 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-300 focus:outline-none"
                  required
                />

                <div className="grid gap-3 sm:grid-cols-3">
                  <select
                    value={questionForm.difficulty_level}
                    onChange={(event) => setQuestionForm((currentValue) => ({ ...currentValue, difficulty_level: event.target.value }))}
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-300 focus:outline-none"
                  >
                    <option value="easy" className="bg-slate-900 text-white">
                      easy
                    </option>
                    <option value="medium" className="bg-slate-900 text-white">
                      medium
                    </option>
                    <option value="hard" className="bg-slate-900 text-white">
                      hard
                    </option>
                  </select>

                  <input
                    type="number"
                    min="1"
                    placeholder="marks"
                    value={questionForm.marks}
                    onChange={(event) => setQuestionForm((currentValue) => ({ ...currentValue, marks: event.target.value }))}
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-300 focus:outline-none"
                    required
                  />

                  <select
                    value={questionForm.correctIndex}
                    onChange={(event) => setQuestionForm((currentValue) => ({ ...currentValue, correctIndex: event.target.value }))}
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-300 focus:outline-none"
                  >
                    <option value={0} className="bg-slate-900 text-white">
                      Correct option 1
                    </option>
                    <option value={1} className="bg-slate-900 text-white">
                      Correct option 2
                    </option>
                    <option value={2} className="bg-slate-900 text-white">
                      Correct option 3
                    </option>
                    <option value={3} className="bg-slate-900 text-white">
                      Correct option 4
                    </option>
                  </select>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {questionForm.options.map((option, index) => (
                    <input
                      key={index}
                      type="text"
                      placeholder={`Option ${index + 1}`}
                      value={option.option_text}
                      onChange={(event) => handleOptionChange(index, event.target.value)}
                      className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-300 focus:outline-none"
                      required
                    />
                  ))}
                </div>

                {renderFeedback(questionMessage, questionMessage.includes('successfully') ? 'success' : 'error')}

                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-blue-600 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={questionSaving || !selectedBankId}
                >
                  {questionSaving ? 'Saving...' : 'Add Question'}
                </button>
                </form>
              )}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {bankQuestions.map((question) => (
              <div key={question.question_id} className="rounded-xl border border-white/20 bg-white/10 p-5 text-slate-100 backdrop-blur">
                <h4 className="text-lg font-semibold text-white">{question.question_text}</h4>
                <p className="mt-2 text-sm text-slate-300">Difficulty: {question.difficulty_level}</p>
                <p className="text-sm text-slate-300">Marks: {question.marks}</p>
                <div className="mt-4 space-y-2">
                  {question.options.map((option) => (
                    <div key={option.option_id} className={`rounded-xl border px-3 py-2 text-sm ${option.is_correct ? 'border-emerald-300/50 bg-emerald-500/20' : 'border-white/20 bg-white/10'}`}>
                      {option.option_text} {option.is_correct ? '(correct)' : ''}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'tests') {
      return (
        <div className="space-y-4">
          {capabilities.canCreateTests && (
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <h3 className="text-lg font-semibold text-white">Create Test</h3>
              <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleCreateTest}>
              <select
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-300 focus:outline-none"
                required
              >
                <option value="" className="bg-slate-900 text-white">
                  Select course
                </option>
                {courses.map((course) => (
                  <option key={course.course_id} value={course.course_id} className="bg-slate-900 text-white">
                    {course.course_name} ({course.course_code})
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="title"
                value={testForm.title}
                onChange={(event) => setTestForm((currentValue) => ({ ...currentValue, title: event.target.value }))}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-300 focus:outline-none"
                required
              />

              <input
                type="number"
                placeholder="total_marks"
                value={testForm.total_marks}
                onChange={(event) => setTestForm((currentValue) => ({ ...currentValue, total_marks: event.target.value }))}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-300 focus:outline-none"
                required
              />

              <input
                type="number"
                placeholder="duration (minutes)"
                value={testForm.duration}
                onChange={(event) => setTestForm((currentValue) => ({ ...currentValue, duration: event.target.value }))}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-300 focus:outline-none"
                required
              />

              <input
                type="datetime-local"
                value={testForm.start_time}
                onChange={(event) => setTestForm((currentValue) => ({ ...currentValue, start_time: event.target.value }))}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-300 focus:outline-none"
                required
              />

              <input
                type="datetime-local"
                value={testForm.end_time}
                onChange={(event) => setTestForm((currentValue) => ({ ...currentValue, end_time: event.target.value }))}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-300 focus:outline-none"
                required
              />

              <div className="md:col-span-2 rounded-xl border border-white/20 bg-white/5 p-4">
                <p className="text-sm font-semibold text-white">Question banks to include</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {questionBanks.map((bank) => (
                    <label key={bank.bank_id} className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100">
                      <input
                        type="checkbox"
                        checked={testForm.selectedBankIds.includes(String(bank.bank_id))}
                        onChange={() => handleBankSelection(bank.bank_id)}
                        className="h-4 w-4 accent-blue-600"
                      />
                      <span>{bank.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              {renderFeedback(testMessage, testMessage.includes('successfully') ? 'success' : 'error')}

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-blue-600 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={testSaving || !selectedCourseId}
                >
                  {testSaving ? 'Saving...' : 'Create Test'}
                </button>
              </div>
              </form>
            </div>
          )}

          {canAccessAcademicViews && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {courseTests.map(renderTestCard)}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'analytics') {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur">
            <h3 className="text-lg font-semibold text-white">Analytics</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <input
                type="number"
                placeholder="test_id"
                value={analyticsForm.test_id}
                onChange={(event) => setAnalyticsForm((currentValue) => ({ ...currentValue, test_id: event.target.value }))}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-300 focus:outline-none"
              />
              <input
                type="number"
                placeholder="student_id"
                value={analyticsForm.student_id}
                onChange={(event) => setAnalyticsForm((currentValue) => ({ ...currentValue, student_id: event.target.value }))}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={loadAnalytics}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-blue-600 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={analyticsLoading}
              >
                {analyticsLoading ? 'Loading...' : 'Load Analytics'}
              </button>
            </div>
            <div className="mt-3">{renderFeedback(analyticsMessage, analyticsMessage ? 'error' : 'default')}</div>
          </div>

          {(testStats || leaderboard.length > 0 || testDetails || globalLeaderboard.length > 0) && (
            <div className="grid gap-4 xl:grid-cols-2">
              {testStats && (
                <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur">
                  <h4 className="text-lg font-semibold text-white">Test Stats</h4>
                  <p className="mt-2 text-sm text-slate-300">Test ID: {testStats.test_id}</p>
                  <p className="text-sm text-slate-300">Total attempts: {testStats.stats?.total_attempts ?? 0}</p>
                  <p className="text-sm text-slate-300">Average score: {testStats.stats?.avg_score ?? 0}</p>
                  <p className="text-sm text-slate-300">Highest score: {testStats.stats?.highest_score ?? 0}</p>
                  <p className="text-sm text-slate-300">Lowest score: {testStats.stats?.lowest_score ?? 0}</p>
                </div>
              )}

              {studentPerformance && (
                <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur">
                  <h4 className="text-lg font-semibold text-white">Student Performance</h4>
                  <p className="mt-2 text-sm text-slate-300">Student ID: {studentPerformance.student_id}</p>
                  <p className="text-sm text-slate-300">Attempts: {studentPerformance.summary?.total_attempts ?? 0}</p>
                  <p className="text-sm text-slate-300">Average score: {studentPerformance.summary?.avg_score ?? 0}</p>
                  <p className="text-sm text-slate-300">Highest score: {studentPerformance.summary?.highest_score ?? 0}</p>
                  <p className="text-sm text-slate-300">Lowest score: {studentPerformance.summary?.lowest_score ?? 0}</p>
                </div>
              )}

              {leaderboard.length > 0 && (
                <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur xl:col-span-2">
                  <h4 className="text-lg font-semibold text-white">Leaderboard</h4>
                  <div className="mt-4 space-y-2">
                    {leaderboard.map((entry, index) => (
                      <div key={entry.attempt_id} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-slate-100">
                        #{index + 1} {entry.student_name || `Student ${entry.student_id}`} - Score {entry.score}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {globalLeaderboard.length > 0 && (
                <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur xl:col-span-2">
                  <h4 className="text-lg font-semibold text-white">Global Leaderboard</h4>
                  <div className="mt-4 space-y-2">
                    {globalLeaderboard.map((entry, index) => (
                      <div key={entry.attempt_id} className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-slate-100">
                        #{index + 1} {entry.student_name || `Student ${entry.student_id}`} - {entry.test_title} - Score {entry.score}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {testDetails && (
                <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur xl:col-span-2">
                  <h4 className="text-lg font-semibold text-white">Test Details</h4>
                  <p className="mt-2 text-sm text-slate-300">Title: {testDetails.test?.title}</p>
                  <p className="text-sm text-slate-300">Banks: {testDetails.question_banks?.length || 0}</p>
                  <p className="text-sm text-slate-300">Questions: {testDetails.questions?.length || 0}</p>
                  <div className="mt-4 space-y-3">
                    {(testDetails.questions || []).map((question) => (
                      <div key={question.question_id} className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-slate-100">
                        <p className="font-semibold text-white">{question.question_text}</p>
                        <p className="text-slate-300">{question.difficulty_level} | Marks: {question.marks}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'available') {
      return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {availableTests.map(renderTestCard)}
        </div>
      );
    }

    if (activeTab === 'my-results') {
      if (myResultsLoading) {
        return <div className="rounded-xl border border-white/20 bg-white/10 p-5 text-slate-200 backdrop-blur">Loading your results...</div>;
      }

      return (
        <div className="space-y-4">
          {myResultsMessage && (
            <div className="rounded-xl border border-rose-300/40 bg-rose-500/20 p-5 text-rose-100 backdrop-blur">{myResultsMessage}</div>
          )}

          {!myResultsMessage && myResults.length === 0 && (
            <div className="rounded-xl border border-white/20 bg-white/10 p-5 text-slate-200 backdrop-blur">No test attempts found yet.</div>
          )}

          {myResults.length > 0 && (
            <div className="grid gap-4 xl:grid-cols-2">
              {myResults.map((attempt) => (
                <div key={attempt.attempt_id} className="rounded-xl border border-white/20 bg-white/10 p-5 text-slate-100 backdrop-blur">
                  <h4 className="text-lg font-semibold text-white">{attempt.test_title || `Test ${attempt.test_id}`}</h4>
                  <p className="mt-2 text-sm text-slate-300">Attempt ID: {attempt.attempt_id}</p>
                  <p className="text-sm text-slate-300">Score: {attempt.score} / {attempt.total_marks ?? 0}</p>
                  <p className="text-sm text-slate-300">Started: {formatDateTime(attempt.start_time)}</p>
                  <p className="text-sm text-slate-300">Submitted: {attempt.end_time ? formatDateTime(attempt.end_time) : 'In progress'}</p>

                  <button
                    type="button"
                    onClick={() => navigate(`/result/${attempt.attempt_id}`)}
                    className="mt-4 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-blue-600 hover:to-violet-600"
                  >
                    View Result
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'submit-report') {
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur">
            <h3 className="text-lg font-semibold text-white">Submit Report</h3>
            <form className="mt-4 space-y-3" onSubmit={handleSubmitReport}>
              <select
                value={reportForm.report_type}
                onChange={(event) => setReportForm((currentValue) => ({ ...currentValue, report_type: event.target.value }))}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white focus:border-blue-300 focus:outline-none"
                required
              >
                <option value="bug" className="bg-slate-900 text-white">Bug</option>
                <option value="complaint" className="bg-slate-900 text-white">Complaint</option>
                <option value="issue" className="bg-slate-900 text-white">Issue</option>
                <option value="feedback" className="bg-slate-900 text-white">Feedback</option>
              </select>
              <input
                type="text"
                placeholder="Title"
                value={reportForm.title}
                onChange={(event) => setReportForm((currentValue) => ({ ...currentValue, title: event.target.value }))}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-300 focus:outline-none"
                required
              />
              <textarea
                placeholder="Description"
                value={reportForm.description}
                onChange={(event) => setReportForm((currentValue) => ({ ...currentValue, description: event.target.value }))}
                className="min-h-32 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-blue-300 focus:outline-none"
                required
              />
              {renderFeedback(reportMessage, reportMessage.includes('successfully') ? 'success' : 'error')}
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-blue-600 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={reportSubmitting}
              >
                {reportSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </form>
          </div>
        </div>
      );
    }

    if (activeTab === 'admin-users') {
      return (
        <div className="space-y-4">
          {adminMessage && (
            <div className="rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-slate-100 backdrop-blur">{adminMessage}</div>
          )}

          <div className="space-y-3">
            {allUsers.map((user) => (
              <div key={user.user_id} className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                <p className="text-white font-semibold">{user.name}</p>
                <p className="text-sm text-slate-300">User ID: {user.user_id} | Role: {user.role}</p>
                <p className="text-sm text-slate-300">Email: {user.email}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {user.role === 'teaching_asst' && (
                    <button
                      type="button"
                      onClick={() => handlePromoteUser(user.user_id)}
                      className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 text-xs font-semibold text-white transition hover:from-emerald-600 hover:to-teal-600 disabled:opacity-70"
                      disabled={adminLoading}
                    >
                      Promote TA To Instructor
                    </button>
                  )}

                  {Number(user.user_id) !== Number(userId) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(user.user_id)}
                      className="rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-2 text-xs font-semibold text-white transition hover:from-rose-600 hover:to-pink-600 disabled:opacity-70"
                      disabled={adminLoading}
                    >
                      Delete User
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'admin-tests') {
      return (
        <div className="space-y-4">
          {adminMessage && (
            <div className="rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-slate-100 backdrop-blur">{adminMessage}</div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {allTests.map((test) => (
              <div key={test.test_id} className="rounded-xl border border-white/20 bg-white/10 p-5 text-slate-100 backdrop-blur">
                <h4 className="text-lg font-semibold text-white">{test.title}</h4>
                <p className="mt-2 text-sm text-slate-300">Test ID: {test.test_id}</p>
                <p className="text-sm text-slate-300">Course: {test.course_name || test.course_id}</p>
                <p className="text-sm text-slate-300">Total Marks: {test.total_marks}</p>
                <p className="text-sm text-slate-300">Duration: {test.duration} min</p>
                <p className="text-sm text-slate-300">{formatDateTime(test.start_time)} to {formatDateTime(test.end_time)}</p>

                <button
                  type="button"
                  onClick={() => handleDeleteTest(test.test_id)}
                  className="mt-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-2 text-xs font-semibold text-white transition hover:from-rose-600 hover:to-pink-600 disabled:opacity-70"
                  disabled={adminLoading}
                >
                  Delete Test
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'admin-reports') {
      return (
        <div className="space-y-4">
          {adminMessage && (
            <div className="rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-slate-100 backdrop-blur">{adminMessage}</div>
          )}

          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.report_id} className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                <p className="font-semibold text-white">{report.title}</p>
                <p className="mt-1 text-sm text-slate-300">User: {report.user_name} ({report.user_id})</p>
                <p className="text-sm text-slate-300">Role: {report.role}</p>
                <p className="text-sm text-slate-300">Type: {report.report_type}</p>
                <p className="text-sm text-slate-300">Issue: {report.description}</p>
                <p className="text-sm text-slate-300">Status: {report.status}</p>
                <p className="text-sm text-slate-300">Created: {formatDateTime(report.created_at)}</p>

                {report.status !== 'resolved' && (
                  <button
                    type="button"
                    onClick={() => handleMarkReportResolved(report.report_id)}
                    className="mt-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 text-xs font-semibold text-white transition hover:from-emerald-600 hover:to-teal-600 disabled:opacity-70"
                    disabled={adminLoading}
                  >
                    Mark As Resolved
                  </button>
                )}
              </div>
            ))}

            {reports.length === 0 && (
              <div className="rounded-xl border border-white/20 bg-white/10 p-5 text-slate-200 backdrop-blur">No reports found.</div>
            )}
          </div>
        </div>
      );
    }

    return <div className="rounded-xl border border-white/20 bg-white/10 p-5 text-slate-200 backdrop-blur">Select a section from the menu.</div>;
  };

  const menuItems = [
    { key: 'overview', label: 'Overview' },
    { key: 'available', label: 'Available Tests' },
  ];

  if (capabilities.canAttemptTests) {
    menuItems.push({ key: 'my-results', label: 'My Results' });
  }

  if (capabilities.canSubmitReport) {
    menuItems.push({ key: 'submit-report', label: 'Submit Report' });
  }

  if (canAccessAcademicViews) {
    menuItems.push({ key: 'courses', label: 'Courses' });
    menuItems.push({ key: 'banks', label: 'Question Banks' });
    menuItems.push({ key: 'questions', label: 'Questions' });
    menuItems.push({ key: 'tests', label: 'Tests' });
  }

  if (capabilities.canViewStudentResults) {
    menuItems.push({ key: 'analytics', label: 'Analytics' });
  }

  if (capabilities.canAdminUsers) {
    menuItems.push({ key: 'admin-users', label: 'Users' });
  }

  if (capabilities.canAdminTests) {
    menuItems.push({ key: 'admin-tests', label: 'All Tests' });
  }

  if (capabilities.canManageReports) {
    menuItems.push({ key: 'admin-reports', label: 'Reports' });
  }

  return (
    <div className="min-h-screen w-full text-white">
      <aside className="fixed left-0 top-0 flex h-screen w-72 flex-col border-r border-white/10 bg-slate-950 p-5">
        <div className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200">Online Test System</p>
          <h1 className="mt-1 text-xl font-semibold text-white">Control Panel</h1>
          <p className="mt-2 text-sm text-slate-300">{roleLabel}</p>
        </div>

        <nav className="mt-6 space-y-2">
          {menuItems.map((item) => {
            const isActive = activeTab === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium transition ${
                  isActive ? 'bg-white/25 text-white shadow-md' : 'bg-white/5 text-slate-200 hover:bg-white/15'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur">
          <p className="text-sm text-slate-200">User ID: {userId}</p>
          <p className="mt-1 text-sm text-blue-200">Role: {roleLabel}</p>
          <button
            type="button"
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-rose-600 hover:to-pink-600"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="ml-72 min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 p-8">
        <div className="rounded-xl border border-white/20 bg-white/10 p-5 backdrop-blur">
          <h2 className="text-2xl font-semibold text-white">
            {activeTab === 'courses'
              ? 'Courses'
              : activeTab === 'banks'
                ? 'Question Banks'
                : activeTab === 'questions'
                  ? 'Questions'
                  : activeTab === 'tests'
                    ? 'Tests'
                    : activeTab === 'analytics'
                      ? 'Analytics'
                      : activeTab === 'admin-users'
                        ? 'Users'
                        : activeTab === 'admin-tests'
                          ? 'All Tests'
                              : activeTab === 'admin-reports'
                                ? 'Reports'
                          : activeTab === 'submit-report'
                            ? 'Submit Report'
                      : activeTab === 'my-results'
                        ? 'My Results'
                      : activeTab === 'available'
                        ? 'Available Tests'
                        : 'Dashboard'}
          </h2>
          <p className="mt-1 text-sm text-slate-300">Basic controls for the online test system.</p>
        </div>

        <div className="mt-6">{renderContent()}</div>
      </main>
    </div>
  );
}

export default DashboardPage;