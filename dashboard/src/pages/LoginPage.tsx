import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { login, verify2FA } from '../api/client';
import { ThemeToggleButton } from '../App';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 2FA state
  const [needs2FA, setNeeds2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');

  // Handle OAuth redirect with 2FA required
  useEffect(() => {
    const requires2fa = searchParams.get('requires_2fa');
    const token = searchParams.get('temp_token');
    if (requires2fa === '1' && token) {
      setNeeds2FA(true);
      setTempToken(token);
    }
  }, [searchParams]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.data.requires_2fa) {
        setNeeds2FA(true);
        setTempToken(res.data.temp_token);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handle2FASubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verify2FA(tempToken, totpCode);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  // 2FA verification screen
  if (needs2FA) {
    return (
      <div className="auth-container">
        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
          <ThemeToggleButton />
        </div>
        <div className="auth-card">
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--accent-muted)', color: 'var(--accent-text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.25rem', textAlign: 'center' }}>Two-Factor Authentication</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Enter the 6-digit code from your authenticator app, or use a backup code.
          </p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handle2FASubmit}>
            <input
              type="text"
              placeholder="000000"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              required
              autoFocus
              autoComplete="one-time-code"
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.3em', fontFamily: 'monospace' }}
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>

          <p className="auth-switch" style={{ marginTop: '1rem' }}>
            <button
              onClick={() => { setNeeds2FA(false); setTempToken(''); setTotpCode(''); setError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--accent-text)', cursor: 'pointer', fontSize: 'inherit' }}
            >
              Back to Sign In
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <ThemeToggleButton />
      </div>
      <div className="auth-card">
        <h1>Sign in to DDNS</h1>

        <div className="sso-buttons">
          <a href="/auth/google" className="btn btn-sso btn-google">
            Continue with Google
          </a>
          <a href="/auth/github" className="btn btn-sso btn-github">
            Continue with GitHub
          </a>
        </div>

        <div className="divider">
          <span>or sign in with email</span>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch" style={{ marginBottom: '0.5rem' }}>
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
        <p className="auth-switch">
          No account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
