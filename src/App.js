import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import TestArea from './pages/TestArea';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('student');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role) {
      setIsLoggedIn(true);
      setUserRole(role);
      if (location.pathname === '/login') {
        if (role === 'admin') navigate('/admin');
        else navigate('/');
      }
    } else {
      if (location.pathname !== '/login') {
        navigate('/login');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, location.pathname]);

  const handleLogin = (token, role) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    setIsLoggedIn(true);
    setUserRole(role);
    if (role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsLoggedIn(false);
    setUserRole('');
    navigate('/login');
  };

  return (
    <div className="App">
      <Routes>
        {/* Public Login Route */}
        <Route 
          path="/login" 
          element={
            !isLoggedIn ? (
              <Login onLogin={handleLogin} />
            ) : userRole === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* Admin Route */}
        <Route 
          path="/admin/*" 
          element={
            isLoggedIn && userRole === 'admin' ? (
              <AdminPanel onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Student Exam Routes */}
        <Route 
          path="/" 
          element={
            isLoggedIn && userRole !== 'admin' ? (
              <TestArea onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/:studentEmail/:testId" 
          element={
            isLoggedIn && userRole !== 'admin' ? (
              <TestArea onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/:studentEmail/:testId/result" 
          element={
            isLoggedIn && userRole !== 'admin' ? (
              <TestArea onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App;
