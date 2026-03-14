import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { pool } from '../db.js';

export interface AuthUser {
  sub: string;
  email: string;
}

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as AuthUser;
    req.user = payload;

    // Check if user is blocked
    const result = await pool.query('SELECT blocked FROM users WHERE id=$1', [payload.sub]);
    if (result.rows.length && result.rows[0].blocked) {
      res.status(403).json({ error: 'Your account has been blocked. Contact the administrator.' });
      return;
    }

    next();
  } catch {
    res.status(401).json({ error: 'Session expired' });
  }
}
