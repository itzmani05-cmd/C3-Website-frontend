import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import { LoadingState } from './components/ui/Spinner';
import type { Role } from './types/models';

// Admins and students each download only their own screens; the login page ships without either.
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const TestArea = lazy(() => import('./pages/TestArea'));

export default function App() {
  // Read the saved login on the very first render. Starting as "logged out" bounced every refresh through /login,
  // which dropped the address's query string (selected tab, topic, filters, page).
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!(localStorage.getItem('token') && localStorage.getItem('role')));
  const [userRole, setUserRole] = useState<Role>(() => (localStorage.getItem('role') as Role | null) ?? 'student');
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
    <Suspense fallback={<LoadingState message="Loading..." />}>
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
    </Suspense>
  );
}
