import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggleButton } from '../App';
import {
  getProfile,
  changePassword,
  getApiToken,
  regenerateApiToken,
  deleteAccount,
} from '../api/client';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ProfileData {
  email: string;
  created_at: string;
  has_password: boolean;
  providers: string[]; // e.g. ['google', 'github']
}

let toastId = 0;

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // API token
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenRevealed, setTokenRevealed] = useState(false);

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    getProfile()
      .then((r) => setProfile(r.data))
      .catch(() => {
        // Fallback: build profile from user context
        if (user) {
          setProfile({
            email: user.email,
            created_at: '',
            has_password: true,
            providers: [],
          });
        }
      })
      .finally(() => setProfileLoading(false));

    getApiToken()
      .then((r) => setApiToken(r.data.token))
      .catch(() => setApiToken(null))
      .finally(() => setTokenLoading(false));
  }, [user]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');

    if (!newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast('Password changed successfully', 'success');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'response' in err
            ? ((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Failed to change password')
            : 'Failed to change password';
      setPasswordError(msg);
      addToast(msg, 'error');
    } finally {
      setPasswordLoading(false);
    }
  }

  function handleCopyToken() {
    if (apiToken) {
      navigator.clipboard.writeText(apiToken);
      addToast('API token copied to clipboard', 'success');
    }
  }

  async function handleRegenerateToken() {
    if (!confirm('Regenerate your API token? The old token will stop working immediately.')) return;
    try {
      const r = await regenerateApiToken();
      setApiToken(r.data.token);
      setTokenRevealed(true);
      addToast('API token regenerated', 'success');
    } catch {
      addToast('Failed to regenerate token', 'error');
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleteLoading(true);
    try {
      await deleteAccount();
      addToast('Account deleted', 'success');
      await logout();
      navigate('/');
    } catch {
      addToast('Failed to delete account', 'error');
      setDeleteLoading(false);
    }
  }

  function maskedToken(token: string) {
    if (tokenRevealed) return token;
    if (token.length <= 8) return '********';
    return token.slice(0, 4) + '****' + token.slice(-4);
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/dashboard" className="navbar-brand">
            <span className="navbar-brand-icon">D</span>
            DDNS
          </Link>
          <div className="navbar-links">
            <Link to="/dashboard" className="navbar-link">
              Dashboard
            </Link>
            <Link to="/how-it-works" className="navbar-link">
              How It Works
            </Link>
            <Link to="/downloads" className="navbar-link">
              Downloads
            </Link>
          </div>
          <div className="navbar-right">
            <ThemeToggleButton />
            <Link to="/profile" className="navbar-email" style={{ cursor: 'pointer', color: 'var(--accent-text)', textDecoration: 'none' }}>
              {user?.email}
            </Link>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              {t.message}
            </div>
          ))}
        </div>
      )}

      <div className="container">
        <Link to="/dashboard" className="back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Dashboard
        </Link>

        <h2 style={{ fontSize: '1.35rem', marginBottom: '1.5rem' }}>Profile &amp; Settings</h2>

        {/* Account Info */}
        <section>
          <div className="section-label">Account Information</div>
          {profileLoading ? (
            <div className="loading">Loading...</div>
          ) : (
            <div className="info-grid">
              <div className="info-card">
                <h3>Email</h3>
                <div className="info-value">{profile?.email ?? user?.email ?? '---'}</div>
              </div>
              <div className="info-card">
                <h3>Account Created</h3>
                <div className="info-value">{profile?.created_at ? formatDate(profile.created_at) : 'N/A'}</div>
              </div>
              <div className="info-card">
                <h3>Linked Providers</h3>
                <div className="info-value" style={{ gap: '0.75rem' }}>
                  {profile?.providers && profile.providers.length > 0 ? (
                    profile.providers.map((p) => (
                      <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        {p === 'google' && (
                          <svg width="18" height="18" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        )}
                        {p === 'github' && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="#333">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                          </svg>
                        )}
                        <span style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>{p}</span>
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Password only</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Change Password */}
        {profile?.has_password !== false && (
          <section>
            <div className="section-label">Change Password</div>
            <div className="info-card">
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '400px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      border: '1px solid var(--border-input)',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      border: '1px solid var(--border-input)',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      border: '1px solid var(--border-input)',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                {passwordError && <div className="error-message">{passwordError}</div>}
                <button type="submit" className="btn btn-primary" disabled={passwordLoading} style={{ alignSelf: 'flex-start' }}>
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* API Token */}
        <section>
          <div className="section-label">API Token</div>
          <div className="info-card">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Use this personal API token for programmatic access to your DDNS account. Keep it secret.
            </p>
            {tokenLoading ? (
              <div className="loading" style={{ padding: '1rem' }}>Loading...</div>
            ) : apiToken ? (
              <>
                <div className="code-block">
                  <code>{maskedToken(apiToken)}</code>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setTokenRevealed(!tokenRevealed)}
                    >
                      {tokenRevealed ? 'Hide' : 'Reveal'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleCopyToken}>
                      Copy
                    </button>
                  </div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={handleRegenerateToken} style={{ marginTop: '0.5rem' }}>
                  Regenerate Token
                </button>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Regenerating will invalidate the current token. Any scripts or integrations using the old token will need to be updated.
                </p>
              </>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                No API token available. Your account may not support programmatic access yet.
              </p>
            )}
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <div className="section-label" style={{ color: 'var(--error-text)' }}>Danger Zone</div>
          <div className="info-card" style={{ borderColor: 'var(--btn-danger-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: '0.25rem' }}>Delete Account</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Permanently delete your account and all associated domains. This action cannot be undone.
                </p>
              </div>
              <button className="btn btn-danger" onClick={() => setShowDeleteModal(true)}>
                Delete Account
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          DDNS Service &middot; <a href="/downloads">Downloads &amp; Setup Guides</a>
        </footer>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '440px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-default)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: 'var(--error-text)', marginBottom: '0.75rem', fontSize: '1.1rem' }}>
              Delete Your Account?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
              This will permanently delete your account, all domains, DNS records, and API tokens. This action <strong>cannot be undone</strong>.
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  border: '1px solid var(--border-input)',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                onClick={handleDeleteAccount}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
