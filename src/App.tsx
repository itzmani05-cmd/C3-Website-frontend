import { lazy, Suspense, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import { LoadingState } from './components/ui/Spinner';
import type { Role } from './types/models';

// Admins and students each download only their own screens; the login page ships without either.
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const TestArea = lazy(() => import('./pages/TestArea'));
const prefetchHome = (role: Role) => void (role === 'admin' ? import('./pages/AdminPanel') : import('./pages/TestArea'));

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
    prefetchHome(role);
    navigate(role === 'admin' ? '/admin' : '/');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setIsLoggedIn(false);
    setUserRole('student');
    navigate('/login');
  };

  const homePath = userRole === 'admin' ? '/admin' : '/';
  // One guard for every protected route: logged-out users go to /login, and the wrong role goes back to its own home.
  const guard = (role: 'admin' | 'student', element: ReactElement) =>
    !isLoggedIn ? <Navigate to="/login" replace /> : (userRole === 'admin') !== (role === 'admin') ? <Navigate to={homePath} replace /> : element;
  const studentArea = guard('student', <TestArea onLogout={handleLogout} />);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={!isLoggedIn ? <Login onLogin={handleLogin} /> : <Navigate to={homePath} replace />} />
        <Route path="/admin/*" element={guard('admin', <AdminPanel onLogout={handleLogout} />)} />
        <Route path="/" element={studentArea} />
        <Route path="/:studentEmail/:testId" element={studentArea} />
        <Route path="/:studentEmail/:testId/result" element={studentArea} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

/** Shown while a route's code downloads: a page-shaped skeleton in place of a bare "Loading..." line. */
function RouteFallback() {
  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-8">
      <LoadingState message="Loading..." variant="page" />
    </div>
  );
}
