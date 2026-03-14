import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { pool } from '../db.js';

export interface AuthUser {
  sub: string;
  email: string;
  sid?: string; // session id
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
      const payload = jwt.verify(cookieToken, config.JWT_SECRET) as AuthUser & { sid?: string };
      req.user = { sub: payload.sub, email: payload.email, sid: payload.sid };

      const result = await pool.query('SELECT blocked FROM users WHERE id=$1', [payload.sub]);
      if (result.rows.length && result.rows[0].blocked) {
        res.status(403).json({ error: 'Your account has been blocked. Contact the administrator.' });
        return;
      }

      // Validate session exists (if JWT has sid) and update last_active
      if (payload.sid) {
        const sess = await pool.query('SELECT id FROM sessions WHERE id=$1 AND user_id=$2', [payload.sid, payload.sub]);
        if (!sess.rows.length) {
          res.status(401).json({ error: 'Session has been revoked. Please log in again.' });
          return;
        }
        // Update last_active (fire-and-forget, don't block request)
        pool.query('UPDATE sessions SET last_active=NOW() WHERE id=$1', [payload.sid]).catch(() => {});
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
