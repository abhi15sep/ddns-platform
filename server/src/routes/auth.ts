import { Router, Request, Response } from 'express';
import passport from '../auth/passport.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import { pool } from '../db.js';
import { config } from '../config.js';
import { requireAuth, AuthUser } from '../middleware/requireAuth.js';
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

// Issue a short-lived temp token for 2FA flow (not a full session)
function issueTempToken(userId: string): string {
  return jwt.sign({ sub: userId, purpose: '2fa' }, config.JWT_SECRET, { expiresIn: '5m' });
}

async function userHas2FA(userId: string): Promise<boolean> {
  const r = await pool.query('SELECT verified FROM totp_secrets WHERE user_id=$1', [userId]);
  return r.rows.length > 0 && r.rows[0].verified;
}

// OAuth callback handler (shared logic for 2FA check)
async function handleOAuthCallback(req: Request, res: Response) {
  const user = req.user as any;
  if (await userHas2FA(user.id)) {
    const tempToken = issueTempToken(user.id);
    res.redirect(`${config.APP_URL}/login?requires_2fa=1&temp_token=${tempToken}`);
    return;
  }
  issueJWT(res, user);
  res.redirect(`${config.APP_URL}/dashboard`);
}

// Google OAuth
router.get('/google', passport.authenticate('google'));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${config.APP_URL}/login?error=1` }),
  handleOAuthCallback
);

// GitHub OAuth
router.get('/github', passport.authenticate('github'));
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${config.APP_URL}/login?error=1` }),
  handleOAuthCallback
);

// Local login
router.post('/login', authLimiter, (req: Request, res: Response, next) => {
  passport.authenticate('local', { session: false }, async (err: any, user: any, info: any) => {
    if (err) return next(err);
    if (!user) {
      res.status(401).json({ error: info?.message || 'Invalid credentials' });
      return;
    }

    // Check if user has 2FA enabled
    if (await userHas2FA(user.id)) {
      const tempToken = issueTempToken(user.id);
      res.json({ requires_2fa: true, temp_token: tempToken });
      return;
    }

    issueJWT(res, user);
    res.json({ ok: true, user: { id: user.id, email: user.email } });
  })(req, res, next);
});

// Verify 2FA code during login
router.post('/verify-2fa', authLimiter, async (req: Request, res: Response) => {
  const { temp_token, code } = req.body;
  if (!temp_token || !code) {
    res.status(400).json({ error: 'Token and code are required' });
    return;
  }

  try {
    const payload = jwt.verify(temp_token, config.JWT_SECRET) as any;
    if (payload.purpose !== '2fa') {
      res.status(400).json({ error: 'Invalid token' });
      return;
    }

    const userId = payload.sub;

    // Get TOTP secret
    const secretResult = await pool.query(
      'SELECT secret, backup_codes FROM totp_secrets WHERE user_id=$1 AND verified=TRUE',
      [userId]
    );
    if (!secretResult.rows.length) {
      res.status(400).json({ error: '2FA is not enabled' });
      return;
    }

    const { secret, backup_codes } = secretResult.rows[0];
    const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: 30 });
    const delta = totp.validate({ token: code.trim(), window: 1 });

    if (delta !== null) {
      // Valid TOTP code — issue full session
      const userResult = await pool.query('SELECT id, email FROM users WHERE id=$1', [userId]);
      if (!userResult.rows.length) {
        res.status(400).json({ error: 'User not found' });
        return;
      }
      issueJWT(res, userResult.rows[0]);
      res.json({ ok: true, user: userResult.rows[0] });
      return;
    }

    // Check backup codes
    if (backup_codes && Array.isArray(backup_codes)) {
      const codeHash = crypto.createHash('sha256').update(code.trim()).digest('hex');
      const idx = backup_codes.indexOf(codeHash);
      if (idx !== -1) {
        // Valid backup code — remove it and issue session
        const updated = [...backup_codes];
        updated.splice(idx, 1);
        await pool.query('UPDATE totp_secrets SET backup_codes=$1 WHERE user_id=$2', [updated, userId]);

        const userResult = await pool.query('SELECT id, email FROM users WHERE id=$1', [userId]);
        issueJWT(res, userResult.rows[0]);
        res.json({ ok: true, user: userResult.rows[0] });
        return;
      }
    }

    res.status(401).json({ error: 'Invalid code. Try again.' });
  } catch {
    res.status(401).json({ error: 'Token expired. Please log in again.' });
  }
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

// Get profile
router.get('/profile', requireAuth, async (req: Request, res: Response) => {
  const userId = (req.user as AuthUser).sub;
  const userResult = await pool.query(
    'SELECT email, created_at, password_hash FROM users WHERE id=$1',
    [userId]
  );
  if (!userResult.rows.length) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const user = userResult.rows[0];

  // Get linked OAuth providers
  const oauthResult = await pool.query(
    'SELECT provider FROM oauth_accounts WHERE user_id=$1',
    [userId]
  );

  res.json({
    email: user.email,
    created_at: user.created_at,
    has_password: !!user.password_hash,
    providers: oauthResult.rows.map((r: any) => r.provider),
  });
});

// Change password
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  const userId = (req.user as AuthUser).sub;
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters' });
    return;
  }

  const userResult = await pool.query('SELECT password_hash FROM users WHERE id=$1', [userId]);
  if (!userResult.rows.length) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // If user has a password, verify current password
  if (userResult.rows[0].password_hash) {
    if (!currentPassword) {
      res.status(400).json({ error: 'Current password is required' });
      return;
    }
    const valid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [hash, userId]);
  res.json({ ok: true });
});

