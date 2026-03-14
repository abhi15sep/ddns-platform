import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDomains, createDomain, deleteDomain, checkAdmin } from '../api/client';
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

type ConnStatus = 'checking' | 'ok' | 'err';

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

/* ---- SVG Icons for connectivity nodes ---- */
const IconDevice = () => (
  <svg viewBox="0 0 24 24"><path d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/></svg>
);
const IconInternet = () => (
  <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
);
const IconServer = () => (
  <svg viewBox="0 0 24 24"><path d="M20 13H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1zM7 19c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM20 3H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1zM7 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
);
const IconDNS = () => (
  <svg viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>
);

let toastId = 0;

export default function DomainList() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newSub, setNewSub] = useState('');
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Connectivity state
  const [connInternet, setConnInternet] = useState<ConnStatus>('checking');
  const [connServer, setConnServer] = useState<ConnStatus>('checking');
  const [connDns, setConnDns] = useState<ConnStatus>('checking');
  const [internetLatency, setInternetLatency] = useState<string>('--');
  const [serverLatency, setServerLatency] = useState<string>('--');
  const [dnsDetail, setDnsDetail] = useState<string>('--');
  const healthTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // Health checks
  const runHealthChecks = useCallback(async (currentDomains?: Domain[]) => {
    // Internet check
    setConnInternet('checking');
    try {
      const start = Date.now();
      const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        setConnInternet('ok');
        setInternetLatency(`${Date.now() - start}ms`);
      } else {
        setConnInternet('err');
        setInternetLatency('Error');
      }
    } catch {
      setConnInternet('err');
      setInternetLatency('Offline');
    }

    // DDNS server check
    setConnServer('checking');
    try {
      const start = Date.now();
      const res = await fetch('/health', { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        setConnServer('ok');
        setServerLatency(`${Date.now() - start}ms`);
      } else {
        setConnServer('err');
        setServerLatency(`HTTP ${res.status}`);
      }
    } catch {
      setConnServer('err');
      setServerLatency('Down');
    }

    // DNS status (based on domain data)
    const ds = currentDomains || domains;
    if (ds.length === 0) {
      setConnDns('checking');
      setDnsDetail('No domains');
    } else {
      const active = ds.filter((d) => d.current_ip).length;
      if (active === ds.length) {
        setConnDns('ok');
        setDnsDetail(`${active} synced`);
      } else if (active > 0) {
        setConnDns('ok');
        setDnsDetail(`${active}/${ds.length} synced`);
      } else {
        setConnDns('err');
        setDnsDetail('No IPs set');
      }
    }
  }, [domains]);

  useEffect(() => {
    getDomains().then((r) => {
      setDomains(r.data);
      runHealthChecks(r.data);
    });
    checkAdmin().then(() => setIsAdmin(true)).catch(() => {});

    // Refresh health every 30s
    healthTimer.current = setInterval(() => runHealthChecks(), 30000);
    return () => { if (healthTimer.current) clearInterval(healthTimer.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const publicIP = domains.find((d) => d.current_ip)?.current_ip ?? '---';
  const lastUpdate = domains.reduce<string | null>((latest, d) => {
    if (!d.updated_at) return latest;
    if (!latest) return d.updated_at;
    return new Date(d.updated_at) > new Date(latest) ? d.updated_at : latest;
  }, null);

  const ringClass = (s: ConnStatus) =>
    s === 'ok' ? 'conn-ring conn-ok' : s === 'err' ? 'conn-ring conn-err' : 'conn-ring conn-checking';
  const lineClass = (s: ConnStatus) =>
    s === 'ok' ? 'conn-line conn-line-ok' : s === 'err' ? 'conn-line conn-line-err' : 'conn-line';

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
            {isAdmin && (
              <Link to="/admin" className="navbar-link">
                Admin
              </Link>
            )}
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
        {/* Connectivity Diagram */}
        <div className="conn-card">
          <div className="conn-card-header">
            <span className="conn-card-title">Connectivity</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => runHealthChecks()}
              title="Refresh status"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
              </svg>
            </button>
          </div>
          <div className="conn-diagram">
            <div className="conn-node">
              <div className={ringClass(connInternet)}>
                <IconDevice />
              </div>
              <span className="conn-label">Your Device</span>
              <span className="conn-detail">{publicIP !== '---' ? publicIP : '--'}</span>
            </div>

            <div className={lineClass(connInternet)} />

            <div className="conn-node">
              <div className={ringClass(connInternet)}>
                <IconInternet />
              </div>
              <span className="conn-label">Internet</span>
              <span className="conn-detail">{internetLatency}</span>
            </div>

            <div className={lineClass(connServer)} />

            <div className="conn-node">
              <div className={ringClass(connServer)}>
                <IconServer />
              </div>
              <span className="conn-label">DDNS Server</span>
              <span className="conn-detail">{serverLatency}</span>
            </div>

            <div className={lineClass(connDns)} />

            <div className="conn-node">
              <div className={ringClass(connDns)}>
                <IconDNS />
              </div>
              <span className="conn-label">DNS Records</span>
              <span className="conn-detail">{dnsDetail}</span>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-label">Total Domains</div>
            <div className="stat-value">{domains.length}<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}> / 3</span></div>
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
              <span className={`status-dot ${connServer === 'ok' ? 'status-dot-green' : connServer === 'err' ? 'status-dot-red' : 'status-dot-yellow'}`} />
              {connServer === 'ok' ? 'Operational' : connServer === 'err' ? 'Degraded' : 'Checking...'}
            </div>
          </div>
        </div>

        {/* Create domain */}
        <section className="create-section">
          <div className="create-card">
            <h2>Add New Domain</h2>
            <p className="create-card-desc">
              Register a subdomain for dynamic DNS updates.{domains.length >= 3 ? '' : ` (${3 - domains.length} of 3 remaining)`}
            </p>
            {domains.length < 3 ? (
              <>
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
              </>
            ) : (
              <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                You have reached the maximum of 3 domains. Delete an existing domain to create a new one.
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
