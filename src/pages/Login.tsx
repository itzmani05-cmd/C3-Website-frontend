import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight, BarChart3, Clock, Eye, EyeOff, GraduationCap, Lock, Mail, ShieldCheck, Trophy } from 'lucide-react';
import { toast } from 'react-toastify';
import api, { SESSION_EXPIRED_FLAG } from '../api';
import { Spinner } from '../components/ui';
import type { Role } from '../types/models';

interface LoginProps {
  onLogin: (token: string, role: Role) => void;
}

type FieldErrors = { email?: string; password?: string; form?: string };

const REMEMBER_EMAIL_KEY = 'c3_remember_email';

const ROLES: { value: Role; label: string; icon: typeof GraduationCap }[] = [
  { value: 'student', label: 'Student', icon: GraduationCap },
  { value: 'admin', label: 'Admin', icon: ShieldCheck },
];

const HIGHLIGHTS = [
  { icon: Clock, title: 'Real exam pattern', text: 'Timed tests that mirror the actual paper.' },
  { icon: Trophy, title: 'Instant results', text: 'Scores and explanations the moment you submit.' },
  { icon: BarChart3, title: 'Track your growth', text: 'See where you stand across every unit.' },
];

const inputClass = (hasError: boolean) =>
  [
    'w-full rounded-lg border bg-white py-2.5 pl-10 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60',
    hasError
      ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/12'
      : 'border-slate-200 hover:border-slate-300 focus:border-brand-500 focus:ring-brand-500/12',
  ].join(' ');

function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-danger-600">
      <AlertCircle className="size-3.5 shrink-0" />
      {children}
    </p>
  );
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [capsLock, setCapsLock] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      passwordRef.current?.focus();
    } else {
      emailRef.current?.focus();
    }
    if (sessionStorage.getItem(SESSION_EXPIRED_FLAG)) {
      sessionStorage.removeItem(SESSION_EXPIRED_FLAG);
      toast.info('Your session expired. Please sign in again.');
    }
  }, []);

  const detectCapsLock = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState?.('CapsLock') ?? false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const nextErrors: FieldErrors = {};
    if (!trimmedEmail) nextErrors.email = 'Enter your email address.';
    else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) nextErrors.email = 'That doesn’t look like a valid email.';
    if (!password) nextErrors.password = 'Enter your password.';
    else if (password.length < 4) nextErrors.password = 'Password must be at least 4 characters.';
    setErrors(nextErrors);
    if (nextErrors.email) return emailRef.current?.focus();
    if (nextErrors.password) return passwordRef.current?.focus();

    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email: trimmedEmail, password, role });
      if (rememberEmail) localStorage.setItem(REMEMBER_EMAIL_KEY, trimmedEmail);
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
      toast.success('Login successful! Redirecting...');
      setTimeout(() => onLogin(res.data.token, res.data.role), 600);
    } catch (err: any) {
      setErrors({ form: err.response?.data?.message || 'Login failed. Please check your credentials.' });
      setLoading(false);
    }
  };

  const roleLabel = role === 'admin' ? 'Admin' : 'Student';

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="relative hidden w-[46%] max-w-[640px] overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-accent-700 p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-accent-500/30 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />

        <div className="relative flex items-center gap-3">
          <div className="rounded-xl bg-white p-1.5 shadow-lg shadow-black/10">
            <img src="/C3AppLogo-128.png" alt="" className="size-8 object-contain" />
          </div>
          <span className="font-heading text-xl font-bold tracking-tight">C³ EP</span>
        </div>

        <div className="relative my-auto py-12">
          <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
            Prepare smarter.
            <br />
            <span className="text-brand-100">Score higher.</span>
          </h1>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-white/75">
            The C³ Educational Platform brings your mock tests, results and progress together in one place.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/20 backdrop-blur">
                  <Icon className="size-[18px]" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-sm text-white/70">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/55">© {new Date().getFullYear()} C³ Institute. All rights reserved.</p>
      </aside>

      <main className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.07),transparent_40%)] px-5 py-10 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px]"
        >
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="rounded-xl border border-slate-200 bg-white p-1.5 shadow-soft-sm">
              <img src="/C3AppLogo-128.png" alt="" className="size-7 object-contain" />
            </div>
            <span className="font-heading text-lg font-bold text-slate-900">C³EP</span>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-soft-md sm:p-8">
            <div className="mb-7">
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Sign in to your {role === 'admin' ? 'admin dashboard' : 'exam portal'} to continue.
              </p>
            </div>

            <div role="tablist" aria-label="Sign in as" className="relative mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                className="absolute inset-y-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
                style={{ left: role === 'admin' ? 'calc(50% + 2px)' : '4px' }}
              />
              {ROLES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={role === value}
                  disabled={loading}
                  onClick={() => {
                    setRole(value);
                    setErrors((prev) => ({ ...prev, form: undefined }));
                  }}
                  className={[
                    'relative z-10 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-500',
                    role === value ? 'text-brand-600' : 'text-slate-500 hover:text-slate-700',
                  ].join(' ')}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>

            {errors.form && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger-500/20 bg-danger-soft px-3.5 py-3 text-sm text-danger-700"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{errors.form}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={emailRef}
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email || errors.form) setErrors((prev) => ({ ...prev, email: undefined, form: undefined }));
                    }}
                    placeholder={`your@${role === 'admin' ? 'institution' : 'student'}.com`}
                    disabled={loading}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'login-email-error' : undefined}
                    className={`${inputClass(!!errors.email)} pr-3.5`}
                  />
                </div>
                <FieldError id="login-email-error">{errors.email}</FieldError>
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={passwordRef}
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password || errors.form) setErrors((prev) => ({ ...prev, password: undefined, form: undefined }));
                    }}
                    onKeyDown={detectCapsLock}
                    onKeyUp={detectCapsLock}
                    onBlur={() => setCapsLock(false)}
                    placeholder="Enter your password"
                    disabled={loading}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'login-password-error' : undefined}
                    className={`${inputClass(!!errors.password)} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600 focus-visible:outline-2 focus-visible:outline-brand-500"
                  >
                    {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                  </button>
                </div>
                <FieldError id="login-password-error">{errors.password}</FieldError>
                {capsLock && !errors.password && (
                  <p className="mt-1.5 text-xs font-medium text-warning-text">Caps Lock is on.</p>
                )}
              </div>

              <label className="flex w-fit cursor-pointer select-none items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  className="size-4 cursor-pointer rounded accent-brand-600"
                />
                Remember my email
              </label>

              <button
                type="submit"
                disabled={loading}
                className="group mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-soft-sm transition-all hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-65"
              >
                {loading ? (
                  <>
                    <Spinner className="size-4 text-white" /> Signing in...
                  </>
                ) : (
                  <>
                    Sign in as {roleLabel}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
