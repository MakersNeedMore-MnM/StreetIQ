import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ChevronLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function GovLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem('streetiq_gov')) {
      navigate('/gov/dashboard', { replace: true });
    }
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: rpcErr } = await supabase.rpc('gov_login', {
        p_username: username.trim().toLowerCase(),
        p_password: password,
      });
      if (rpcErr) throw rpcErr;
      if (data) {
        sessionStorage.setItem('streetiq_gov', JSON.stringify(data));
        navigate('/gov/dashboard', { replace: true });
      } else {
        setError('Invalid credentials or account inactive.');
      }
    } catch {
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif",
      padding: '24px',
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
      <button
        onClick={() => navigate('/about')}
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top,0px) + 20px)',
          left: 20,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          color: 'rgba(255,255,255,0.3)',
          fontSize: 14,
          fontFamily: "'Inter', sans-serif",
          padding: 0,
        }}
      >
        <ChevronLeft size={16} />
        Back
      </button>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
          }}>
            <img src="/logo.png" alt="StreetIQ" style={{ width: 40, height: 40, objectFit: 'contain' }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 10 }}>
            Government Portal
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
            Official Access
          </div>
          <div style={{ width: 32, height: 1, background: 'rgba(255,255,255,0.12)', margin: '16px auto 0' }} />
        </div>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 7 }}>
              Username
            </label>
            <input
              id="gov-username"
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              style={{
                width: '100%',
                padding: '13px 14px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                color: '#fff',
                fontSize: 15,
                fontFamily: "'Inter', sans-serif",
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.35)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 7 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="gov-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '13px 46px 13px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 15,
                  fontFamily: "'Inter', sans-serif",
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.35)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: 0 }}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <AlertCircle size={14} color="rgba(255,255,255,0.5)" />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: "'Inter', sans-serif" }}>{error}</span>
            </div>
          )}
          <button
            id="gov-login-submit"
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
              width: '100%',
              padding: '14px',
              background: loading ? 'rgba(255,255,255,0.7)' : '#fff',
              border: 'none',
              borderRadius: 10,
              color: '#000',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 0.5,
              fontFamily: "'Inter', sans-serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? (
              <>
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.15)', borderTopColor: '#000', animation: 'spin 0.7s linear infinite' }} />
                Authenticating
              </>
            ) : 'Sign In'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: 'rgba(255,255,255,0.15)', lineHeight: 1.7 }}>
          Secure access for authorised government officials only<br />
          Credentials issued by the StreetIQ administrator
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
