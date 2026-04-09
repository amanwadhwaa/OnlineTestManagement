import React from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUserRole, normalizeRole } from '../services/auth';

function ProtectedRoute({ children, allowedRoles = [], redirectTo = '/dashboard' }) {
  const token = localStorage.getItem('token');
  const role = getCurrentUserRole();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0) {
    const normalizedAllowedRoles = allowedRoles.map((allowedRole) => normalizeRole(allowedRole));

    if (!normalizedAllowedRoles.includes(normalizeRole(role))) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
