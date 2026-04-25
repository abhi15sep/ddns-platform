import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggleButton } from '../App';
import {
  getAdminStats,
  getAdminUsers,
  getAdminActivity,
  blockUser,
  unblockUser,
  getAdminSettings,
  updateAdminSettings,
} from '../api/client';

interface AdminStats {
  totalUsers: number;
  totalDomains: number;
  updatesLastHour: number;
  blockedUsers: number;
}

interface AdminUser {
  id: string;
  email: string;
  is_admin: boolean;
  blocked: boolean;
  created_at: string;
  domain_count: string;
  domains: string[] | null;
}

interface ActivityEntry {
  domain: string;
  update_count: string;
  last_update: string;
  last_ip: string;
  owner_email: string;
  user_id: string;
  user_blocked: boolean;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

type TabName = 'users' | 'activity' | 'settings';
let toastId = 0;

export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabName>('users');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [rateLimitPerToken, setRateLimitPerToken] = useState(6);
  const [rateLimitPerAccount, setRateLimitPerAccount] = useState(15);
  const [rateLimitWindow, setRateLimitWindow] = useState(60);
  const [globalApiRateLimit, setGlobalApiRateLimit] = useState(120);
  const [savingSettings, setSavingSettings] = useState(false);

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function loadData() {
    return Promise.all([
      getAdminStats().then((r) => setStats(r.data)),
      getAdminUsers().then((r) => setUsers(r.data)),
      getAdminActivity().then((r) => setActivity(r.data)),
      getAdminSettings().then((r) => {
        setRateLimitPerToken(r.data.rateLimitPerToken);
        setRateLimitPerAccount(r.data.rateLimitPerAccount);
        setRateLimitWindow(r.data.rateLimitWindowSeconds);
        setGlobalApiRateLimit(r.data.globalApiRateLimit);
      }).catch(() => {}),
    ]);
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      await updateAdminSettings({
        rateLimitPerToken: rateLimitPerToken,
        rateLimitPerAccount: rateLimitPerAccount,
        rateLimitWindowSeconds: rateLimitWindow,
        globalApiRateLimit: globalApiRateLimit,
      });
      addToast('Rate limit settings saved', 'success');
    } catch {
      addToast('Failed to save settings', 'error');
    }
    setSavingSettings(false);
  }

  useEffect(() => {
    loadData()
      .catch((err) => {
        if (err.response?.status === 403) {
          setError('You do not have admin access.');
        } else {
          setError('Failed to load admin data.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSearch() {
    try {
      const r = await getAdminUsers(search);
      setUsers(r.data);
    } catch {
      addToast('Search failed', 'error');
    }
  }

  async function handleBlock(userId: string, email: string) {
    if (!confirm(`Block ${email}? They will not be able to log in or update DNS.`)) return;
    try {
      await blockUser(userId);
      addToast(`${email} has been blocked`, 'success');
      await loadData();
    } catch {
      addToast('Failed to block user', 'error');
    }
  }

  async function handleUnblock(userId: string, email: string) {
    try {
      await unblockUser(userId);
      addToast(`${email} has been unblocked`, 'success');
      await loadData();
    } catch {
      addToast('Failed to unblock user', 'error');
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function relativeTime(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }

  if (error) {
    return (
      <>
        <nav className="navbar">
          <div className="navbar-inner">
            <Link to="/dashboard" className="navbar-brand">
              <span className="navbar-brand-icon">D</span>
              DDNS
            </Link>
            <div className="navbar-right">
              <ThemeToggleButton />
            </div>
          </div>
        </nav>
        <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="error-message" style={{ display: 'inline-block' }}>{error}</div>
          <div style={{ marginTop: '1rem' }}>
            <Link to="/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/dashboard" className="navbar-brand">
            <span className="navbar-brand-icon">D</span>
            DDNS
          </Link>
          <div className="navbar-links">
            <Link to="/dashboard" className="navbar-link">Dashboard</Link>
            <Link to="/downloads" className="navbar-link">Downloads</Link>
            <Link to="/api-docs" className="navbar-link">API</Link>
            <Link to="/admin" className="navbar-link active">Admin</Link>
          </div>
          <div className="navbar-right">
            <ThemeToggleButton />
            <Link to="/profile" className="navbar-email" style={{ cursor: 'pointer', color: 'var(--accent-text)', textDecoration: 'none' }}>
              {user?.email}
            </Link>
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">Logout</button>
          </div>
        </div>
      </nav>

      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
          ))}
        </div>
      )}

      {/* Hero */}
      <header style={{ textAlign: 'center', padding: '3rem 1rem 2rem', background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', color: 'white' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 800, color: 'white' }}>Admin Console</h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto' }}>
          Manage users, monitor activity, and configure platform settings
        </p>
      </header>

      <div className="container">

        {loading ? (
          <div className="loading">
            <div className="loading-spinner" />
            <p>Loading admin data...</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            {stats && (
              <div className="stats-bar">
                <div className="stat-card">
                  <div className="stat-label">Total Users</div>
                  <div className="stat-value">{stats.totalUsers}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Domains</div>
                  <div className="stat-value">{stats.totalDomains}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Updates (3h)</div>
                  <div className="stat-value">{stats.updatesLastHour}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Blocked Users</div>
                  <div className="stat-value">
                    {stats.blockedUsers > 0 ? (
                      <span style={{ color: 'var(--error-text)' }}>{stats.blockedUsers}</span>
                    ) : (
                      <span>0</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="tabs">
              <button className={`tab ${activeTab === 'users' ? 'tab-active' : ''}`} onClick={() => setActiveTab('users')}>
                Users ({users.length})
              </button>
              <button className={`tab ${activeTab === 'activity' ? 'tab-active' : ''}`} onClick={() => setActiveTab('activity')}>
                Activity Monitor
              </button>
              <button className={`tab ${activeTab === 'settings' ? 'tab-active' : ''}`} onClick={() => setActiveTab('settings')}>
                Rate Limits
              </button>
            </div>

            {/* Users Tab */}
            {activeTab === 'users' && (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by email..."
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.75rem',
                      border: '1px solid var(--border-input)',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button onClick={handleSearch} className="btn btn-primary">Search</button>
                  {search && (
                    <button
                      onClick={() => { setSearch(''); getAdminUsers().then((r) => setUsers(r.data)); }}
                      className="btn btn-secondary"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <table className="domain-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Domains</th>
                      <th>Domain Names</th>
                      <th>Status</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} style={u.blocked ? { opacity: 0.6 } : undefined}>
                        <td style={{ fontWeight: 500 }}>
                          {u.email}
                          {u.is_admin && (
                            <span className="badge badge-active" style={{ marginLeft: '0.5rem', fontSize: '0.6rem' }}>ADMIN</span>
                          )}
                        </td>
                        <td>{u.domain_count}</td>
                        <td>
                          {u.domains && u.domains.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              {u.domains.map((d) => (
                                <span
                                  key={d}
                                  style={{
                                    display: 'inline-block',
                                    padding: '0.1rem 0.5rem',
                                    background: 'var(--accent-bg)',
                                    color: 'var(--accent-text)',
                                    borderRadius: '9999px',
                                    fontSize: '0.72rem',
                                    fontWeight: 500,
                                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                                  }}
                                >
                                  {d}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>None</span>
                          )}
                        </td>
                        <td>
                          {u.blocked ? (
                            <span className="badge badge-never">Blocked</span>
                          ) : (
                            <span className="badge badge-active">Active</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {formatDate(u.created_at)}
                        </td>
                        <td>
                          {!u.is_admin && (
                            u.blocked ? (
                              <button
                                onClick={() => handleUnblock(u.id, u.email)}
                                className="btn btn-sm btn-primary"
                              >
                                Unblock
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBlock(u.id, u.email)}
                                className="btn btn-sm btn-danger"
                              >
                                Block
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Domains with the most updates in the last 3 hours. High update counts may indicate abuse.
                </p>
                <table className="domain-table">
                  <thead>
                    <tr>
                      <th>Domain</th>
                      <th>Owner</th>
                      <th>Updates (3h)</th>
                      <th>Last IP</th>
                      <th>Last Update</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.map((a) => (
                      <tr key={a.domain} style={a.user_blocked ? { opacity: 0.6 } : undefined}>
                        <td style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: '0.8rem' }}>
                          {a.domain}.ddns.devops-monk.com
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{a.owner_email}</td>
                        <td>
                          <span style={{
                            fontWeight: 700,
                            color: Number(a.update_count) > 20 ? 'var(--error-text)' : Number(a.update_count) > 10 ? 'var(--badge-stale-text)' : 'var(--text-primary)',
                          }}>
                            {a.update_count}
                          </span>
                          {Number(a.update_count) > 20 && (
                            <span className="badge badge-never" style={{ marginLeft: '0.5rem', fontSize: '0.55rem' }}>HIGH</span>
                          )}
                        </td>
                        <td style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: '0.8rem' }}>
                          {a.last_ip}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {relativeTime(a.last_update)}
                        </td>
                        <td>
                          {a.user_blocked ? (
                            <button
                              onClick={() => handleUnblock(a.user_id, a.owner_email)}
                              className="btn btn-sm btn-primary"
                            >
                              Unblock
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBlock(a.user_id, a.owner_email)}
                              className="btn btn-sm btn-danger"
                            >
                              Block
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {activity.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                          No activity in the last 3 hours.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div style={{ maxWidth: '520px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Control rate limiting across your API. Changes take effect within 30 seconds.
                </p>

                {/* Global API Rate Limit */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Global API Rate Limit</h4>
                  <div style={{ marginBottom: '0.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                      Max requests per IP (per minute)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="number"
                        min={10}
                        max={10000}
                        value={globalApiRateLimit}
                        onChange={(e) => setGlobalApiRateLimit(Number(e.target.value))}
                        style={{
                          width: '100px',
                          padding: '0.55rem 0.75rem',
                          border: '1px solid var(--border-input)',
                          borderRadius: '6px',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          textAlign: 'center',
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        requests per IP per minute
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      Applies to all API endpoints (auth, domains, admin, update). Protects against brute-force and abuse. The /health endpoint is excluded.
                    </p>
                  </div>
                </div>

                {/* DDNS Update Rate Limits */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>DDNS Update Rate Limits</h4>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                      Requests per domain (per window)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={rateLimitPerToken}
                        onChange={(e) => setRateLimitPerToken(Number(e.target.value))}
                        style={{
                          width: '100px',
                          padding: '0.55rem 0.75rem',
                          border: '1px solid var(--border-input)',
                          borderRadius: '6px',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          textAlign: 'center',
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        requests per domain per {rateLimitWindow}s window
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      Limits each individual subdomain token. E.g. "myhome" can only update {rateLimitPerToken} times.
                    </p>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                      Requests per account (per window)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="number"
                        min={1}
                        max={5000}
                        value={rateLimitPerAccount}
                        onChange={(e) => setRateLimitPerAccount(Number(e.target.value))}
                        style={{
                          width: '100px',
                          padding: '0.55rem 0.75rem',
                          border: '1px solid var(--border-input)',
                          borderRadius: '6px',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          textAlign: 'center',
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        total requests across all domains per {rateLimitWindow}s
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      Limits the total updates from one user across all their domains combined.
                    </p>
                  </div>

                  <div style={{ marginBottom: '0.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                      Time window (seconds)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="number"
                        min={10}
                        max={3600}
                        value={rateLimitWindow}
                        onChange={(e) => setRateLimitWindow(Number(e.target.value))}
                        style={{
                          width: '100px',
                          padding: '0.55rem 0.75rem',
                          border: '1px solid var(--border-input)',
                          borderRadius: '6px',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          textAlign: 'center',
                        }}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        seconds ({rateLimitWindow >= 60 ? `${Math.floor(rateLimitWindow / 60)}m ${rateLimitWindow % 60 ? rateLimitWindow % 60 + 's' : ''}` : `${rateLimitWindow}s`})
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      Rolling window in which the limits above are counted.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleSaveSettings}
                  className="btn btn-primary"
                  disabled={savingSettings}
                  style={{ width: '100%' }}
                >
                  {savingSettings ? 'Saving...' : 'Save Rate Limits'}
                </button>

                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--hint-bg)', border: '1px solid var(--hint-border)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--hint-text)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--hint-strong)' }}>How it works:</strong><br />
                  <strong>Global limit:</strong> Caps total requests from any single IP address across all endpoints. Prevents brute-force attacks and general abuse.<br />
                  <strong>Update limits:</strong> When a user exceeds the per-domain limit, that specific domain gets blocked. When they exceed the per-account limit, all their domains get blocked.<br />
                  All blocked requests receive a 429 status.
                </div>
              </div>
            )}
          </>
        )}

        <footer className="footer">
          DDNS Admin Console
        </footer>
      </div>
    </>
  );
}
