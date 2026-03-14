import { Router, Request, Response } from 'express';
import passport from '../auth/passport.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { config } from '../config.js';
import { sendPasswordResetEmail } from '../email.js';

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

// Forgot password — request reset email
router.post('/forgot-password', authLimiter, async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  // Always return success to prevent email enumeration
  const successMsg = { ok: true, message: 'If that email exists, a reset link has been sent.' };

  if (!config.SMTP_HOST) {
    console.error('Password reset requested but SMTP is not configured');
    res.json(successMsg);
    return;
  }

  try {
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE email=$1 AND password_hash IS NOT NULL',
      [email.trim().toLowerCase()]
    );
    if (!userResult.rows.length) {
      res.json(successMsg);
      return;
    }

    const user = userResult.rows[0];

    // Invalidate any existing unused tokens for this user
    await pool.query(
      'UPDATE password_reset_tokens SET used=TRUE WHERE user_id=$1 AND used=FALSE',
      [user.id]
    );

    // Generate token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    const resetUrl = `${config.APP_URL}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);

    res.json(successMsg);
  } catch (err) {
    console.error('Forgot password error:', err);
    res.json(successMsg);
  }
});

// Reset password — set new password with token
router.post('/reset-password', authLimiter, async (req: Request, res: Response) => {
  const { token, password } = req.body;
  if (!token || !password) {
    res.status(400).json({ error: 'Token and new password are required' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query(
      `SELECT t.id, t.user_id FROM password_reset_tokens t
       WHERE t.token_hash=$1 AND t.used=FALSE AND t.expires_at > NOW()`,
      [tokenHash]
    );
    if (!result.rows.length) {
      res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
      return;
    }

    const { id: tokenId, user_id: userId } = result.rows[0];

    // Update password
    const hash = await bcrypt.hash(password, 12);
    await pool.query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, userId]);

    // Mark token as used
    await pool.query('UPDATE password_reset_tokens SET used=TRUE WHERE id=$1', [tokenId]);

    res.json({ ok: true, message: 'Password has been reset. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;