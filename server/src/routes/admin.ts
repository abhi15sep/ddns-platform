import { Router, Request, Response } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

// Overview stats
router.get('/stats', async (_req: Request, res: Response) => {
  const [users, domains, updates, blocked] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM users'),
    pool.query('SELECT COUNT(*) FROM domains'),
    pool.query("SELECT COUNT(*) FROM update_log WHERE updated_at >= NOW() - INTERVAL '1 hour'"),
    pool.query('SELECT COUNT(*) FROM users WHERE blocked = TRUE'),
  ]);

  res.json({
    totalUsers: Number(users.rows[0].count),
    totalDomains: Number(domains.rows[0].count),
    updatesLastHour: Number(updates.rows[0].count),
    blockedUsers: Number(blocked.rows[0].count),
  });
});

// List all users with their domains
router.get('/users', async (req: Request, res: Response) => {
  const { search } = req.query;

  let query = `
    SELECT
      u.id,
      u.email,
      u.is_admin,
      u.blocked,
      u.created_at,
      COUNT(d.id) AS domain_count,
      ARRAY_AGG(d.subdomain ORDER BY d.created_at) FILTER (WHERE d.id IS NOT NULL) AS domains
    FROM users u
    LEFT JOIN domains d ON d.user_id = u.id
  `;
  const params: string[] = [];

  if (search && typeof search === 'string' && search.trim()) {
    query += ' WHERE u.email ILIKE $1';
    params.push(`%${search.trim()}%`);
  }

  query += ' GROUP BY u.id ORDER BY u.created_at DESC';

  const result = await pool.query(query, params);
  res.json(result.rows);
});

// Block a user
router.post('/users/:userId/block', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const result = await pool.query(
    'UPDATE users SET blocked = TRUE WHERE id = $1 AND is_admin = FALSE RETURNING id, email, blocked',
    [userId]
  );
  if (!result.rows.length) {
    res.status(404).json({ error: 'User not found or cannot block an admin' });
    return;
  }
  res.json(result.rows[0]);
});

// Unblock a user
router.post('/users/:userId/unblock', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const result = await pool.query(
    'UPDATE users SET blocked = FALSE WHERE id = $1 RETURNING id, email, blocked',
    [userId]
  );
  if (!result.rows.length) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(result.rows[0]);
});

// Recent update activity (last hour, grouped by domain)
router.get('/activity', async (_req: Request, res: Response) => {
  const result = await pool.query(`
    SELECT
      l.domain,
      COUNT(*) AS update_count,
      MAX(l.updated_at) AS last_update,
      MAX(l.ip) AS last_ip,
      u.email AS owner_email,
      u.id AS user_id,
      u.blocked AS user_blocked
    FROM update_log l
    JOIN domains d ON d.subdomain = l.domain
    JOIN users u ON u.id = d.user_id
    WHERE l.updated_at >= NOW() - INTERVAL '1 hour'
    GROUP BY l.domain, u.email, u.id, u.blocked
    ORDER BY update_count DESC
    LIMIT 50
  `);
  res.json(result.rows);
});

// Check if current user is admin
router.get('/check', (_req: Request, res: Response) => {
  res.json({ admin: true });
});

export default router;