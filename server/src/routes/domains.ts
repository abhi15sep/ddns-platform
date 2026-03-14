import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db.js';
import { deleteDNSRecord } from '../powerdns.js';
import { requireAuth, AuthUser } from '../middleware/requireAuth.js';

const router = Router();
router.use(requireAuth);

// List all domains for logged-in user
router.get('/', async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM domains WHERE user_id=$1 ORDER BY created_at DESC',
    [(req.user as AuthUser).sub]
  );
  res.json(result.rows);
});

// Create a new subdomain (max 3 per user)
router.post('/', async (req: Request, res: Response) => {
  const { subdomain } = req.body;
  if (!subdomain || !/^[a-z0-9-]{3,63}$/.test(subdomain)) {
    res.status(400).json({ error: 'Invalid subdomain (3-63 chars, lowercase alphanumeric and hyphens)' });
    return;
  }

  const userId = (req.user as AuthUser).sub;

  // Enforce 3-domain limit per user
  const countResult = await pool.query(
    'SELECT COUNT(*) FROM domains WHERE user_id=$1',
    [userId]
  );
  if (Number(countResult.rows[0].count) >= 5) {
    res.status(403).json({ error: 'Domain limit reached (max 5 per account)' });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO domains (user_id, subdomain, token)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, subdomain, uuidv4()]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Subdomain already taken' });
      return;
    }
    throw err;
  }
});

// Delete a subdomain
router.delete('/:subdomain', async (req: Request, res: Response) => {
  const { subdomain } = req.params;
  const result = await pool.query(
    'DELETE FROM domains WHERE subdomain=$1 AND user_id=$2 RETURNING *',
    [subdomain, (req.user as AuthUser).sub]
  );
  if (!result.rows.length) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  try {
    await deleteDNSRecord(subdomain as string);
  } catch (err) {
    console.error('Failed to delete DNS record:', err);
  }
  res.json({ ok: true });
});

// Update webhook URL
router.put('/:subdomain/webhook', async (req: Request, res: Response) => {
  const { webhook_url } = req.body;

  // Allow null/empty to clear, otherwise validate URL
  if (webhook_url && typeof webhook_url === 'string' && webhook_url.trim()) {
    try {
      const url = new URL(webhook_url.trim());
      if (!['http:', 'https:'].includes(url.protocol)) {
        res.status(400).json({ error: 'Webhook URL must use http or https' });
        return;
      }
    } catch {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }
  }

  const result = await pool.query(
    'UPDATE domains SET webhook_url=$1 WHERE subdomain=$2 AND user_id=$3 RETURNING *',
    [webhook_url?.trim() || null, req.params.subdomain, (req.user as AuthUser).sub]
  );
  if (!result.rows.length) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(result.rows[0]);
});

// Toggle email notification
router.put('/:subdomain/notify-email', async (req: Request, res: Response) => {
  const { enabled } = req.body;
  const result = await pool.query(
    'UPDATE domains SET notify_email=$1 WHERE subdomain=$2 AND user_id=$3 RETURNING *',
    [!!enabled, req.params.subdomain, (req.user as AuthUser).sub]
  );
  if (!result.rows.length) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(result.rows[0]);
});

// Regenerate token
router.post('/:subdomain/regenerate-token', async (req: Request, res: Response) => {
  const result = await pool.query(
    'UPDATE domains SET token=$1 WHERE subdomain=$2 AND user_id=$3 RETURNING *',
    [uuidv4(), req.params.subdomain, (req.user as AuthUser).sub]
  );
  if (!result.rows.length) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(result.rows[0]);
});

// Get update history (configurable range: 3h, 24h, 7d, 30d)
router.get('/:subdomain/history', async (req: Request, res: Response) => {
  const validRanges: Record<string, string> = {
    '3h': '3 hours',
    '24h': '24 hours',
    '7d': '7 days',
    '30d': '30 days',
  };
  const range = (req.query.range as string) || '24h';
  const interval = validRanges[range] || '24 hours';
  const limit = range === '30d' ? 2000 : range === '7d' ? 1000 : 500;

  const result = await pool.query(
    `SELECT ip, source_ip, user_agent, updated_at FROM update_log
     WHERE domain=$1 AND updated_at >= NOW() - INTERVAL '${interval}'
     ORDER BY updated_at DESC LIMIT $2`,
    [req.params.subdomain, limit]
  );
  res.json(result.rows);
});

export default router;