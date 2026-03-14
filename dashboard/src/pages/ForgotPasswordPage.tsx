import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/client';
import { ThemeToggleButton } from '../App';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <ThemeToggleButton />
      </div>
      <div className="auth-card">
        {submitted ? (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--accent-muted)', color: 'var(--accent-text)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h1 style={{ fontSize: '1.25rem', textAlign: 'center' }}>Check your email</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              If an account exists for <strong>{email}</strong>, we've sent a password reset link. Check your inbox and spam folder.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', marginBottom: '1rem' }}>
              The link expires in 1 hour.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'block', textAlign: 'center' }}>
              Back to Sign In
            </Link>
          </>
        ) : (
          <>
            <h1>Reset your password</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <p className="auth-switch">
              Remember your password? <Link to="/login">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
