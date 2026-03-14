import { Router, Request, Response } from 'express';
import passport from '../auth/passport.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { config } from '../config.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  message: { error: 'Too many attempts, try again later' },
});

function issueJWT(res: Response, user: { id: string; email: string }) {
  const token = jwt.sign(
    { sub: user.id, email: user.email },
    config.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.cookie('token', token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// Google OAuth
router.get('/google', passport.authenticate('google'));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${config.APP_URL}/login?error=1` }),
  (req: Request, res: Response) => {
    issueJWT(res, req.user as any);
    res.redirect(`${config.APP_URL}/dashboard`);
  }
);

// GitHub OAuth
router.get('/github', passport.authenticate('github'));
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${config.APP_URL}/login?error=1` }),
  (req: Request, res: Response) => {
    issueJWT(res, req.user as any);
    res.redirect(`${config.APP_URL}/dashboard`);
  }
);

// Local login
router.post('/login', authLimiter, (req: Request, res: Response, next) => {
  passport.authenticate('local', { session: false }, (err: any, user: any, info: any) => {
    if (err) return next(err);
    if (!user) {
      res.status(401).json({ error: info?.message || 'Invalid credentials' });
      return;
    }
    issueJWT(res, user);
    res.json({ ok: true, user: { id: user.id, email: user.email } });
  })(req, res, next);
});

// Register
router.post('/register', authLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 8) {
    res.status(400).json({ error: 'Email and password (min 8 chars) required' });
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  try {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hash]
    );
    issueJWT(res, result.rows[0]);
    res.json({ ok: true, user: result.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    throw err;
  }
});

// Get current user
router.get('/me', (req: Request, res: Response) => {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as any;
    res.json({ id: payload.sub, email: payload.email });
  } catch {
    res.status(401).json({ error: 'Session expired' });
  }
});

// Logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

export default router;