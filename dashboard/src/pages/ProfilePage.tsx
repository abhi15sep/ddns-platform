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
  exportData,
  getSessions,
  revokeSession,
  logoutOtherSessions,
  checkAdmin,
  get2FAStatus,
  setup2FA,
  verifySetup2FA,
  disable2FA,
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

interface Session {
  id: string;
  ip: string;
  user_agent: string;
  created_at: string;
  last_active: string;
  is_current: boolean;
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

  // Admin
  const [isAdmin, setIsAdmin] = useState(false);

  // 2FA
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(true);
  const [setupQR, setSetupQR] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [setupError, setSetupError] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState('');

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Data export
  const [exportLoading, setExportLoading] = useState<'json' | 'csv' | null>(null);

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

    checkAdmin().then(() => setIsAdmin(true)).catch(() => {});

    get2FAStatus()
      .then((r) => setTwoFAEnabled(r.data.enabled))
      .catch(() => {})
      .finally(() => setTwoFALoading(false));

    getSessions()
      .then((r) => setSessions(r.data))
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
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

  function parseBrowser(ua: string): string {
    if (!ua || ua === 'unknown') return 'Unknown';
    if (ua.includes('Firefox/')) return 'Firefox';
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('Chrome/')) return 'Chrome';
    if (ua.includes('Safari/')) return 'Safari';
    if (ua.includes('curl/')) return 'curl';
    if (ua.includes('python')) return 'Python';
    return ua.slice(0, 30);
  }

  function parseOS(ua: string): string {
    if (!ua || ua === 'unknown') return '';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac OS')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return '';
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  async function handleRevokeSession(sessionId: string) {
    setRevokingId(sessionId);
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      addToast('Session revoked', 'success');
    } catch {
      addToast('Failed to revoke session', 'error');
    } finally {
      setRevokingId(null);
    }
  }

  async function handleLogoutOthers() {
    if (!confirm('This will log out all other devices. Continue?')) return;
    try {
      const r = await logoutOtherSessions();
      setSessions((prev) => prev.filter((s) => s.is_current));
      addToast(`Logged out ${r.data.revoked} other session(s)`, 'success');
    } catch {
      addToast('Failed to logout other sessions', 'error');
    }
  }

  async function handleExportData(format: 'json' | 'csv') {
    setExportLoading(format);
    try {
      const r = await exportData(format);
      const blob = format === 'csv'
        ? r.data as Blob
        : new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'csv' ? 'ddns-ip-history.csv' : 'ddns-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
      addToast(`Data exported as ${format.toUpperCase()}`, 'success');
    } catch {
      addToast('Failed to export data', 'error');
    } finally {
      setExportLoading(null);
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
            <Link to="/api-docs" className="navbar-link">
              API
            </Link>
            {isAdmin && (
              <Link to="/admin" className="navbar-link">
                Admin
              </Link>
            )}
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

        {/* Active Sessions */}
        <section>
          <div className="section-label">Active Sessions</div>
          <div className="info-card">
            {sessionsLoading ? (
              <div className="loading" style={{ padding: '1rem' }}>Loading...</div>
            ) : sessions.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No active sessions found.</p>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        padding: '0.75rem',
                        background: s.is_current ? 'var(--accent-bg)' : 'var(--bg-secondary)',
                        borderRadius: '8px',
                        border: s.is_current ? '1px solid var(--accent)' : '1px solid var(--border-light)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)' }}>
                            {parseBrowser(s.user_agent)}
                          </span>
                          {parseOS(s.user_agent) && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              on {parseOS(s.user_agent)}
                            </span>
                          )}
                          {s.is_current && (
                            <span style={{
                              fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem',
                              borderRadius: '4px', background: 'var(--badge-active-bg)', color: 'var(--badge-active-text)',
                              textTransform: 'uppercase', letterSpacing: '0.03em',
                            }}>
                              Current
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <span>IP: {s.ip}</span>
                          <span>Active: {timeAgo(s.last_active)}</span>
                          <span>Created: {formatDate(s.created_at)}</span>
                        </div>
                      </div>
                      {!s.is_current && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRevokeSession(s.id)}
                          disabled={revokingId === s.id}
                          style={{ flexShrink: 0 }}
                        >
                          {revokingId === s.id ? 'Revoking...' : 'Revoke'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {sessions.filter((s) => !s.is_current).length > 0 && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleLogoutOthers}
                    style={{ marginTop: '0.75rem' }}
                  >
                    Logout All Other Devices
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        {/* Two-Factor Authentication */}
        <section>
          <div className="section-label">Two-Factor Authentication (2FA)</div>
          <div className="info-card">
            {twoFALoading ? (
              <div className="loading" style={{ padding: '1rem' }}>Loading...</div>
            ) : twoFAEnabled && !backupCodes.length ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--badge-active-text)', display: 'inline-block' }} />
                  <span style={{ fontWeight: 600, color: 'var(--text-heading)' }}>2FA is enabled</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Your account is protected with an authenticator app. To disable 2FA, enter your password below.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', maxWidth: '400px' }}>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    style={{
                      flex: 1, padding: '0.65rem 0.75rem',
                      border: '1px solid var(--border-input)', borderRadius: '6px',
                      fontSize: '0.875rem', background: 'var(--bg-input)', color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={async () => {
                      try {
                        await disable2FA(disablePassword);
                        setTwoFAEnabled(false);
                        setDisablePassword('');
                        addToast('2FA disabled', 'success');
                      } catch (err: any) {
                        addToast(err.response?.data?.error || 'Failed to disable 2FA', 'error');
                      }
                    }}
                  >
                    Disable 2FA
                  </button>
                </div>
              </>
            ) : backupCodes.length > 0 ? (
              <>
                <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
                  2FA Enabled — Save Your Backup Codes
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.6 }}>
                  Save these backup codes in a safe place. Each code can only be used once. If you lose access to your authenticator app, you can use a backup code to sign in.
                </p>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem',
                  padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px',
                  marginBottom: '1rem', fontFamily: 'monospace', fontSize: '0.9rem', textAlign: 'center',
                }}>
                  {backupCodes.map((code) => (
                    <div key={code} style={{ padding: '0.35rem', background: 'var(--bg-primary)', borderRadius: '4px' }}>
                      {code}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(backupCodes.join('\n'));
                      addToast('Backup codes copied', 'success');
                    }}
                  >
                    Copy All
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setBackupCodes([])}
                  >
                    I've Saved Them
                  </button>
                </div>
              </>
            ) : setupQR ? (
              <>
                <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
                  Scan this QR code with your authenticator app
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Use Google Authenticator, Authy, 1Password, or any TOTP-compatible app.
                </p>
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <img src={setupQR} alt="TOTP QR Code" style={{ width: 200, height: 200, borderRadius: '8px' }} />
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', textAlign: 'center' }}>
                  Can't scan? Enter this key manually: <code style={{ wordBreak: 'break-all' }}>{setupSecret}</code>
                </p>
                {setupError && <div className="error-message" style={{ marginBottom: '0.75rem' }}>{setupError}</div>}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setSetupError('');
                    try {
                      const r = await verifySetup2FA(setupCode);
                      setTwoFAEnabled(true);
                      setBackupCodes(r.data.backup_codes);
                      setSetupQR('');
                      setSetupSecret('');
                      setSetupCode('');
                      addToast('2FA enabled successfully', 'success');
                    } catch (err: any) {
                      setSetupError(err.response?.data?.error || 'Verification failed');
                    }
                  }}
                  style={{ display: 'flex', gap: '0.5rem', maxWidth: '320px', margin: '0 auto' }}
                >
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={setupCode}
                    onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoComplete="one-time-code"
                    style={{
                      flex: 1, padding: '0.65rem 0.75rem',
                      border: '1px solid var(--border-input)', borderRadius: '6px',
                      fontSize: '1.1rem', background: 'var(--bg-input)', color: 'var(--text-primary)',
                      textAlign: 'center', letterSpacing: '0.2em', fontFamily: 'monospace',
                    }}
                  />
                  <button type="submit" className="btn btn-primary btn-sm">Verify</button>
                </form>
                <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setSetupQR(''); setSetupSecret(''); setSetupCode(''); setSetupError(''); }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Add an extra layer of security by requiring a code from your authenticator app when signing in.
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    try {
                      const r = await setup2FA();
                      setSetupQR(r.data.qr);
                      setSetupSecret(r.data.secret);
                    } catch (err: any) {
                      addToast(err.response?.data?.error || 'Failed to start 2FA setup', 'error');
                    }
                  }}
                >
                  Enable 2FA
                </button>
              </>
            )}
          </div>
        </section>

        {/* Export My Data */}
        <section>
          <div className="section-label">Export My Data</div>
          <div className="info-card">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Download all your data including profile info, domains, webhook configs, and IP change history.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary btn-sm"
                disabled={exportLoading !== null}
                onClick={() => handleExportData('json')}
              >
                {exportLoading === 'json' ? 'Exporting...' : 'Export as JSON'}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={exportLoading !== null}
                onClick={() => handleExportData('csv')}
              >
                {exportLoading === 'csv' ? 'Exporting...' : 'Export IP History (CSV)'}
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
              JSON includes everything: profile, domains, webhooks, notification settings, and IP history. CSV contains IP change history only.
            </p>
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
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.6 }}>
              This will permanently delete <strong>all</strong> of your data from our platform:
            </p>
            <ul style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
              <li>Your account and profile</li>
              <li>All domains and DNS records</li>
              <li>IP update history</li>
              <li>Webhook and notification settings</li>
              <li>API tokens and 2FA configuration</li>
              <li>OAuth linked accounts</li>
            </ul>
            <p style={{ fontSize: '0.825rem', color: 'var(--error-text)', marginBottom: '1rem', fontWeight: 500 }}>
              This action <strong>cannot be undone</strong>. Consider exporting your data first.
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
