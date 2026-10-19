import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { m } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { toast } from 'react-toastify';
import api, { SESSION_EXPIRED_FLAG } from '../api';
import { AppFooter, Spinner } from '../components/ui';
import type { Role } from '../types/models';

interface LoginProps {
  onLogin: (token: string, role: Role) => void;
}

const REMEMBER_EMAIL_KEY = 'c3_remember_email';

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved) setEmail(saved);
    if (sessionStorage.getItem(SESSION_EXPIRED_FLAG)) {
      sessionStorage.removeItem(SESSION_EXPIRED_FLAG);
      toast.info('Your session expired. Please sign in again.');
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 4) {
      toast.error('Password must be at least 4 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password, role });
      toast.success('Login successful! Redirecting...');
      localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      setTimeout(() => onLogin(res.data.token, res.data.role), 900);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  const inputClasses =
    'w-full min-h-10 rounded-md border border-slate-300 bg-white py-2 pl-10 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-600 focus:ring-3 focus:ring-brand-600/15 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <div className="flex flex-col bg-white">
      <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Brand panel (large screens) */}
        <aside className="relative hidden overflow-hidden bg-ink-900 px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:44px_44px]"
          />
          <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-brand-600/25 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <img src="/C3AppLogo-128.png" alt="" className="size-10 rounded-lg bg-white/10 object-contain p-1" />
            <div className="leading-tight">
              <p className="text-base font-semibold">C³ Institute</p>
              <p className="text-xs text-slate-400">Educational Platform</p>
            </div>
          </div>
          <div className="relative max-w-md">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">Prepare, practise and perform with confidence.</h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Mock tests, daily challenges and detailed results in one place, built for focused exam preparation.
            </p>
          </div>
          <p className="relative text-xs text-slate-500">Educational Platform</p>
        </aside>

        {/* Sign-in form */}
        <main id="main" className="flex flex-col items-center justify-center gap-6 bg-[#f4f5f7] px-4 py-10 sm:px-6 lg:bg-white">
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[400px] rounded-2xl border border-slate-200 bg-white p-6 shadow-soft-md sm:p-8 lg:border-0 lg:p-0 lg:shadow-none"
          >
            <div className="mb-8 flex items-center gap-2.5 lg:hidden">
              <img src="/C3AppLogo-128.png" alt="" className="size-9 object-contain" />
              <span className="text-base font-semibold text-slate-900">C³ Institute</span>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Access your {role === 'admin' ? 'admin console' : 'exam portal'}.
              </p>
            </div>

            <div role="tablist" aria-label="Account type" className="relative mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
              <m.div
                layout
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className="absolute inset-y-1 w-[calc(50%-4px)] rounded-md bg-white shadow-soft-sm"
                style={{ left: role === 'admin' ? 'calc(50% + 0px)' : '4px' }}
              />
              {(['student', 'admin'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={role === r}
                  onClick={() => setRole(r)}
                  className={[
                    'relative z-10 rounded-md py-2 text-sm font-medium capitalize transition-colors',
                    role === r ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700',
                  ].join(' ')}
                >
                  {r}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email address
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="size-4" />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={`you@${role === 'admin' ? 'institution' : 'student'}.com`}
                    disabled={loading}
                    required
                    className={`${inputClasses} pr-3`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="size-4" />
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={loading}
                    required
                    className={`${inputClasses} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 transition-colors hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white shadow-soft-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-65"
              >
                {loading ? (
                  <>
                    <Spinner className="size-4 text-white" /> Signing in...
                  </>
                ) : (
                  `Sign in as ${role}`
                )}
              </button>
              <p className="text-center text-xs text-slate-500">Forgot your password? Ask your institute admin to reset it.</p>
            </form>
          </m.div>
        </main>
      </div>
      <AppFooter area="Sign in" help="Forgot your password or can't sign in? Ask your institute admin to reset your account." />
    </div>
  );
}
