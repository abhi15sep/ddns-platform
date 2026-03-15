import { pool } from './db.js';
import { config } from './config.js';

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const RETENTION_DAYS = 90;

type ServiceStatus = 'ok' | 'degraded' | 'down';

interface CheckResult {
  service: string;
  status: ServiceStatus;
  latency_ms: number | null;
  detail: string;
}

let lastOverallStatus: ServiceStatus | null = null;

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    return { service: 'database', status: 'ok', latency_ms: Date.now() - start, detail: 'Connected' };
  } catch (err: any) {
    return { service: 'database', status: 'down', latency_ms: null, detail: err.message?.slice(0, 200) || 'Unreachable' };
  }
}

async function checkDNS(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch(
      `${config.PDNS_API_URL}/api/v1/servers/localhost/zones/${config.DDNS_ZONE}.`,
      { headers: { 'X-API-Key': config.PDNS_API_KEY }, signal: AbortSignal.timeout(10000) }
    );
    const latency = Date.now() - start;
    if (res.ok) {
      return { service: 'dns', status: 'ok', latency_ms: latency, detail: 'PowerDNS responding' };
    }
    return { service: 'dns', status: 'degraded', latency_ms: latency, detail: `HTTP ${res.status}` };
  } catch (err: any) {
    return { service: 'dns', status: 'down', latency_ms: null, detail: err.message?.slice(0, 200) || 'Unreachable' };
  }
}

async function sendAlertEmail(newStatus: ServiceStatus, results: CheckResult[]) {
  if (!config.SMTP_HOST || !config.SMTP_USER) return;
  try {
    // Get admin emails
    const adminResult = await pool.query("SELECT email FROM users WHERE is_admin = TRUE LIMIT 5");
    if (adminResult.rows.length === 0) return;

    const { default: nodemailer } = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: Number(config.SMTP_PORT),
      secure: Number(config.SMTP_PORT) === 465,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
    });

    const statusEmoji = newStatus === 'ok' ? 'Recovered' : newStatus === 'degraded' ? 'Degraded' : 'DOWN';
    const details = results.map(r => `${r.service}: ${r.status} (${r.detail})`).join('\n');
    const timestamp = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

    for (const row of adminResult.rows) {
      await transporter.sendMail({
        from: config.SMTP_FROM,
        to: row.email,
        subject: `[DDNS Monitor] Service ${statusEmoji}`,
        text: `DDNS Platform Status: ${statusEmoji}\nTime: ${timestamp}\n\nDetails:\n${details}\n\nCheck: ${config.APP_URL}/status`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
            <h2 style="color: ${newStatus === 'ok' ? '#059669' : newStatus === 'degraded' ? '#d97706' : '#dc2626'};">
              Service ${statusEmoji}
            </h2>
            <p style="color: #6b7280;">${timestamp}</p>
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin: 1rem 0;">
              ${results.map(r => `<div style="padding: 0.3rem 0;"><strong>${r.service}</strong>: <span style="color: ${r.status === 'ok' ? '#059669' : r.status === 'degraded' ? '#d97706' : '#dc2626'}">${r.status}</span> — ${r.detail}</div>`).join('')}
            </div>
            <a href="${config.APP_URL}/status" style="color: #4f46e5;">View Status Page</a>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0;" />
            <p style="color: #9ca3af; font-size: 0.75rem;">DDNS Uptime Monitor &mdash; devops-monk.com</p>
          </div>
        `,
      });
    }
  } catch (err) {
    console.error('Failed to send uptime alert email:', err);
  }
}

async function runChecks() {
  const results: CheckResult[] = [];

  // API is implicitly up since this code is running
  results.push({ service: 'api', status: 'ok', latency_ms: 0, detail: 'Running' });

  const [dbResult, dnsResult] = await Promise.all([checkDatabase(), checkDNS()]);
  results.push(dbResult, dnsResult);

  // Store results
  try {
    const values = results.map((r, i) =>
      `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`
    ).join(', ');
    const params = results.flatMap(r => [r.service, r.status, r.latency_ms, r.detail]);
    await pool.query(
      `INSERT INTO uptime_checks (service, status, latency_ms, detail) VALUES ${values}`,
      params
    );
  } catch (err) {
    console.error('Failed to store uptime check:', err);
  }

  // Determine overall status
  const statuses = results.map(r => r.status);
  let overall: ServiceStatus = 'ok';
  if (statuses.some(s => s === 'down')) overall = 'down';
  else if (statuses.some(s => s === 'degraded')) overall = 'degraded';

  // Send alert on status change
  if (lastOverallStatus !== null && lastOverallStatus !== overall) {
    sendAlertEmail(overall, results);
  }
  lastOverallStatus = overall;

  // Cleanup old checks (run occasionally)
  if (Math.random() < 0.01) {
    try {
      await pool.query(
        `DELETE FROM uptime_checks WHERE checked_at < NOW() - INTERVAL '${RETENTION_DAYS} days'`
      );
    } catch { /* ignore */ }
  }
}

export function startUptimeMonitor() {
  // Run first check after a short delay (let server finish starting)
  setTimeout(() => {
    runChecks();
    setInterval(runChecks, CHECK_INTERVAL);
  }, 10_000);
  console.log('Uptime monitor started (checking every 5 minutes)');
}