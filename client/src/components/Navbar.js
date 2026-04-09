import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUserRole, getRoleLabel } from '../services/auth';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const role = getCurrentUserRole() || 'guest';
  const roleLabel = getRoleLabel(role) || 'Guest';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user_id');
    navigate('/login');
  };

  if (location.pathname === '/login') {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/dashboard" className="brand-link">
          Online Test System
        </Link>
      </div>
      <div className="navbar-right">
        {token && <span className="role-badge">Role: {roleLabel}</span>}
        {token ? (
          <button className="btn btn-outline" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <Link to="/login" className="btn btn-outline">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