// Get API token
router.get('/api-token', requireAuth, async (req: Request, res: Response) => {
  const userId = (req.user as AuthUser).sub;
  const result = await pool.query('SELECT api_token FROM users WHERE id=$1', [userId]);

  let token = result.rows[0]?.api_token;
  if (!token) {
    // Auto-generate on first access
    token = crypto.randomBytes(32).toString('hex');
    await pool.query('UPDATE users SET api_token=$1 WHERE id=$2', [token, userId]);
  }

  res.json({ token });
});

// Regenerate API token
router.post('/api-token/regenerate', requireAuth, async (req: Request, res: Response) => {
  const userId = (req.user as AuthUser).sub;
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query('UPDATE users SET api_token=$1 WHERE id=$2', [token, userId]);
  res.json({ token });
});

// Delete account
router.delete('/account', requireAuth, async (req: Request, res: Response) => {
  const userId = (req.user as AuthUser).sub;

  // Delete user (cascades to domains, oauth_accounts, totp_secrets, etc.)
  await pool.query('DELETE FROM update_log WHERE domain IN (SELECT subdomain FROM domains WHERE user_id=$1)', [userId]);
  await pool.query('DELETE FROM domains WHERE user_id=$1', [userId]);
  await pool.query('DELETE FROM users WHERE id=$1', [userId]);

  res.clearCookie('token');
  res.json({ ok: true });
});

// 2FA status
router.get('/2fa/status', requireAuth, async (req: Request, res: Response) => {
  const userId = (req.user as AuthUser).sub;
  const r = await pool.query('SELECT verified FROM totp_secrets WHERE user_id=$1', [userId]);
  res.json({ enabled: r.rows.length > 0 && r.rows[0].verified });
});

// Begin 2FA setup — generate secret and QR code
router.post('/2fa/setup', requireAuth, async (req: Request, res: Response) => {
  const userId = (req.user as AuthUser).sub;
  const userEmail = (req.user as AuthUser).email;

  // Remove any unverified setup
  await pool.query('DELETE FROM totp_secrets WHERE user_id=$1 AND verified=FALSE', [userId]);

  // Check if already enabled
  const existing = await pool.query('SELECT verified FROM totp_secrets WHERE user_id=$1', [userId]);
  if (existing.rows.length && existing.rows[0].verified) {
    res.status(400).json({ error: '2FA is already enabled. Disable it first to reconfigure.' });
    return;
  }

  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: 'DevOps Monk DDNS',
    label: userEmail,
    secret,
    digits: 6,
    period: 30,
  });

  await pool.query(
    'INSERT INTO totp_secrets (user_id, secret, verified) VALUES ($1, $2, FALSE)',
    [userId, secret.base32]
  );

  const uri = totp.toString();
  const qrDataUrl = await QRCode.toDataURL(uri);

  res.json({ secret: secret.base32, qr: qrDataUrl, uri });
});

// Verify 2FA setup — confirm with a code to activate
router.post('/2fa/verify-setup', requireAuth, async (req: Request, res: Response) => {
  const userId = (req.user as AuthUser).sub;
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: 'Verification code is required' });
    return;
  }

  const secretResult = await pool.query(
    'SELECT id, secret FROM totp_secrets WHERE user_id=$1 AND verified=FALSE',
    [userId]
  );
  if (!secretResult.rows.length) {
    res.status(400).json({ error: 'No pending 2FA setup found. Start setup first.' });
    return;
  }

  const { id: rowId, secret } = secretResult.rows[0];
  const totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), digits: 6, period: 30 });
  const delta = totp.validate({ token: code.trim(), window: 1 });

  if (delta === null) {
    res.status(400).json({ error: 'Invalid code. Make sure your authenticator app is synced and try again.' });
    return;
  }

  // Generate backup codes
  const rawBackupCodes: string[] = [];
  const hashedBackupCodes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const raw = crypto.randomBytes(4).toString('hex'); // 8-char hex codes
    rawBackupCodes.push(raw);
    hashedBackupCodes.push(crypto.createHash('sha256').update(raw).digest('hex'));
  }

  await pool.query(
    'UPDATE totp_secrets SET verified=TRUE, backup_codes=$1 WHERE id=$2',
    [hashedBackupCodes, rowId]
  );

  res.json({ ok: true, backup_codes: rawBackupCodes });
});

// Disable 2FA
router.post('/2fa/disable', requireAuth, async (req: Request, res: Response) => {
  const userId = (req.user as AuthUser).sub;
  const { password } = req.body;

  // Require password confirmation for security
  const userResult = await pool.query('SELECT password_hash FROM users WHERE id=$1', [userId]);
  if (userResult.rows[0]?.password_hash) {
    if (!password) {
      res.status(400).json({ error: 'Password is required to disable 2FA' });
      return;
    }
    const valid = await bcrypt.compare(password, userResult.rows[0].password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Incorrect password' });
      return;
    }
  }

  const result = await pool.query('DELETE FROM totp_secrets WHERE user_id=$1 RETURNING id', [userId]);
  if (!result.rows.length) {
    res.status(400).json({ error: '2FA is not enabled' });
    return;
  }

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