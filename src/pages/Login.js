import React, { useState, useEffect } from 'react';
import { MailOutlined, LockOutlined, EyeOutlined, EyeInvisibleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import api from '../api';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('c3_remember_email');
    if (saved) setEmail(saved);
  }, []);

  const addToast = (message, type = 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      addToast('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 4) {
      addToast('Password must be at least 4 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password, role });
      addToast('Login successful! Redirecting...', 'success');
      localStorage.setItem('c3_remember_email', email);
      setTimeout(() => onLogin(res.data.token, res.data.role), 900);
    } catch (err) {
      addToast(err.response?.data?.message || 'Login failed. Please check your credentials.', 'error');
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .login-root * { font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; }

        @keyframes toast-in {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes card-up {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes blob-move {
          0%, 100% { transform: translate(0,0) scale(1); }
          33%       { transform: translate(30px,-20px) scale(1.08); }
          66%       { transform: translate(-20px,15px) scale(0.95); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .toast-anim { animation: toast-in 0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
        .card-anim  { animation: card-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
        .blob1      { animation: blob-move 18s infinite ease-in-out; }
        .blob2      { animation: blob-move 24s infinite ease-in-out reverse; }
        .float-anim { animation: float 6s ease-in-out infinite; }
        .spinner    { animation: spin 0.75s linear infinite; }

        .tab-bg {
          position: relative;
          background: #f1f5f9;
          border-radius: 12px;
          padding: 4px;
          display: flex;
        }
        .tab-indicator {
          position: absolute;
          top: 4px; bottom: 4px;
          width: calc(50% - 4px);
          background: #fff;
          border-radius: 9px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          transition: transform 0.28s cubic-bezier(0.16,1,0.3,1);
        }
        .tab-indicator.admin { transform: translateX(calc(100% + 4px)); }

        .input-field {
          width: 100%;
          padding: 12px 14px 12px 42px;
          font-size: 0.9rem;
          color: #0f172a;
          background: #fff;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          outline: none;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .input-field:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99,102,241,0.12);
        }
        .input-field:disabled { opacity: 0.6; cursor: not-allowed; }

        .pw-field { padding-right: 46px; }

        .submit-btn {
          width: 100%;
          padding: 13px;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #fff;
          font-weight: 700;
          font-size: 0.95rem;
          border: none;
          border-radius: 11px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(99,102,241,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.18s, box-shadow 0.18s, opacity 0.18s;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(99,102,241,0.4);
        }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.65; cursor: not-allowed; }

        .feature-card {
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 14px;
          padding: 16px 18px;
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          gap: 12px;
        }
      `}</style>

      <div className="login-root" style={{ minHeight: '100vh', display: 'flex', background: '#f8fafc',alignItems:'center',justifyContent:'center',height:'100vh' }}>

        <div style={{ position:'fixed', top:20, right:20, zIndex:9999, display:'flex', flexDirection:'column', gap:10 }}>
          {toasts.map(t => (
            <div key={t.id} className="toast-anim" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '13px 16px',
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
              borderLeft: `4px solid ${t.type === 'success' ? '#10b981' : '#ef4444'}`,
              fontSize: '0.875rem', fontWeight: 500, color: '#1e293b'
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                {t.type === 'success' ? (
                  <CheckCircleOutlined style={{ color: '#10b981', fontSize: 16 }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ef4444', fontSize: 16 }} />
                )}
              </span>
              <span>{t.message}</span>
            </div>
          ))}
        </div>

      
        <div className="login-right-panel" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width:'100%',
          padding: '32px 24px',
          background: '#fff',
          overflowY: 'auto'
        }}>
          <div className="card-anim" style={{ width: '100%', maxWidth: 400 }}>

            <div style={{ textAlign:'center', marginBottom:28 }}>
              <div style={{
                display:'inline-flex', alignItems:'center', gap:10,
                background:'#f8fafc', border:'1px solid #e2e8f0',
                borderRadius:12, padding:'10px 18px'
              }}>
                <img src="/C3AppLogo.png" alt="C³" style={{ height:30, objectFit:'contain' }} />
                <span style={{ fontWeight:700, fontSize:'1.1rem', color:'#0f172a' }}>C³ Assessment</span>
              </div>
            </div>

            <div style={{ marginBottom:28 }}>
              <h2 style={{ margin:0, fontSize:'1.6rem', fontWeight:800, color:'#0f172a', letterSpacing:'-0.02em' }}>
                Welcome back 
              </h2>
              <p style={{ margin:'6px 0 0', color:'#64748b', fontSize:'0.9rem' }}>
                Sign in to access your {role === 'admin' ? 'admin dashboard' : 'exam portal'}
              </p>
            </div>

            <div className="tab-bg" style={{ marginBottom:24 }}>
              <div className={`tab-indicator ${role === 'admin' ? 'admin' : ''}`} />
              <button type="button" onClick={() => setRole('student')}
                style={{
                  flex:1, position:'relative', zIndex:2, border:'none', background:'transparent',
                  padding:'10px 0', fontSize:'0.875rem', fontWeight:600, cursor:'pointer',
                  color: role === 'student' ? '#4f46e5' : '#64748b',
                  transition:'color 0.2s', borderRadius:8
                }}>
                 Student
              </button>
              <button type="button" onClick={() => setRole('admin')}
                style={{
                  flex:1, position:'relative', zIndex:2, border:'none', background:'transparent',
                  padding:'10px 0', fontSize:'0.875rem', fontWeight:600, cursor:'pointer',
                  color: role === 'admin' ? '#4f46e5' : '#64748b',
                  transition:'color 0.2s', borderRadius:8
                }}>
                  Admin
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>

              <div>
                <label style={{ display:'block', fontSize:'0.82rem', fontWeight:600, color:'#475569', marginBottom:6 }}>
                  Email Address
                </label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', display:'flex' }}>
                    <MailOutlined style={{ fontSize: 16 }} />
                  </span>
                  <input type="email" className="input-field" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={`your@${role === 'admin' ? 'institution' : 'student'}.com`}
                    disabled={loading} required />
                </div>
              </div>

              <div>
                <label style={{ display:'block', fontSize:'0.82rem', fontWeight:600, color:'#475569', marginBottom:6 }}>
                  Password
                </label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', display:'flex' }}>
                    <LockOutlined style={{ fontSize: 16 }} />
                  </span>
                  <input type={showPassword ? 'text' : 'password'} className="input-field pw-field"
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password" disabled={loading} required />
                  <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)}
                    style={{
                      position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                      background:'transparent', border:'none', color:'#94a3b8', cursor:'pointer',
                      padding:6, display:'flex', transition:'color 0.18s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#4f46e5'}
                    onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? (
                      <EyeInvisibleOutlined style={{ fontSize: 18 }} />
                    ) : (
                      <EyeOutlined style={{ fontSize: 18 }} />
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop:4 }}>
                {loading
                  ? <><span className="spinner" style={{ width:16, height:16, border:'2.5px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block' }} /> Signing in...</>
                  : `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`
                }
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
