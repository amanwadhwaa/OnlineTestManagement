import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TestPage from './pages/TestPage';
import ResultPage from './pages/ResultPage';
import { ROLES } from './services/auth';

function AppContent() {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isWorkspacePage =
    location.pathname === '/dashboard' ||
    location.pathname.startsWith('/test/') ||
    location.pathname.startsWith('/result/');

  return (
    <div className="app-shell">
      {!isWorkspacePage && !isAuthPage && <Navbar />}
      <main className={`app-main ${isAuthPage || isWorkspacePage ? 'app-main-full' : ''}`}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test/:test_id"
            element={
              <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
                <TestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/result/:attempt_id"
            element={
              <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
                <ResultPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
