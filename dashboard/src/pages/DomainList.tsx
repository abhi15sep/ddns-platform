import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDomains, createDomain, deleteDomain } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggleButton } from '../App';

interface Domain {
  id: string;
  subdomain: string;
  current_ip: string | null;
  updated_at: string | null;
  token: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function domainStatus(d: Domain): 'active' | 'stale' | 'never' {
  if (!d.updated_at) return 'never';
  const age = Date.now() - new Date(d.updated_at).getTime();
  return age < 3600_000 ? 'active' : 'stale';
}

function statusLabel(s: 'active' | 'stale' | 'never'): string {
  if (s === 'active') return 'Active';
  if (s === 'stale') return 'Stale';
  return 'Never';
}

let toastId = 0;

export default function DomainList() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newSub, setNewSub] = useState('');
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    getDomains().then((r) => setDomains(r.data));
  }, []);

  async function handleCreate() {
    setError('');
    if (!newSub.trim()) {
      setError('Enter a subdomain name');
      return;
    }
    try {
      const r = await createDomain(newSub.trim());
      setDomains((prev) => [r.data, ...prev]);
      setNewSub('');
      addToast(`${r.data.subdomain}.dyn.devops-monk.com created!`, 'success');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'response' in err
            ? ((err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Failed to create')
            : 'Failed to create';
      setError(msg);
      addToast(msg, 'error');
    }
  }

  async function handleDelete(subdomain: string) {
    if (!confirm(`Delete ${subdomain}? This cannot be undone.`)) return;
    await deleteDomain(subdomain);
    setDomains((prev) => prev.filter((d) => d.subdomain !== subdomain));
    addToast(`${subdomain} deleted`, 'success');
  }

  function copyUpdateURL(d: Domain) {
    const url = `curl "https://api.devops-monk.com/update?domain=${d.subdomain}&token=${d.token}"`;
    navigator.clipboard.writeText(url);
    addToast('curl command copied — run it to activate your domain', 'success');
  }

  function copyIP(ip: string) {
    navigator.clipboard.writeText(ip);
    addToast('IP copied to clipboard', 'success');
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  // Stats
  const publicIP =
    domains.find((d) => d.current_ip)?.current_ip ?? '---';
  const lastUpdate = domains.reduce<string | null>((latest, d) => {
    if (!d.updated_at) return latest;
    if (!latest) return d.updated_at;
    return new Date(d.updated_at) > new Date(latest) ? d.updated_at : latest;
  }, null);

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
            <Link to="/dashboard" className="navbar-link active">
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
            <Link to="/profile" className="navbar-email" style={{ cursor: 'pointer', color: 'var(--accent-text)' }}>
              {user?.email}
            </Link>
            <ThemeToggleButton />
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
        {/* Stats bar */}
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-label">Total Domains</div>
            <div className="stat-value">{domains.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Public IP</div>
            <div className="stat-value stat-value-sm">{publicIP}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Last Update</div>
            <div className="stat-value stat-value-sm">
              {lastUpdate ? relativeTime(lastUpdate) : '---'}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Service Status</div>
            <div className="stat-value stat-value-sm">
              <span className="status-dot status-dot-green" />
              Operational
            </div>
          </div>
        </div>

        {/* Create domain */}
        <section className="create-section">
          <div className="create-card">
            <h2>Add New Domain</h2>
            <p className="create-card-desc">
              Register a subdomain for dynamic DNS updates.
            </p>
            <div className="create-row">
              <div className="create-input-wrapper">
                <input
                  value={newSub}
                  onChange={(e) =>
                    setNewSub(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, '')
                    )
                  }
                  placeholder="my-home"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <span className="domain-suffix">.dyn.devops-monk.com</span>
              <button onClick={handleCreate} className="btn btn-primary btn-lg">
                Create
              </button>
            </div>
            {newSub && (
              <div className="create-preview">
                Your domain will be:{' '}
                <strong>{newSub}.dyn.devops-monk.com</strong>
              </div>
            )}
            {error && <div className="error-message" style={{ marginTop: '0.75rem' }}>{error}</div>}
          </div>
        </section>

        {/* Getting started hint */}
        {domains.length > 0 && domains.some((d) => !d.current_ip) && (
          <div className="hint-banner">
            <strong>Next step:</strong> Your domain won't resolve until you send the first IP update.
            Run this curl command from the machine whose IP you want to track:
            <div className="code-block" style={{ marginTop: '0.5rem' }}>
              <code>curl "https://api.devops-monk.com/update?domain=YOUR_SUBDOMAIN&token=YOUR_TOKEN"</code>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Click the link icon on any domain below to copy its curl command, or click the domain name for full setup guides.
            </span>
          </div>
        )}

        {/* Domain list */}
        <section>
          <div className="section-label">
            My Domains ({domains.length})
          </div>

          {domains.length === 0 ? (
            <div className="empty-state-box">
              <div className="empty-state-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
              <div className="empty-state-title">Create your first domain</div>
              <div className="empty-state-desc">
                Add a subdomain above to get started with dynamic DNS.
              </div>
            </div>
          ) : (
            <div className="domain-cards">
              {domains.map((d) => {
                const status = domainStatus(d);
                return (
                  <div
                    key={d.subdomain}
                    className={`domain-card domain-card-${status}`}
                  >
                    <div className="domain-card-info">
                      <div className="domain-card-name">
                        <Link to={`/domain/${d.subdomain}`}>
                          {d.subdomain}.dyn.devops-monk.com
                        </Link>
                      </div>
                      <div className="domain-card-meta">
                        {d.current_ip && (
                          <span
                            className="domain-card-ip"
                            style={{ cursor: 'pointer' }}
                            onClick={() => copyIP(d.current_ip!)}
                            title="Click to copy"
                          >
                            {d.current_ip}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" />
                              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                            </svg>
                          </span>
                        )}
                        <span className="domain-card-time">
                          {d.updated_at
                            ? relativeTime(d.updated_at)
                            : 'Never updated'}
                        </span>
                        <span className={`badge badge-${status}`}>
                          <span
                            className={`status-dot status-dot-${
                              status === 'active'
                                ? 'green'
                                : status === 'stale'
                                  ? 'yellow'
                                  : 'red'
                            }`}
                          />
                          {statusLabel(status)}
                        </span>
                      </div>
                    </div>
                    <div className="domain-card-actions">
                      <button
                        className="btn-icon"
                        onClick={() => copyUpdateURL(d)}
                        title="Copy update URL"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                        </svg>
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(d.subdomain)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="footer">
          DDNS Service &middot; <a href="/downloads">Downloads &amp; Setup Guides</a>
        </footer>
      </div>
    </>
  );
}
