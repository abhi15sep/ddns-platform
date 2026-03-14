import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getDomains,
  getDomainHistory,
  regenerateToken,
} from '../api/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

interface Domain {
  id: string;
  subdomain: string;
  current_ip: string | null;
  updated_at: string | null;
  token: string;
}

interface HistoryEntry {
  ip: string;
  source_ip: string;
  user_agent: string;
  updated_at: string;
}

type TabName = 'update' | 'history' | 'setup';

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
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function domainStatus(d: Domain): 'active' | 'stale' | 'never' {
  if (!d.updated_at) return 'never';
  const age = Date.now() - new Date(d.updated_at).getTime();
  return age < 3600_000 ? 'active' : 'stale';
}

function statusLabel(s: 'active' | 'stale' | 'never'): string {
  if (s === 'active') return 'Active';
  if (s === 'stale') return 'Stale';
  return 'Never Updated';
}

let toastIdCounter = 0;

export default function DomainDetail() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const [domain, setDomain] = useState<Domain | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showToken, setShowToken] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>('update');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    if (!subdomain) return;
    getDomains().then((r) =>
      setDomain(r.data.find((d: Domain) => d.subdomain === subdomain) || null)
    );
    getDomainHistory(subdomain).then((r) =>
      setHistory([...r.data].reverse())
    );
  }, [subdomain]);

  async function handleRegenerate() {
    if (!subdomain) return;
    if (!confirm('Regenerate token? Your existing update scripts will stop working.'))
      return;
    const r = await regenerateToken(subdomain);
    setDomain(r.data);
    addToast('Token regenerated successfully', 'success');
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    addToast(`${label} copied to clipboard`, 'success');
  }

  if (!domain) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
        <div className="loading-spinner" />
        <p style={{ color: '#94a3b8' }}>Loading domain details...</p>
      </div>
    );
  }

  const updateURL = `https://api.devops-monk.com/update?domain=${subdomain}&token=${domain.token}`;
  const maskedToken = domain.token.slice(0, 8) + '...' + domain.token.slice(-4);
  const status = domainStatus(domain);
  const badgeClass =
    status === 'active' ? 'badge-active' : status === 'stale' ? 'badge-stale' : 'badge-never';
  const dotClass =
    status === 'active' ? 'status-dot-green' : status === 'stale' ? 'status-dot-yellow' : 'status-dot-red';

  // Chart data
  const uniqueIPs = [...new Set(history.map((h) => h.ip))];
  const chartData = history.map((h) => ({
    ...h,
    ipIndex: uniqueIPs.indexOf(h.ip),
    label: h.ip,
    time: new Date(h.updated_at).toLocaleString(),
  }));

  const historyDateRange =
    history.length > 0
      ? `${new Date(history[0].updated_at).toLocaleDateString()} - ${new Date(
          history[history.length - 1].updated_at
        ).toLocaleDateString()}`
      : '';

  return (
    <>
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to dashboard
        </Link>

        {/* Header */}
        <div className="detail-header">
          <span className="detail-title">{subdomain}.dyn.devops-monk.com</span>
          <span className={`badge ${badgeClass}`}>
            <span className={`status-dot ${dotClass}`} />
            {statusLabel(status)}
          </span>
        </div>

        {/* Info cards */}
        <div className="info-grid">
          <div className="info-card">
            <h3>Current IP</h3>
            <p className="info-value info-value-lg">
              {domain.current_ip || '---'}
              {domain.current_ip && (
                <button
                  className="btn-icon"
                  onClick={() => copyToClipboard(domain.current_ip!, 'IP address')}
                  title="Copy IP"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
              )}
            </p>
            {!domain.current_ip && (
              <p className="info-sub">Send your first update to set the IP</p>
            )}
          </div>
          <div className="info-card">
            <h3>Last Updated</h3>
            <p className="info-value">
              {domain.updated_at
                ? relativeTime(domain.updated_at)
                : 'Never'}
            </p>
            {domain.updated_at && (
              <p className="info-sub">
                {new Date(domain.updated_at).toLocaleString()}
              </p>
            )}
          </div>
          <div className="info-card">
            <h3>Token</h3>
            <p className="info-value">
              <code style={{ fontSize: '0.85rem' }}>
                {showToken ? domain.token : maskedToken}
              </code>
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowToken(!showToken)}
                className="btn btn-secondary btn-sm"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
              {showToken && (
                <button
                  onClick={() => copyToClipboard(domain.token, 'Token')}
                  className="btn btn-secondary btn-sm"
                >
                  Copy
                </button>
              )}
              <button onClick={handleRegenerate} className="btn btn-danger btn-sm">
                Regenerate
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'update' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('update')}
          >
            Update URL
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            IP History ({history.length})
          </button>
          <button
            className={`tab ${activeTab === 'setup' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('setup')}
          >
            Setup Guide
          </button>
        </div>

        {/* Update URL Tab */}
        {activeTab === 'update' && (
          <section>
            <div className="code-block-label">Update URL</div>
            <div className="code-block">
              <code>{updateURL}</code>
              <button
                onClick={() => copyToClipboard(updateURL, 'Update URL')}
                className="btn btn-primary btn-sm"
              >
                Copy
              </button>
            </div>

            <div className="code-block-label">cURL Example</div>
            <div className="code-block">
              <code>{`curl "${updateURL}"`}</code>
              <button
                onClick={() => copyToClipboard(`curl "${updateURL}"`, 'cURL command')}
                className="btn btn-secondary btn-sm"
              >
                Copy
              </button>
            </div>

            <div className="code-block-label">Cron Job (every 5 minutes)</div>
            <div className="code-block">
              <code>{`*/5 * * * * curl -s "${updateURL}" > /dev/null`}</code>
              <button
                onClick={() =>
                  copyToClipboard(
                    `*/5 * * * * curl -s "${updateURL}" > /dev/null`,
                    'Cron command'
                  )
                }
                className="btn btn-secondary btn-sm"
              >
                Copy
              </button>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Want automatic updates without cron?{' '}
                <a href="/downloads">Download the Desktop App</a> for a
                graphical setup wizard.
              </p>
            </div>
          </section>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <section>
            {chartData.length > 0 ? (
              <>
                <div className="chart-section">
                  <div className="chart-header">
                    <h3>IP Changes Over Time</h3>
                    {historyDateRange && <span>{historyDateRange}</span>}
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="updated_at"
                        tickFormatter={(v: string) => new Date(v).toLocaleDateString()}
                        stroke="#94a3b8"
                        fontSize={12}
                      />
                      <YAxis hide />
                      <Tooltip
                        labelFormatter={(v) => new Date(v as string).toLocaleString()}
                        formatter={(value: number) => [uniqueIPs[value], 'IP']}
                        contentStyle={{
                          background: '#1e293b',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#e2e8f0',
                          fontSize: '0.8rem',
                        }}
                        labelStyle={{ color: '#94a3b8' }}
                      />
                      <Line
                        type="stepAfter"
                        dataKey="ipIndex"
                        dot={{ fill: '#4f46e5', r: 3 }}
                        stroke="#4f46e5"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="section-label">Update Log</div>
                <table className="domain-table">
                  <thead>
                    <tr>
                      <th>IP Address</th>
                      <th>Source</th>
                      <th>Client</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map((h, i) => (
                      <tr key={i}>
                        <td>
                          <span style={{ fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
                            {h.ip}
                          </span>
                        </td>
                        <td>{h.source_ip || '---'}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.user_agent || '---'}
                        </td>
                        <td>{new Date(h.updated_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="empty-state-box">
                <div className="empty-state-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <div className="empty-state-title">No updates yet</div>
                <div className="empty-state-desc">
                  Send your first update using the Update URL tab to see IP history here.
                </div>
              </div>
            )}
          </section>
        )}

        {/* Setup Guide Tab */}
        {activeTab === 'setup' && (
          <section>
            <div className="setup-grid">
              <div className="setup-card">
                <h4>Linux (Cron)</h4>
                <p>Add to crontab with <code>crontab -e</code>:</p>
                <div className="code-block">
                  <code>{`*/5 * * * * curl -s "${updateURL}" > /dev/null`}</code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `*/5 * * * * curl -s "${updateURL}" > /dev/null`,
                        'Cron command'
                      )
                    }
                    className="btn btn-secondary btn-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="setup-card">
                <h4>Windows (PowerShell)</h4>
                <p>Create a Scheduled Task or run in PowerShell:</p>
                <div className="code-block">
                  <code>{`Invoke-WebRequest -Uri "${updateURL}"`}</code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `Invoke-WebRequest -Uri "${updateURL}"`,
                        'PowerShell command'
                      )
                    }
                    className="btn btn-secondary btn-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="setup-card">
                <h4>macOS (launchd)</h4>
                <p>
                  Save as <code>~/Library/LaunchAgents/com.ddns.update.plist</code>:
                </p>
                <div className="code-block">
                  <code style={{ fontSize: '0.68rem' }}>
                    {`curl -s "${updateURL}" > /dev/null`}
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.ddns.update</string>
  <key>ProgramArguments</key>
  <array><string>curl</string><string>-s</string><string>${updateURL}</string></array>
  <key>StartInterval</key><integer>300</integer>
</dict>
</plist>`,
                        'launchd plist'
                      )
                    }
                    className="btn btn-secondary btn-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="setup-card">
                <h4>Docker</h4>
                <p>Use a lightweight container with curl:</p>
                <div className="code-block">
                  <code>{`docker run -d --restart=always alpine/curl \\
  sh -c "while true; do curl -s '${updateURL}'; sleep 300; done"`}</code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `docker run -d --restart=always alpine/curl sh -c "while true; do curl -s '${updateURL}'; sleep 300; done"`,
                        'Docker command'
                      )
                    }
                    className="btn btn-secondary btn-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem' }}>
                Prefer a GUI? Download the DDNS Desktop App for automatic updates.
              </p>
              <a href="/downloads" className="btn btn-primary">
                Download Desktop App
              </a>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="footer">
          DDNS Service &middot; <a href="/docs">API Documentation</a>
        </footer>
      </div>
    </>
  );
}
