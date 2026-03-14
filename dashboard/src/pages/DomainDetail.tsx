import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getDomains,
  getDomainHistory,
  regenerateToken,
  updateWebhook,
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
}

interface HistoryEntry {
  ip: string;
  source_ip: string;
  user_agent: string;
  updated_at: string;
}

type TabName = 'update' | 'history' | 'setup' | 'notifications';

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
                        tickFormatter={(v: string) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                <div className="empty-state-title">No updates in the last 3 hours</div>
                <div className="empty-state-desc">
                  Update logs are kept for 3 hours. Send an update using the Update URL tab to see IP history here.
                </div>
              </div>
            )}
          </section>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <section>
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
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
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
          DDNS Service &middot; <a href="/downloads">Downloads &amp; Setup Guides</a>
        </footer>
      </div>
    </>
  );
}
