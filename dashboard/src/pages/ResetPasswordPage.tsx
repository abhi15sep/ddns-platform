import { useState, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/client';
import { ThemeToggleButton } from '../App';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token!, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-container">
        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
          <ThemeToggleButton />
        </div>
        <div className="auth-card">
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--bg-secondary)', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.25rem', textAlign: 'center' }}>Invalid Reset Link</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            This password reset link is missing or invalid. Please request a new one.
          </p>
          <Link to="/forgot-password" className="btn btn-primary" style={{ display: 'block', textAlign: 'center' }}>
            Request New Link
          </Link>
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
        {success ? (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--accent-muted)', color: 'var(--accent-text)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 style={{ fontSize: '1.25rem', textAlign: 'center' }}>Password Reset</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'block', textAlign: 'center' }}>
              Sign In
            </Link>
          </>
        ) : (
          <>
            <h1>Set new password</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Choose a new password for your account. Must be at least 8 characters.
            </p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                minLength={8}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>

            <p className="auth-switch">
              <Link to="/forgot-password">Request a new link</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
