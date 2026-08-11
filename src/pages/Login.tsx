import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import api from '../api';
import { Spinner, ToastStack, useToast } from '../components/ui';
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
  const { toasts, showToast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved) setEmail(saved);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    if (!password || password.length < 4) {
      showToast('Password must be at least 4 characters.', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password, role });
      showToast('Login successful! Redirecting...', 'success');
      localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      setTimeout(() => onLogin(res.data.token, res.data.role), 900);
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Login failed. Please check your credentials.', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.08),transparent_32%)] bg-slate-50 px-6 py-10">
      <ToastStack toasts={toasts} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px] rounded-3xl border border-slate-100 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-10"
      >
        <div className="mb-7 flex justify-center">
          <div className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4.5 py-2.5">
            <img src="/C3AppLogo.png" alt="C³" className="h-[30px] object-contain" />
            <span className="text-[1.1rem] font-bold text-slate-900">C³ Assessment</span>
          </div>
        </div>

        <div className="mb-7">
          <h2 className="text-[1.6rem] font-extrabold tracking-tight text-slate-900">Welcome back</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Sign in to access your {role === 'admin' ? 'admin dashboard' : 'exam portal'}
          </p>
        </div>

        <div className="relative mb-6 flex rounded-xl bg-slate-100 p-1">
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="absolute inset-y-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
            style={{ left: role === 'admin' ? 'calc(50% + 2px)' : '4px' }}
          />
          <button
            type="button"
            onClick={() => setRole('student')}
            className={[
              'relative z-10 flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors',
              role === 'student' ? 'text-brand-600' : 'text-slate-500',
            ].join(' ')}
          >
            Student
          </button>
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={[
              'relative z-10 flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors',
              role === 'admin' ? 'text-brand-600' : 'text-slate-500',
            ].join(' ')}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-[0.82rem] font-semibold text-slate-600">
              Email Address
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail className="size-4" />
              </span>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`your@${role === 'admin' ? 'institution' : 'student'}.com`}
                disabled={loading}
                required
                className="w-full rounded-[10px] border-[1.5px] border-slate-200 bg-white py-3 pl-[42px] pr-3.5 text-sm text-slate-900 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/12 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-[0.82rem] font-semibold text-slate-600">
              Password
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock className="size-4" />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                required
                className="w-full rounded-[10px] border-[1.5px] border-slate-200 bg-white py-3 pl-[42px] pr-[46px] text-sm text-slate-900 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-500/12 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:text-brand-600"
              >
                {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-[11px] bg-gradient-to-br from-brand-500 to-brand-600 py-3.5 text-[0.95rem] font-bold text-white shadow-[0_4px_14px_rgba(99,102,241,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(99,102,241,0.4)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-65"
          >
            {loading ? (
              <>
                <Spinner className="size-4 text-white" /> Signing in...
              </>
            ) : (
              `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
