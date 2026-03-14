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
  // Try JWT session cookie first
  const cookieToken = req.cookies?.token;

  // Try API token from Authorization header (Bearer <api_token>)
  const authHeader = req.headers.authorization;
  const apiToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (cookieToken) {
    try {
      const payload = jwt.verify(cookieToken, config.JWT_SECRET) as AuthUser;
      req.user = payload;

      const result = await pool.query('SELECT blocked FROM users WHERE id=$1', [payload.sub]);
      if (result.rows.length && result.rows[0].blocked) {
        res.status(403).json({ error: 'Your account has been blocked. Contact the administrator.' });
        return;
      }

      next();
      return;
    } catch {
      // Fall through to check API token
    }
  }

  if (apiToken) {
    const result = await pool.query('SELECT id, email, blocked FROM users WHERE api_token=$1', [apiToken]);
    if (result.rows.length) {
      const user = result.rows[0];
      if (user.blocked) {
        res.status(403).json({ error: 'Your account has been blocked. Contact the administrator.' });
        return;
      }
      req.user = { sub: user.id, email: user.email };
      next();
      return;
    }
  }

  res.status(401).json({ error: 'Not authenticated. Provide a session cookie or Authorization: Bearer <api_token> header.' });
}
