import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ChevronLeft, AlertCircle, Mail } from 'lucide-react';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem('streetiq_admin')) {
      navigate('/admin/dashboard', { replace: true });
    }
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [navigate]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError('');
    setTimeout(() => {
      if (email.trim().toLowerCase() === ADMIN_EMAIL?.toLowerCase() && password === ADMIN_PASSWORD) {
        sessionStorage.setItem('streetiq_admin', JSON.stringify({ email: email.trim(), at: Date.now() }));
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError('Invalid email or password.');
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div style={{
      minHeight: '100dvh', background: '#000',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: '24px',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(10,132,255,0.12) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <button
        onClick={() => navigate('/about')}
        style={{
          position: 'absolute', top: 'calc(env(safe-area-inset-top,0px) + 20px)', left: 20,
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
          color: 'rgba(255,255,255,0.4)', fontSize: 15, fontFamily: "'Inter', sans-serif",
        }}
      >
        <ChevronLeft size={18} />
        Back
      </button>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(10,132,255,0.12)',
            border: '1px solid rgba(10,132,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Lock size={24} color="#0A84FF" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.8, color: '#fff', marginBottom: 6 }}>Developer Access</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>StreetIQ Admin Dashboard</div>
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="rgba(255,255,255,0.25)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                style={{
                  width: '100%', padding: '14px 16px 14px 42px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, color: '#fff', fontSize: 15,
                  fontFamily: "'Inter', sans-serif",
                  outline: 'none',
                }}
                placeholder="contact@mnmworks.xyz"
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  width: '100%', padding: '14px 48px 14px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, color: '#fff', fontSize: 15,
                  fontFamily: "'Inter', sans-serif",
                  outline: 'none',
                }}
                placeholder="••••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.3)', padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 14px', borderRadius: 10,
              background: 'rgba(255,69,58,0.1)',
              border: '1px solid rgba(255,69,58,0.25)',
            }}>
              <AlertCircle size={15} color="#FF453A" />
              <span style={{ fontSize: 13, color: '#FF453A', fontFamily: "'Inter', sans-serif" }}>{error}</span>
            </div>
          )}
          <button
            id="admin-login-submit"
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              width: '100%', padding: '15px',
              background: loading ? 'rgba(10,132,255,0.4)' : '#0A84FF',
              border: 'none', borderRadius: 12,
              color: '#fff', fontSize: 15, fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? (
              <>
                <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />
                Authenticating...
              </>
            ) : 'Sign In'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 28, fontSize: 12, color: 'rgba(255,255,255,0.12)' }}>
          Restricted access · StreetIQ Internal
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
