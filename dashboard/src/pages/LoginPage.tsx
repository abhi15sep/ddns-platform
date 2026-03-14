import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Sign in to DDNS</h1>

        <div className="sso-buttons">
          <a href={`${import.meta.env.VITE_API_URL || ''}/auth/google`} className="btn btn-sso btn-google">
            Continue with Google
          </a>
          <a href={`${import.meta.env.VITE_API_URL || ''}/auth/github`} className="btn btn-sso btn-github">
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
          <button type="submit" className="btn btn-primary">
            Sign In
          </button>
        </form>

        <p className="auth-switch">
          No account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}