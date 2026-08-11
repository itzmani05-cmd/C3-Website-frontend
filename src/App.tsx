import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import TestArea from './pages/TestArea';
import type { Role } from './types/models';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<Role>('student');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role') as Role | null;
    if (token && role) {
      setIsLoggedIn(true);
      setUserRole(role);
      if (location.pathname === '/login') {
        navigate(role === 'admin' ? '/admin' : '/');
      }
    } else if (location.pathname !== '/login') {
      navigate('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, location.pathname]);

  const handleLogin = (token: string, role: Role) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    setIsLoggedIn(true);
    setUserRole(role);
    navigate(role === 'admin' ? '/admin' : '/');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsLoggedIn(false);
    setUserRole('student');
    navigate('/login');
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          !isLoggedIn ? (
            <Login onLogin={handleLogin} />
          ) : (
            <Navigate to={userRole === 'admin' ? '/admin' : '/'} replace />
          )
        }
      />

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

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
