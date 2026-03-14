import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { config } from '../config.js';

// Shared helper: find or create user from OAuth profile
async function findOrCreateOAuthUser(provider: string, profile: any) {
  const email = profile.emails?.[0]?.value;
  const providerId = profile.id;

  // 1. Check if this OAuth account already exists
  const existing = await pool.query(
    `SELECT u.* FROM users u
     JOIN oauth_accounts o ON o.user_id = u.id
     WHERE o.provider=$1 AND o.provider_id=$2`,
    [provider, providerId]
  );
  if (existing.rows.length) return existing.rows[0];

  // 2. Find existing user by email (link accounts)
  let user;
  if (email) {
    const byEmail = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    user = byEmail.rows[0];
  }

  // 3. Create new user if needed
  if (!user) {
    const displayName = profile.displayName || email || `${provider}_${providerId}`;
    const result = await pool.query(
      'INSERT INTO users (email, display_name) VALUES ($1, $2) RETURNING *',
      [email || `${provider}_${providerId}@noemail.local`, displayName]
    );
    user = result.rows[0];
  }

  // 4. Link the OAuth account
  await pool.query(
    `INSERT INTO oauth_accounts (user_id, provider, provider_id, email)
     VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
    [user.id, provider, providerId, email]
  );

  return user;
}

// Google OAuth
if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: `${config.API_URL}/auth/google/callback`,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          done(null, await findOrCreateOAuthUser('google', profile));
        } catch (err: any) {
          done(err);
        }
      }
    )
  );
}

// GitHub OAuth
if (config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: config.GITHUB_CLIENT_ID,
        clientSecret: config.GITHUB_CLIENT_SECRET,
        callbackURL: `${config.API_URL}/auth/github/callback`,
        scope: ['user:email'],
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
        try {
          done(null, await findOrCreateOAuthUser('github', profile));
        } catch (err: any) {
          done(err);
        }
      }
    )
  );
}

// Local (email + password)
passport.use(
  new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
        const user = result.rows[0];
        if (!user || !user.password_hash) {
          return done(null, false, { message: 'Invalid credentials' });
        }
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return done(null, false, { message: 'Invalid credentials' });
        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: string, done) => {
  const result = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
  done(null, result.rows[0] || false);
});

export default passport;
