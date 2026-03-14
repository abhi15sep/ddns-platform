import { Request, Response, NextFunction } from 'express';
import { pool } from '../db.js';
import { AuthUser } from './requireAuth.js';

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user as AuthUser;
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const result = await pool.query(
    'SELECT is_admin FROM users WHERE id=$1',
    [user.sub]
  );

  if (!result.rows.length || !result.rows[0].is_admin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}