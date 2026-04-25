import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getDomains,
  getDomainHistory,
  regenerateToken,
  updateWebhook,
  updateNotifyEmail,
  updateRecordType,
} from '../api/client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { useThemeContext } from '../App';

interface Domain {
  id: string;
  subdomain: string;
  current_ip: string | null;
  updated_at: string | null;
  token: string;
  webhook_url: string | null;
  notify_email: boolean;
  record_type: string;
}

interface HistoryEntry {
  ip: string;
  source_ip: string;
  user_agent: string;
  updated_at: string;
}

type TabName = 'update' | 'history' | 'setup' | 'notifications';
type SetupPlatform = 'linux' | 'macos' | 'windows' | 'docker' | 'rpi';
type HistoryRange = '3h' | '24h' | '7d' | '30d';

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
  const { theme } = useThemeContext();
  const [domain, setDomain] = useState<Domain | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showToken, setShowToken] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>('update');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [setupPlatform, setSetupPlatform] = useState<SetupPlatform>('linux');
  const [historyRange, setHistoryRange] = useState<HistoryRange>('24h');

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    if (!subdomain) return;
    getDomains().then((r) => {
      const found = r.data.find((d: Domain) => d.subdomain === subdomain) || null;
      setDomain(found);
      if (found) setWebhookUrl(found.webhook_url || '');
    });
  }, [subdomain]);

  useEffect(() => {
    if (!subdomain) return;
    getDomainHistory(subdomain, historyRange).then((r) =>
      setHistory([...r.data].reverse())
    );
  }, [subdomain, historyRange]);

  async function handleRegenerate() {
    if (!subdomain) return;
    if (!confirm('Regenerate token? Your existing update scripts will stop working.'))
      return;
    const r = await regenerateToken(subdomain);
    setDomain(r.data);
    addToast('Token regenerated successfully', 'success');
  }

  async function handleSaveWebhook() {
    if (!subdomain) return;
    setWebhookSaving(true);
    try {
      const r = await updateWebhook(subdomain, webhookUrl.trim() || null);
      setDomain(r.data);
      addToast(webhookUrl.trim() ? 'Webhook saved' : 'Webhook removed', 'success');
    } catch {
      addToast('Failed to save webhook', 'error');
    } finally {
      setWebhookSaving(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    addToast(`${label} copied to clipboard`, 'success');
  }

  if (!domain) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
        <div className="loading-spinner" />
        <p style={{ color: 'var(--text-muted)' }}>Loading domain details...</p>
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
    ipIndex: uniqueIPs.indexOf(h.ip) + 1,
    label: h.ip,
    time: new Date(h.updated_at).toLocaleString(),
  }));

  const timeRange =
    history.length > 0
      ? `Last hour · ${history.length} update${history.length !== 1 ? 's' : ''}`
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
          <span className="detail-title">{subdomain}.ddns.devops-monk.com</span>
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
            className={`tab ${activeTab === 'notifications' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
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
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
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
            {/* Range picker + Export */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div className="dl-tabs" style={{ marginBottom: 0 }}>
                {(['3h', '24h', '7d', '30d'] as HistoryRange[]).map((r) => (
                  <button
                    key={r}
                    className={`dl-tab ${historyRange === r ? 'dl-tab-active' : ''}`}
                    onClick={() => setHistoryRange(r)}
                  >
                    {r === '3h' ? '3 Hours' : r === '24h' ? '24 Hours' : r === '7d' ? '7 Days' : '30 Days'}
                  </button>
                ))}
              </div>
              {history.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const header = 'IP Address,Source IP,User Agent,Time\n';
                    const rows = [...history].reverse().map((h) =>
                      `"${h.ip}","${h.source_ip || ''}","${(h.user_agent || '').replace(/"/g, '""')}","${new Date(h.updated_at).toISOString()}"`
                    ).join('\n');
                    const blob = new Blob([header + rows], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${subdomain}-history-${historyRange}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export CSV
                </button>
              )}
            </div>

            {chartData.length > 0 ? (
              <>
                <div className="chart-section">
                  <div className="chart-header">
                    <h3>IP Changes Over Time</h3>
                    {timeRange && <span>{timeRange}</span>}
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 12 }}>
                      <defs>
                        <linearGradient id="ipGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={theme === 'dark' ? '#6366f1' : '#4f46e5'} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={theme === 'dark' ? '#6366f1' : '#4f46e5'} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={theme === 'dark' ? '#2a3352' : '#e5e7eb'}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="updated_at"
                        tickFormatter={(v: string) => {
                          const d = new Date(v);
                          if (historyRange === '7d' || historyRange === '30d') {
                            return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                          }
                          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        }}
                        stroke={theme === 'dark' ? '#6b7280' : '#9ca3af'}
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis hide domain={[0, 'dataMax + 1']} />
                      <Tooltip
                        labelFormatter={(v) => new Date(v as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        formatter={(value: number) => [uniqueIPs[value - 1], 'IP Address']}
                        contentStyle={{
                          background: theme === 'dark' ? '#161b2e' : '#ffffff',
                          border: `1px solid ${theme === 'dark' ? '#2a3352' : '#e5e7eb'}`,
                          borderRadius: '8px',
                          color: theme === 'dark' ? '#e8eaed' : '#111827',
                          fontSize: '0.8rem',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        }}
                        labelStyle={{ color: theme === 'dark' ? '#9ca3af' : '#6b7280', marginBottom: '4px' }}
                      />
                      <Area
                        type="stepAfter"
                        dataKey="ipIndex"
                        stroke={theme === 'dark' ? '#818cf8' : '#4f46e5'}
                        strokeWidth={2}
                        fill="url(#ipGradient)"
                        dot={{ fill: theme === 'dark' ? '#818cf8' : '#4f46e5', r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: theme === 'dark' ? '#a5b4fc' : '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  {uniqueIPs.length > 1 && (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-light)' }}>
                      {uniqueIPs.map((ip, i) => (
                        <span key={ip} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: i === uniqueIPs.length - 1 ? 'var(--badge-active-text)' : 'var(--text-muted)', display: 'inline-block' }} />
                          {ip}
                          {i === uniqueIPs.length - 1 && <span style={{ color: 'var(--badge-active-text)', fontWeight: 600 }}>(current)</span>}
                        </span>
                      ))}
                    </div>
                  )}
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
                <div className="empty-state-title">No updates in the last {historyRange === '3h' ? '3 hours' : historyRange === '24h' ? '24 hours' : historyRange === '7d' ? '7 days' : '30 days'}</div>
                <div className="empty-state-desc">
                  Try a longer time range, or send an update using the Update URL tab to see IP history here.
                </div>
              </div>
            )}
          </section>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <section>
            {/* DNS Record Type */}
            <div className="info-card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ marginBottom: '0.25rem' }}>DNS Record Type</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Choose which IP versions this domain accepts.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {(['A', 'AAAA', 'BOTH'] as const).map((rt) => (
                  <button
                    key={rt}
                    className={`btn btn-sm ${domain.record_type === rt ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={async () => {
                      try {
                        const r = await updateRecordType(subdomain!, rt);
                        setDomain(r.data);
                        addToast(`Record type set to ${rt === 'BOTH' ? 'A + AAAA' : rt}`, 'success');
                      } catch {
                        addToast('Failed to update record type', 'error');
                      }
                    }}
                  >
                    {rt === 'A' ? 'IPv4 Only (A)' : rt === 'AAAA' ? 'IPv6 Only (AAAA)' : 'Both (A + AAAA)'}
                  </button>
                ))}
              </div>
              <div style={{
                marginTop: '0.75rem',
                padding: '0.5rem 0.75rem',
                background: 'var(--bg-secondary)',
                borderRadius: '6px',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
              }}>
                {domain.record_type === 'A' && 'Only IPv4 addresses will be accepted. IPv6 updates will be rejected.'}
                {domain.record_type === 'AAAA' && 'Only IPv6 addresses will be accepted. IPv4 updates will be rejected.'}
                {domain.record_type === 'BOTH' && 'Both IPv4 and IPv6 addresses will be accepted. The DNS record type is determined by the IP sent.'}
                {!domain.record_type && 'Only IPv4 addresses will be accepted (default).'}
              </div>
            </div>

            {/* Email Notification */}
            <div className="info-card" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <h3 style={{ marginBottom: '0.25rem' }}>Email Notification</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Receive an email when this domain's IP address changes.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const r = await updateNotifyEmail(subdomain!, !domain.notify_email);
                      setDomain(r.data);
                      addToast(r.data.notify_email ? 'Email notifications enabled' : 'Email notifications disabled', 'success');
                    } catch {
                      addToast('Failed to update email notification', 'error');
                    }
                  }}
                  style={{
                    position: 'relative',
                    width: '48px',
                    height: '26px',
                    borderRadius: '13px',
                    border: 'none',
                    cursor: 'pointer',
                    background: domain.notify_email ? 'var(--accent-primary, #4f46e5)' : 'var(--border-input, #d1d5db)',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                    padding: 0,
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '3px',
                    left: domain.notify_email ? '24px' : '3px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
              {domain.notify_email && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--badge-active-text)', display: 'inline-block', flexShrink: 0 }} />
                  Emails will be sent to your account email when IP changes.
                </div>
              )}
            </div>

            {/* Webhook Notification */}
            <div className="info-card">
              <h3 style={{ marginBottom: '0.5rem' }}>Webhook Notification</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Get notified when your IP address changes. We'll send a POST request to your webhook URL with the old and new IP.
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/... or Telegram/Slack/any URL"
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
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveWebhook}
                  disabled={webhookSaving}
                >
                  {webhookSaving ? 'Saving...' : 'Save'}
                </button>
                {domain.webhook_url && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={async () => {
                      setWebhookUrl('');
                      setWebhookSaving(true);
                      try {
                        const r = await updateWebhook(subdomain!, null);
                        setDomain(r.data);
                        addToast('Webhook removed', 'success');
                      } catch {
                        addToast('Failed to remove webhook', 'error');
                      } finally {
                        setWebhookSaving(false);
                      }
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>

              {domain.webhook_url && (
                <div style={{
                  padding: '0.65rem 0.85rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--badge-active-text)', display: 'inline-block', flexShrink: 0 }} />
                  Webhook active: {domain.webhook_url}
                </div>
              )}

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <p style={{ marginBottom: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Supported platforms:</p>

                {/* Discord */}
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>Discord</div>
                  <ol style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <li>Open your Discord server and go to <strong>Server Settings → Integrations → Webhooks</strong></li>
                    <li>Click <strong>New Webhook</strong>, choose a channel, and give it a name</li>
                    <li>Click <strong>Copy Webhook URL</strong></li>
                    <li>Paste the URL above and click Save</li>
                  </ol>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    URL format: <code>https://discord.com/api/webhooks/123.../abc...</code>
                  </div>
                </div>

                {/* Telegram */}
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>Telegram</div>
                  <ol style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <li>Open Telegram and message <strong>@BotFather</strong></li>
                    <li>Send <code>/newbot</code> and follow the prompts to create a bot</li>
                    <li>Copy the <strong>bot token</strong> (e.g. <code>123456:ABC-DEF...</code>)</li>
                    <li>Add the bot to your group or start a chat with it</li>
                    <li>Get your <strong>chat ID</strong>: message your bot, then visit<br/>
                      <code style={{ fontSize: '0.7rem' }}>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code><br/>
                      and look for <code>"chat":{`{"id":`}</code> in the response</li>
                    <li>Paste this URL above and click Save:</li>
                  </ol>
                  <div style={{ marginTop: '0.5rem' }}>
                    <code style={{ fontSize: '0.72rem', wordBreak: 'break-all' }}>https://api.telegram.org/bot&lt;BOT_TOKEN&gt;/sendMessage?chat_id=&lt;CHAT_ID&gt;</code>
                  </div>
                </div>

                {/* Slack */}
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>Slack</div>
                  <ol style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <li>Go to <strong>api.slack.com/apps</strong> and create a new app (or use an existing one)</li>
                    <li>Navigate to <strong>Incoming Webhooks</strong> and enable them</li>
                    <li>Click <strong>Add New Webhook to Workspace</strong> and select a channel</li>
                    <li>Copy the <strong>Webhook URL</strong></li>
                    <li>Paste the URL above and click Save</li>
                  </ol>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    URL format: <code>https://hooks.slack.com/services/T.../B.../xxx...</code>
                  </div>
                </div>

                {/* Custom */}
                <div style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>Custom Webhook</div>
                  <p style={{ margin: '0 0 0.35rem 0' }}>
                    Any HTTP(S) endpoint. We send a <strong>POST</strong> request with JSON body:
                  </p>
                  <code style={{ fontSize: '0.75rem', display: 'block', padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: '4px', lineHeight: 1.5 }}>
                    {`{ "domain": "myhost", "old_ip": "1.2.3.4", "new_ip": "5.6.7.8", "timestamp": "2025-..." }`}
                  </code>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Setup Guide Tab */}
        {activeTab === 'setup' && (
          <section>
            {/* Desktop App CTA */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              boxShadow: '0 1px 3px var(--shadow-md)',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9rem' }}>Prefer a GUI?</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Download the Desktop App for automatic updates — no terminal needed.</div>
              </div>
              <a href="/downloads" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
                Download App
              </a>
            </div>

            {/* Platform Selector */}
            <div className="section-label">Script-Based Setup</div>
            <div style={{
              display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap',
            }}>
              {([
                { key: 'linux' as SetupPlatform, label: 'Linux', icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                )},
                { key: 'macos' as SetupPlatform, label: 'macOS', icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a8.4 8.4 0 00-2.3 6.4 4.2 4.2 0 003 4.2 4.8 4.8 0 01-1.5 3.4c-.8 1-1.7 2-3.2 2s-2.2-.6-3.4-.6-2.2.6-3.6.6" />
                    <rect x="4" y="3" width="16" height="18" rx="2" />
                  </svg>
                )},
                { key: 'windows' as SetupPlatform, label: 'Windows', icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                  </svg>
                )},
                { key: 'docker' as SetupPlatform, label: 'Docker', icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12.5c-.5-1-1.5-1.5-2.5-1.5h-.5v-2h-3v2h-2v-2h-3v2h-2v-3h-3v3h-.5C3 11 2 12 2 13.5S3.5 16 5 16h14c1.5 0 3-1.5 3-3.5z" />
                  </svg>
                )},
                { key: 'rpi' as SetupPlatform, label: 'Raspberry Pi', icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="16" height="16" rx="2" /><circle cx="9" cy="9" r="1" /><circle cx="15" cy="9" r="1" /><path d="M9 15h6" />
                  </svg>
                )},
              ]).map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setSetupPlatform(key)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.5rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 500,
                    border: setupPlatform === key ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-light)',
                    background: setupPlatform === key ? 'var(--accent-muted)' : 'var(--bg-card)',
                    color: setupPlatform === key ? 'var(--accent-text)' : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {/* Platform Content */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-light)',
              borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px var(--shadow-md)',
            }}>
              {/* Linux */}
              {setupPlatform === 'linux' && (
                <div style={{ padding: '1.5rem' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--text-heading)', marginBottom: '0.25rem' }}>Linux — Cron Job</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Updates your IP every 5 minutes using cron. Works on Ubuntu, Debian, Fedora, Arch, and any Linux distro.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-muted)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>1</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.2rem' }}>Open your crontab</div>
                        <div className="code-block" style={{ marginTop: '0.35rem' }}>
                          <code>crontab -e</code>
                          <button onClick={() => copyToClipboard('crontab -e', 'Command')} className="btn btn-secondary btn-sm">Copy</button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-muted)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>2</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.2rem' }}>Add this line at the bottom of the file</div>
                        <div className="code-block" style={{ marginTop: '0.35rem' }}>
                          <code>{`*/5 * * * * curl -s "${updateURL}" > /dev/null`}</code>
                          <button onClick={() => copyToClipboard(`*/5 * * * * curl -s "${updateURL}" > /dev/null`, 'Cron line')} className="btn btn-secondary btn-sm">Copy</button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-muted)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>3</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.2rem' }}>Save and exit</div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                          Press <code>Ctrl+X</code>, then <code>Y</code>, then <code>Enter</code> (for nano). The cron job is now active and will run every 5 minutes.
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-secondary)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.2rem' }}>Verify it works</div>
                        <div className="code-block" style={{ marginTop: '0.35rem' }}>
                          <code>{`curl -s "${updateURL}"`}</code>
                          <button onClick={() => copyToClipboard(`curl -s "${updateURL}"`, 'Test command')} className="btn btn-secondary btn-sm">Copy</button>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.35rem 0 0 0' }}>
                          Should return <code>OK</code>. Check back on the IP History tab to confirm.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* macOS */}
              {setupPlatform === 'macos' && (
                <div style={{ padding: '1.5rem' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--text-heading)', marginBottom: '0.25rem' }}>macOS — launchd</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    The recommended way on macOS. Runs as a background agent — survives reboots and resumes after sleep.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-muted)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>1</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.2rem' }}>Create the plist file</div>
                        <div className="code-block" style={{ marginTop: '0.35rem' }}>
                          <code>{`nano ~/Library/LaunchAgents/com.ddns.update.plist`}</code>
                          <button onClick={() => copyToClipboard(`nano ~/Library/LaunchAgents/com.ddns.update.plist`, 'Command')} className="btn btn-secondary btn-sm">Copy</button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-muted)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>2</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.2rem' }}>Paste this content and save</div>
                        <div className="code-block" style={{ marginTop: '0.35rem' }}>
                          <code style={{ fontSize: '0.68rem', whiteSpace: 'pre' }}>{`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.ddns.update</string>
  <key>ProgramArguments</key>
  <array>
    <string>curl</string>
    <string>-s</string>
    <string>${updateURL}</string>
  </array>
  <key>StartInterval</key>
  <integer>300</integer>
</dict>
</plist>`}</code>
                          <button onClick={() => copyToClipboard(`<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"\n  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>Label</key>\n  <string>com.ddns.update</string>\n  <key>ProgramArguments</key>\n  <array>\n    <string>curl</string>\n    <string>-s</string>\n    <string>${updateURL}</string>\n  </array>\n  <key>StartInterval</key>\n  <integer>300</integer>\n</dict>\n</plist>`, 'Plist content')} className="btn btn-secondary btn-sm">Copy</button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-muted)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>3</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.2rem' }}>Load the agent</div>
                        <div className="code-block" style={{ marginTop: '0.35rem' }}>
                          <code>launchctl load ~/Library/LaunchAgents/com.ddns.update.plist</code>
                          <button onClick={() => copyToClipboard('launchctl load ~/Library/LaunchAgents/com.ddns.update.plist', 'Load command')} className="btn btn-secondary btn-sm">Copy</button>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.35rem 0 0 0' }}>
                          To stop: <code>launchctl unload ~/Library/LaunchAgents/com.ddns.update.plist</code>
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-secondary)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.2rem' }}>Verify it works</div>
                        <div className="code-block" style={{ marginTop: '0.35rem' }}>
                          <code>{`curl -s "${updateURL}"`}</code>
                          <button onClick={() => copyToClipboard(`curl -s "${updateURL}"`, 'Test command')} className="btn btn-secondary btn-sm">Copy</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Windows */}
              {setupPlatform === 'windows' && (
                <div style={{ padding: '1.5rem' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--text-heading)', marginBottom: '0.25rem' }}>Windows — Task Scheduler + PowerShell</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Creates a scheduled task that runs every 5 minutes in the background. No extra software required.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-muted)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>1</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.2rem' }}>Open PowerShell as Administrator</div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                          Right-click the Start menu → <strong>Terminal (Admin)</strong> or search for "PowerShell" and select "Run as administrator".
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-muted)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>2</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.2rem' }}>Create the scheduled task</div>
                        <div className="code-block" style={{ marginTop: '0.35rem' }}>
                          <code style={{ fontSize: '0.7rem', whiteSpace: 'pre-wrap' }}>{`$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -Command Invoke-WebRequest -Uri '${updateURL}'"
$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 5) -Once -At (Get-Date)
Register-ScheduledTask -TaskName "DDNS-Update" -Action $action -Trigger $trigger -RunLevel Highest`}</code>
                          <button onClick={() => copyToClipboard(`$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -Command Invoke-WebRequest -Uri '${updateURL}'"\n$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 5) -Once -At (Get-Date)\nRegister-ScheduledTask -TaskName "DDNS-Update" -Action $action -Trigger $trigger -RunLevel Highest`, 'PowerShell script')} className="btn btn-secondary btn-sm">Copy</button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-secondary)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.2rem' }}>Test it manually</div>
                        <div className="code-block" style={{ marginTop: '0.35rem' }}>
                          <code>{`Invoke-WebRequest -Uri "${updateURL}"`}</code>
                          <button onClick={() => copyToClipboard(`Invoke-WebRequest -Uri "${updateURL}"`, 'PowerShell command')} className="btn btn-secondary btn-sm">Copy</button>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.35rem 0 0 0' }}>
                          To remove: <code>Unregister-ScheduledTask -TaskName "DDNS-Update" -Confirm:$false</code>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Docker */}
              {setupPlatform === 'docker' && (
                <div style={{ padding: '1.5rem' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--text-heading)', marginBottom: '0.25rem' }}>Docker — Container</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Run a tiny sidecar container that updates your IP. Perfect for servers and NAS devices already running Docker.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-muted)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>1</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.2rem' }}>Option A: One-liner (docker run)</div>
                        <div className="code-block" style={{ marginTop: '0.35rem' }}>
                          <code style={{ fontSize: '0.72rem', whiteSpace: 'pre-wrap' }}>{`docker run -d --name ddns-updater --restart=always alpine/curl sh -c "while true; do curl -s '${updateURL}'; sleep 300; done"`}</code>
                          <button onClick={() => copyToClipboard(`docker run -d --name ddns-updater --restart=always alpine/curl sh -c "while true; do curl -s '${updateURL}'; sleep 300; done"`, 'Docker command')} className="btn btn-secondary btn-sm">Copy</button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-muted)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>2</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.2rem' }}>Option B: Docker Compose</div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.35rem' }}>Add to your <code>docker-compose.yml</code>:</p>
                        <div className="code-block" style={{ marginTop: '0.35rem' }}>
                          <code style={{ fontSize: '0.72rem', whiteSpace: 'pre' }}>{`services:
  ddns-updater:
    image: alpine/curl
    restart: always
    command: >
      sh -c "while true; do
        curl -s '${updateURL}';
        sleep 300;
      done"`}</code>
                          <button onClick={() => copyToClipboard(`services:\n  ddns-updater:\n    image: alpine/curl\n    restart: always\n    command: >\n      sh -c "while true; do\n        curl -s '${updateURL}';\n        sleep 300;\n      done"`, 'Docker Compose')} className="btn btn-secondary btn-sm">Copy</button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-secondary)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.2rem' }}>Check logs</div>
                        <div className="code-block" style={{ marginTop: '0.35rem' }}>
                          <code>docker logs ddns-updater</code>
                          <button onClick={() => copyToClipboard('docker logs ddns-updater', 'Command')} className="btn btn-secondary btn-sm">Copy</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Raspberry Pi */}
              {setupPlatform === 'rpi' && (
                <div style={{ padding: '1.5rem' }}>
                  <h4 style={{ fontSize: '1rem', color: 'var(--text-heading)', marginBottom: '0.25rem' }}>Raspberry Pi — Cron + systemd</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Ideal for always-on home servers. Uses cron just like Linux — your Pi keeps your DNS up to date 24/7.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-muted)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>1</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.2rem' }}>SSH into your Raspberry Pi</div>
                        <div className="code-block" style={{ marginTop: '0.35rem' }}>
                          <code>ssh pi@raspberrypi.local</code>
                          <button onClick={() => copyToClipboard('ssh pi@raspberrypi.local', 'SSH command')} className="btn btn-secondary btn-sm">Copy</button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-muted)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>2</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.2rem' }}>Make sure curl is installed</div>
                        <div className="code-block" style={{ marginTop: '0.35rem' }}>
                          <code>sudo apt-get update && sudo apt-get install -y curl</code>
                          <button onClick={() => copyToClipboard('sudo apt-get update && sudo apt-get install -y curl', 'Install command')} className="btn btn-secondary btn-sm">Copy</button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-muted)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>3</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.2rem' }}>Add the cron job</div>
                        <div className="code-block" style={{ marginTop: '0.35rem' }}>
                          <code style={{ fontSize: '0.72rem', whiteSpace: 'pre-wrap' }}>{`(crontab -l 2>/dev/null; echo '*/5 * * * * curl -s "${updateURL}" > /dev/null') | crontab -`}</code>
                          <button onClick={() => copyToClipboard(`(crontab -l 2>/dev/null; echo '*/5 * * * * curl -s "${updateURL}" > /dev/null') | crontab -`, 'Cron setup')} className="btn btn-secondary btn-sm">Copy</button>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.35rem 0 0 0' }}>
                          This one-liner safely appends to your existing crontab without overwriting it.
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-secondary)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.2rem' }}>Verify it works</div>
                        <div className="code-block" style={{ marginTop: '0.35rem' }}>
                          <code>{`curl -s "${updateURL}"`}</code>
                          <button onClick={() => copyToClipboard(`curl -s "${updateURL}"`, 'Test command')} className="btn btn-secondary btn-sm">Copy</button>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.35rem 0 0 0' }}>
                          Should return <code>OK</code>. Your Pi will now keep your DNS record updated automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Troubleshooting */}
            <div style={{
              marginTop: '1.25rem', padding: '1rem 1.25rem',
              background: 'var(--bg-card)', border: '1px solid var(--border-light)',
              borderRadius: '10px', boxShadow: '0 1px 3px var(--shadow-md)',
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-heading)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                Troubleshooting
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div><strong>Getting "KO - invalid token"?</strong> — Regenerate your token and update the URL in your script.</div>
                <div><strong>IP not updating?</strong> — Make sure your script is actually running. Check <code>crontab -l</code> or Task Scheduler.</div>
                <div><strong>Need help?</strong> — Check the <Link to="/api-docs" style={{ color: 'var(--accent-text)' }}>API Docs</Link> or <Link to="/downloads" style={{ color: 'var(--accent-text)' }}>Downloads</Link> page for more options.</div>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="footer">
          DDNS Service &middot; <a href="/downloads">Downloads &amp; Setup Guides</a>
        </footer>
      </div>
    </>
  );
}
