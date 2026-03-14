import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { updateDNSRecord } from '../powerdns.js';

const router = Router();

async function fireWebhook(url: string, domain: string, oldIP: string, newIP: string) {
  const timestamp = new Date().toISOString();
  const isDiscord = url.includes('discord.com/api/webhooks');
  const isSlack = url.includes('hooks.slack.com');
  const isTelegram = url.includes('api.telegram.org/bot');

  let body: string;
  let fetchUrl = url;

  if (isDiscord) {
    body = JSON.stringify({
      content: `**DDNS Update** — \`${domain}.dyn.devops-monk.com\`\nIP changed: \`${oldIP}\` → \`${newIP}\`\nTime: ${timestamp}`,
    });
  } else if (isSlack) {
    body = JSON.stringify({
      text: `*DDNS Update* — \`${domain}.dyn.devops-monk.com\`\nIP changed: \`${oldIP}\` → \`${newIP}\`\nTime: ${timestamp}`,
    });
  } else if (isTelegram) {
    // Extract chat_id from query string: https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<ID>
    const parsed = new URL(url);
    const chatId = parsed.searchParams.get('chat_id');
    if (!chatId) {
      throw new Error('Telegram webhook URL missing chat_id parameter');
    }
    // Remove chat_id from URL since we send it in the body
    parsed.searchParams.delete('chat_id');
    // Ensure path ends with /sendMessage
    if (!parsed.pathname.endsWith('/sendMessage')) {
      parsed.pathname = parsed.pathname.replace(/\/?$/, '/sendMessage');
    }
    fetchUrl = parsed.toString();
    body = JSON.stringify({
      chat_id: chatId,
      text: `*DDNS Update* — \`${domain}.dyn.devops-monk.com\`\nIP changed: \`${oldIP}\` → \`${newIP}\`\nTime: ${timestamp}`,
      parse_mode: 'Markdown',
    });
  } else {
    body = JSON.stringify({ domain, old_ip: oldIP, new_ip: newIP, timestamp });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    await fetch(fetchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

// Cache settings in memory, refresh every 30s
let cachedSettings: { perToken: number; perAccount: number; windowSec: number } = {
  perToken: 6,
  perAccount: 15,
  windowSec: 60,
};

async function refreshSettings() {
  try {
    const result = await pool.query("SELECT key, value FROM settings WHERE key IN ('rate_limit_per_token', 'rate_limit_per_account', 'rate_limit_window_seconds')");
    for (const row of result.rows) {
      if (row.key === 'rate_limit_per_token') cachedSettings.perToken = Number(row.value) || 6;
      if (row.key === 'rate_limit_per_account') cachedSettings.perAccount = Number(row.value) || 15;
      if (row.key === 'rate_limit_window_seconds') cachedSettings.windowSec = Number(row.value) || 60;
    }
  } catch {
    // Table might not exist yet, use defaults
  }
}

// Refresh on startup and every 30s
refreshSettings();
setInterval(refreshSettings, 30_000);

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

function detectIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
      .split(',')[0]
      .trim();
    return first;
  }
  return req.socket.remoteAddress || '';
}

router.get('/', async (req: Request, res: Response) => {
  const { domain, token, ip } = req.query;

  if (!domain || !token) {
    res.status(400).send('KO - missing params');
    return;
  }

  try {
    // Validate token and check if user is blocked
    const result = await pool.query(
      `SELECT d.*, u.blocked, u.id AS user_id FROM domains d
       JOIN users u ON u.id = d.user_id
       WHERE d.subdomain=$1 AND d.token=$2`,
      [domain, token]
    );
    if (!result.rows.length) {
      res.status(403).send('KO - invalid token');
      return;
    }
    if (result.rows[0].blocked) {
      res.status(403).send('KO - account blocked');
      return;
    }

    const userId = result.rows[0].user_id;
    const windowSec = cachedSettings.windowSec;

    // Rate limit check: per token (domain)
    const tokenCount = await pool.query(
      `SELECT COUNT(*) FROM update_log WHERE domain=$1 AND updated_at >= NOW() - INTERVAL '1 second' * $2`,
      [domain, windowSec]
    );
    if (Number(tokenCount.rows[0].count) >= cachedSettings.perToken) {
      res.status(429).send(`KO - rate limited (${cachedSettings.perToken} per ${windowSec}s per domain)`);
      return;
    }

    // Rate limit check: per account (all domains belonging to user)
    const accountCount = await pool.query(
      `SELECT COUNT(*) FROM update_log l
       JOIN domains d ON d.subdomain = l.domain
       WHERE d.user_id = $1 AND l.updated_at >= NOW() - INTERVAL '1 second' * $2`,
      [userId, windowSec]
    );
    if (Number(accountCount.rows[0].count) >= cachedSettings.perAccount) {
      res.status(429).send(`KO - rate limited (${cachedSettings.perAccount} per ${windowSec}s per account)`);
      return;
    }

    const detectedIP = (ip as string) || detectIP(req);
    const oldIP = result.rows[0].current_ip;
    const webhookUrl = result.rows[0].webhook_url;

    // Validate IP (v4 or v6)
    const isV4 = IPV4_RE.test(detectedIP);
    const isV6 = IPV6_RE.test(detectedIP);
    if (!isV4 && !isV6) {
      res.status(400).send('KO - invalid IP');
      return;
    }

    const recordType = isV6 ? 'AAAA' : 'A';

    // Update DNS
    await updateDNSRecord(domain as string, detectedIP, recordType);

    // Update app database
    await pool.query(
      'UPDATE domains SET current_ip=$1, updated_at=NOW() WHERE subdomain=$2',
      [detectedIP, domain]
    );

    // Fire webhook if IP changed and webhook is configured
    if (webhookUrl && oldIP && oldIP !== detectedIP) {
      fireWebhook(webhookUrl, domain as string, oldIP, detectedIP).catch((err) =>
        console.error(`Webhook failed for ${domain}:`, err)
      );
    }

    // Log the update
    await pool.query(
      'INSERT INTO update_log (domain, ip, source_ip, user_agent) VALUES ($1, $2, $3, $4)',
      [
        domain,
        detectedIP,
        req.ip || detectIP(req),
        req.headers['user-agent'] || null,
      ]
    );

    // Prune logs older than 3 hours for this domain
    await pool.query(
      "DELETE FROM update_log WHERE domain=$1 AND updated_at < NOW() - INTERVAL '3 hours'",
      [domain]
    );

    res.send('OK');
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).send('KO - server error');
  }
});

export default router;
