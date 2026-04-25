import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { checkAdmin } from '../api/client';
import { ThemeToggleButton } from '../App';

type CheckStatus = 'checking' | 'ok' | 'degraded' | 'down';

interface ServiceCheck {
  name: string;
  desc: string;
  status: CheckStatus;
  latency: string;
  detail: string;
}

export default function StatusPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checks, setChecks] = useState<ServiceCheck[]>([
    { name: 'API Server', desc: 'Backend API and web dashboard', status: 'checking', latency: '--', detail: 'Checking...' },
    { name: 'Database', desc: 'PostgreSQL data store', status: 'checking', latency: '--', detail: 'Checking...' },
    { name: 'DNS Resolution', desc: 'PowerDNS authoritative server', status: 'checking', latency: '--', detail: 'Checking...' },
  ]);
  const [lastChecked, setLastChecked] = useState<string>('--');
  const [overallStatus, setOverallStatus] = useState<CheckStatus>('checking');
  const [uptimeData, setUptimeData] = useState<{ '7d': number; '30d': number; '90d': number } | null>(null);
  const [incidents24h, setIncidents24h] = useState<number>(0);

  useEffect(() => {
    if (user) checkAdmin().then(() => setIsAdmin(true)).catch(() => {});
  }, [user]);

  const runChecks = useCallback(async () => {
    const newChecks: ServiceCheck[] = [
      { name: 'API Server', desc: 'Backend API and web dashboard', status: 'checking', latency: '--', detail: 'Checking...' },
      { name: 'Database', desc: 'PostgreSQL data store', status: 'checking', latency: '--', detail: 'Checking...' },
      { name: 'DNS Resolution', desc: 'PowerDNS authoritative server', status: 'checking', latency: '--', detail: 'Checking...' },
    ];
    setChecks([...newChecks]);

    // Check 1: API health (also tests database since /health pings DB)
    let apiOk = false;
    try {
      const start = Date.now();
      const res = await fetch('/health', { signal: AbortSignal.timeout(10000) });
      const elapsed = Date.now() - start;
      if (res.ok) {
        const data = await res.json();
        apiOk = data.status === 'ok';
        newChecks[0] = {
          ...newChecks[0],
          status: 'ok',
          latency: `${elapsed}ms`,
          detail: 'Responding normally',
        };
        newChecks[1] = {
          ...newChecks[1],
          status: 'ok',
          latency: `${elapsed}ms`,
          detail: 'Connected and responsive',
        };
      } else {
        newChecks[0] = { ...newChecks[0], status: 'degraded', latency: `${elapsed}ms`, detail: `HTTP ${res.status}` };
        newChecks[1] = { ...newChecks[1], status: 'degraded', latency: '--', detail: 'Could not verify' };
      }
    } catch {
      newChecks[0] = { ...newChecks[0], status: 'down', latency: '--', detail: 'Unreachable' };
      newChecks[1] = { ...newChecks[1], status: 'down', latency: '--', detail: 'Cannot connect' };
    }

    // Check 2: DNS resolution (use DNS-over-HTTPS to check if our zone resolves)
    try {
      const start = Date.now();
      const res = await fetch(
        'https://cloudflare-dns.com/dns-query?name=ddns.devops-monk.com&type=SOA',
        { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(10000) }
      );
      const elapsed = Date.now() - start;
      if (res.ok) {
        const data = await res.json();
        if (data.Answer && data.Answer.length > 0) {
          newChecks[2] = { ...newChecks[2], status: 'ok', latency: `${elapsed}ms`, detail: 'Zone resolving correctly' };
        } else if (data.Authority && data.Authority.length > 0) {
          newChecks[2] = { ...newChecks[2], status: 'ok', latency: `${elapsed}ms`, detail: 'Zone delegated correctly' };
        } else {
          newChecks[2] = { ...newChecks[2], status: 'degraded', latency: `${elapsed}ms`, detail: 'Zone found but no SOA record' };
        }
      } else {
        newChecks[2] = { ...newChecks[2], status: 'degraded', latency: `${elapsed}ms`, detail: `DNS query returned ${res.status}` };
      }
    } catch {
      if (apiOk) {
        newChecks[2] = { ...newChecks[2], status: 'degraded', latency: '--', detail: 'DNS-over-HTTPS check failed (DNS may still work)' };
      } else {
        newChecks[2] = { ...newChecks[2], status: 'down', latency: '--', detail: 'Cannot verify DNS' };
      }
    }

    setChecks([...newChecks]);
    setLastChecked(new Date().toLocaleTimeString());

    // Determine overall
    const statuses = newChecks.map((c) => c.status);
    if (statuses.every((s) => s === 'ok')) setOverallStatus('ok');
    else if (statuses.some((s) => s === 'down')) setOverallStatus('down');
    else setOverallStatus('degraded');
  }, []);

  const fetchUptimeStats = useCallback(async () => {
    try {
      const res = await fetch('/health/uptime');
      if (res.ok) {
        const data = await res.json();
        if (data.uptime) setUptimeData(data.uptime);
        setIncidents24h(data.incidents_24h || 0);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    runChecks();
    fetchUptimeStats();
    const interval = setInterval(() => { runChecks(); fetchUptimeStats(); }, 60000);
    return () => clearInterval(interval);
  }, [runChecks, fetchUptimeStats]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const statusColor = (s: CheckStatus) => {
    if (s === 'ok') return 'var(--badge-active-text)';
    if (s === 'degraded') return 'var(--badge-stale-text)';
    if (s === 'down') return 'var(--badge-never-text)';
    return 'var(--text-muted)';
  };

  const statusBg = (s: CheckStatus) => {
    if (s === 'ok') return 'var(--badge-active-bg)';
    if (s === 'degraded') return 'var(--badge-stale-bg)';
    if (s === 'down') return 'var(--badge-never-bg)';
    return 'var(--bg-secondary)';
  };

  const statusLabel = (s: CheckStatus) => {
    if (s === 'ok') return 'Operational';
    if (s === 'degraded') return 'Degraded';
    if (s === 'down') return 'Down';
    return 'Checking...';
  };

  const overallLabel = (s: CheckStatus) => {
    if (s === 'ok') return 'All Systems Operational';
    if (s === 'degraded') return 'Partial Degradation';
    if (s === 'down') return 'Major Outage';
    return 'Checking Systems...';
  };

  return (
    <div style={{ background: 'var(--bg-body)', minHeight: '100vh' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to={user ? '/dashboard' : '/'} className="navbar-brand">
            <span className="navbar-brand-icon">D</span>
            DDNS
          </Link>
          <div className="navbar-links">
            {user && (
              <Link to="/dashboard" className="navbar-link">
                Dashboard
              </Link>
            )}
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
            {user ? (
              <>
                <Link to="/profile" className="navbar-email" style={{ cursor: 'pointer', color: 'var(--accent-text)' }}>
                  {user.email}
                </Link>
                <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary btn-sm">Sign In</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="container" style={{ maxWidth: '700px' }}>
        {/* Overall Status Banner */}
        <div
          style={{
            background: statusBg(overallStatus),
            border: `1px solid ${statusColor(overallStatus)}`,
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            {overallStatus === 'checking' ? (
              <div className="loading-spinner" style={{ width: '24px', height: '24px', marginBottom: 0 }} />
            ) : (
              <span
                className={`status-dot status-dot-${overallStatus === 'ok' ? 'green' : overallStatus === 'degraded' ? 'yellow' : 'red'}`}
                style={{ width: '14px', height: '14px' }}
              />
            )}
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: statusColor(overallStatus), margin: 0 }}>
              {overallLabel(overallStatus)}
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Last checked: {lastChecked}
          </p>
        </div>

        {/* Individual checks */}
        <div className="section-label">Service Status</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {checks.map((check) => (
            <div
              key={check.name}
              className="info-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '1.25rem',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.95rem', marginBottom: '0.15rem' }}>{check.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{check.desc}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', marginBottom: '0.15rem' }}>
                  {check.status === 'checking' ? (
                    <div className="loading-spinner" style={{ width: '12px', height: '12px', marginBottom: 0, borderWidth: '2px' }} />
                  ) : (
                    <span
                      className={`status-dot status-dot-${check.status === 'ok' ? 'green' : check.status === 'degraded' ? 'yellow' : 'red'}`}
                    />
                  )}
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: statusColor(check.status) }}>
                    {statusLabel(check.status)}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {check.latency !== '--' && <span style={{ marginRight: '0.5rem' }}>{check.latency}</span>}
                  {check.detail}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Refresh button */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button className="btn btn-secondary" onClick={runChecks}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Uptime History */}
        {uptimeData && (uptimeData['7d'] > 0 || uptimeData['30d'] > 0 || uptimeData['90d'] > 0) && (
          <>
            <div className="section-label">Uptime History</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {([['7d', '7 Days'], ['30d', '30 Days'], ['90d', '90 Days']] as const).map(([key, label]) => {
                const pct = uptimeData[key] || 0;
                const color = pct >= 99.5 ? 'var(--badge-active-text)' : pct >= 95 ? 'var(--badge-stale-text)' : 'var(--badge-never-text)';
                const bg = pct >= 99.5 ? 'var(--badge-active-bg)' : pct >= 95 ? 'var(--badge-stale-bg)' : 'var(--badge-never-bg)';
                return (
                  <div key={key} className="info-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color, marginBottom: '0.25rem' }}>{pct > 0 ? `${pct}%` : '--'}</div>
                    <div style={{ display: 'inline-block', background: bg, color, padding: '0.15rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600 }}>
                      {pct >= 99.5 ? 'Excellent' : pct >= 95 ? 'Good' : pct > 0 ? 'Needs Attention' : 'No Data'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Uptime bar visualization */}
            <div className="info-card" style={{ padding: '1.25rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-heading)' }}>Last 30 Days</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {incidents24h > 0 ? `${incidents24h} incident hour${incidents24h > 1 ? 's' : ''} in last 24h` : 'No incidents in last 24h'}
                </span>
              </div>
              <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
                <div style={{
                  width: `${uptimeData['30d'] || 0}%`,
                  background: (uptimeData['30d'] || 0) >= 99.5 ? 'var(--badge-active-text)' : (uptimeData['30d'] || 0) >= 95 ? 'var(--badge-stale-text)' : 'var(--badge-never-text)',
                  borderRadius: '4px',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          </>
        )}

        {/* Info cards */}
        <div className="section-label">Service Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="info-card">
            <h3>DNS Zone</h3>
            <div className="info-value" style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>ddns.devops-monk.com</div>
          </div>
          <div className="info-card">
            <h3>API Endpoint</h3>
            <div className="info-value" style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>api.devops-monk.com</div>
          </div>
          <div className="info-card">
            <h3>Dashboard</h3>
            <div className="info-value" style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>ddns.devops-monk.com</div>
          </div>
          <div className="info-card">
            <h3>Check Interval</h3>
            <div className="info-value" style={{ fontSize: '0.85rem' }}>Every 60 seconds</div>
          </div>
        </div>

        {/* How to report */}
        <div className="hint-banner" style={{ marginBottom: '2rem' }}>
          <strong>Having issues?</strong> If you're experiencing problems that aren't reflected on this page, try:
          <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', lineHeight: 2 }}>
            <li>Checking your domain's update token is correct</li>
            <li>Verifying your cron job or desktop client is running</li>
            <li>Testing with: <code style={{ background: 'var(--bg-secondary)', padding: '0.1rem 0.35rem', borderRadius: '3px', fontSize: '0.8rem' }}>curl https://api.devops-monk.com/health</code></li>
          </ul>
        </div>

        {/* Footer */}
        <footer className="footer">
          DDNS Service &middot; <Link to="/api-docs">API Docs</Link> &middot; <Link to="/downloads">Downloads</Link>
        </footer>
      </div>
    </div>
  );
}
