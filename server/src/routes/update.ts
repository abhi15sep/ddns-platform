import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { updateDNSRecord } from '../powerdns.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 30_000,
  max: 1,
  keyGenerator: (req: Request) => (req.query.token as string) || req.ip || '',
  message: 'KO - rate limited, try again in 30 seconds',
});

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

router.get('/', limiter, async (req: Request, res: Response) => {
  const { domain, token, ip } = req.query;

  if (!domain || !token) {
    res.status(400).send('KO - missing params');
    return;
  }

  const detectedIP = (ip as string) || detectIP(req);

  // Validate IP (v4 or v6)
  const isV4 = IPV4_RE.test(detectedIP);
  const isV6 = IPV6_RE.test(detectedIP);
  if (!isV4 && !isV6) {
    res.status(400).send('KO - invalid IP');
    return;
  }

  try {
    // Validate token
    const result = await pool.query(
      'SELECT * FROM domains WHERE subdomain=$1 AND token=$2',
      [domain, token]
    );
    if (!result.rows.length) {
      res.status(403).send('KO - invalid token');
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

    // Prune logs older than 1 hour for this domain
    await pool.query(
      "DELETE FROM update_log WHERE domain=$1 AND updated_at < NOW() - INTERVAL '1 hour'",
      [domain]
    );

    res.send('OK');
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).send('KO - server error');
  }
});

export default router;