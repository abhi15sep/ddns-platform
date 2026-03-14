# Building a Self-Hosted DDNS Platform
### A better DuckDNS — with dashboard, SSO, and full DNS control

---

## Table of Contents

1. [What is DDNS and How DuckDNS Works](#1-what-is-ddns-and-how-duckdns-works)
2. [Why Build Your Own](#2-why-build-your-own)
3. [System Architecture](#3-system-architecture)
4. [Tech Stack](#4-tech-stack)
5. [Phase 1 — PowerDNS + MySQL](#5-phase-1--powerdns--mysql)
6. [Phase 2 — Node.js Backend API](#6-phase-2--nodejs-backend-api)
7. [Phase 3 — SSO Authentication](#7-phase-3--sso-authentication)
8. [Phase 4 — React Dashboard](#8-phase-4--react-dashboard)
9. [Phase 5 — Production Hardening](#9-phase-5--production-hardening)
10. [Database Schemas](#10-database-schemas)
11. [Folder Structure](#11-folder-structure)

---

## 1. What is DDNS and How DuckDNS Works

Most home internet connections use a **dynamic external IP address** that can change weekly or even daily. This makes it difficult to connect to home services from an external computer.

A **Dynamic DNS (DDNS)** service solves this by mapping a fixed domain name to your changing IP address. A small client script on your device periodically tells the DDNS server your latest IP — so `myhome.yourdns.com` always resolves correctly.

### How DuckDNS works

- User registers a subdomain (e.g. `myhome.duckdns.org`)
- A script or cron job on the user's device calls `https://www.duckdns.org/update?domains=myhome&token=TOKEN&ip=` every 5 minutes
- DuckDNS auto-detects the IP if left blank
- The DNS record is updated on their AWS-hosted nameservers
- TTL is kept short (around 60 seconds) so changes propagate fast

### DuckDNS limitations

| Limitation | Detail |
|---|---|
| No dashboard | No UI to manage domains, view history, or see stats |
| Max 5 subdomains | Hard limit per account |
| A records only | No AAAA, CNAME, MX, or TXT support |
| No update history | No log of when or from where IPs changed |
| No named tokens | One token per account, no per-domain scoping |
| No SSL automation | Users handle their own certificates |
| No webhooks | No notifications when IP changes |
| Run by 2 engineers | Single point of failure, no SLA |

---

## 2. Why Build Your Own

Building your own platform gives you:

- **Full dashboard** with charts, update history, and domain management
- **Multiple record types** — A, AAAA, CNAME, MX, TXT
- **Unlimited subdomains** per user
- **Named API tokens** scoped per domain
- **SSO login** — Google, GitHub, Microsoft, plus email/password
- **Webhooks** — notify a URL when an IP changes
- **Your own branding and domain**
- **Potential freemium SaaS** — free tier, paid tier with custom domains

---

## 3. System Architecture

```
┌─────────────────┐        HTTPS GET /update        ┌──────────────────────────────┐
│  User device    │ ──────────────────────────────▶  │                              │
│  (home router,  │                                  │      Node.js Backend         │
│   cron script)  │                                  │                              │
└─────────────────┘                                  │  ┌──────────────────────┐    │
                                                     │  │   Update API          │    │
┌─────────────────┐       OAuth2 / JWT               │  │   /update?domain=...  │    │
│  Browser        │ ──────────────────────────────▶  │  └──────────┬───────────┘    │
│  (Dashboard /   │                                  │             │                │
│   Login page)   │                                  │  ┌──────────▼───────────┐    │
└─────────────────┘                                  │  │   Auth Service        │    │
                                                     │  │   Passport.js         │    │
                                                     │  └──────────┬───────────┘    │
                                                     │             │                │
                                                     │  ┌──────────▼───────────┐    │
                                                     │  │   PostgreSQL          │    │
                                                     │  │   users / tokens /    │    │
                                                     │  │   oauth / audit log   │    │
                                                     │  └──────────────────────┘    │
                                                     │                              │
                                                     │  ┌──────────────────────┐    │
                                                     │  │   PowerDNS REST API   │    │
                                                     │  └──────────┬───────────┘    │
                                                     └─────────────┼────────────────┘
                                                                   │
                                                     ┌─────────────▼────────────────┐
                                                     │  PowerDNS + MySQL            │
                                                     │  Authoritative DNS server    │
                                                     │  Zone: dyn.yourdomain.com    │
                                                     └──────────────────────────────┘
                                                                   │
                                                     ┌─────────────▼────────────────┐
                                                     │  Public internet resolvers   │
                                                     │  (anyone doing a DNS lookup) │
                                                     └──────────────────────────────┘
```

### Update flow (step by step)

1. User's cron script hits `GET /update?domain=myhome&token=UUID&ip=`
2. Node API detects IP from request if not supplied
3. Token is validated against PostgreSQL
4. Node API calls PowerDNS HTTP API to patch the A record
5. PowerDNS writes to MySQL zone store (TTL = 60s)
6. Change logged to audit table
7. Public resolvers see the new IP within ~60 seconds

---

## 4. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| DNS engine | PowerDNS + MySQL backend | REST API, easy to update records programmatically |
| Backend API | Node.js + Express | Matches your preference, fast async I/O |
| Auth | Passport.js | Best-in-class OAuth2 + local strategy for Node |
| App database | PostgreSQL | Users, tokens, audit logs |
| DNS database | MySQL | PowerDNS native backend |
| Frontend | React + Vite | Fast build, great ecosystem |
| Charts | Recharts | Clean, composable React charts |
| Reverse proxy | Caddy | Automatic HTTPS via Let's Encrypt, zero config |
| Process manager | PM2 | Keep Node running, auto-restart on crash |
| Containers | Docker Compose (optional) | Reproducible deploys |

---

## 5. Phase 1 — PowerDNS + MySQL

### Install

```bash
apt update && apt install -y pdns-server pdns-backend-mysql mysql-server
```

### Set up PowerDNS database

```bash
mysql -u root -p
```

```sql
CREATE DATABASE powerdns;
CREATE USER 'pdns'@'localhost' IDENTIFIED BY 'strongpassword';
GRANT ALL ON powerdns.* TO 'pdns'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Import the schema:

```bash
mysql -u pdns -p powerdns < /usr/share/doc/pdns-backend-mysql/schema.mysql.sql
```

### Configure PowerDNS MySQL backend

Edit `/etc/powerdns/pdns.d/gmysql.conf`:

```ini
launch=gmysql
gmysql-host=127.0.0.1
gmysql-user=pdns
gmysql-password=strongpassword
gmysql-dbname=powerdns
```

### Enable the HTTP API

Add to `/etc/powerdns/pdns.conf`:

```ini
api=yes
api-key=PICK_A_LONG_RANDOM_SECRET_HERE
webserver=yes
webserver-address=127.0.0.1
webserver-port=8081
webserver-allow-from=127.0.0.1
```

### Create your DNS zone

```sql
-- Connect to PowerDNS MySQL
mysql -u pdns -p powerdns

INSERT INTO domains (name, type) VALUES ('dyn.yourdomain.com', 'NATIVE');

SET @did = (SELECT id FROM domains WHERE name='dyn.yourdomain.com');

INSERT INTO records (domain_id, name, type, content, ttl) VALUES
(@did, 'dyn.yourdomain.com', 'SOA',
  'ns1.yourdomain.com. hostmaster.yourdomain.com. 1 3600 600 604800 300', 300),
(@did, 'dyn.yourdomain.com', 'NS', 'ns1.yourdomain.com', 300);
```

### Delegate the zone at your registrar

At your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.), add:

| Record | Name | Value |
|---|---|---|
| A | `ns1` | `YOUR_VPS_IP` |
| NS | `dyn` | `ns1.yourdomain.com` |

This tells the internet that your VPS is authoritative for `*.dyn.yourdomain.com`.

### Verify

```bash
systemctl restart pdns
dig @YOUR_VPS_IP dyn.yourdomain.com SOA
```

---

## 6. Phase 2 — Node.js Backend API

### Project setup

```bash
mkdir ddns-api && cd ddns-api
npm init -y
npm install express pg axios uuid bcrypt jsonwebtoken \
  express-rate-limit dotenv cookie-parser
```

### `.env`

```env
PORT=3000
DATABASE_URL=postgresql://ddnsuser:password@localhost:5432/ddns
PDNS_API_URL=http://127.0.0.1:8081/api/v1
PDNS_API_KEY=PICK_A_LONG_RANDOM_SECRET_HERE
DDNS_ZONE=dyn.yourdomain.com
JWT_SECRET=another_long_random_string
SESSION_SECRET=yet_another_long_random_string

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=common
```

### Database connection (`db.js`)

```js
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
```

### PowerDNS helper (`powerdns.js`)

```js
import axios from 'axios';

const BASE = process.env.PDNS_API_URL;
const KEY  = process.env.PDNS_API_KEY;
const ZONE = process.env.DDNS_ZONE;

export async function updateDNSRecord(subdomain, ip) {
  const fqdn = `${subdomain}.${ZONE}.`;
  await axios.patch(
    `${BASE}/servers/localhost/zones/${ZONE}`,
    {
      rrsets: [{
        name: fqdn,
        type: 'A',
        ttl: 60,
        changetype: 'REPLACE',
        records: [{ content: ip, disabled: false }]
      }]
    },
    { headers: { 'X-API-Key': KEY } }
  );
}

export async function deleteDNSRecord(subdomain) {
  const fqdn = `${subdomain}.${ZONE}.`;
  await axios.patch(
    `${BASE}/servers/localhost/zones/${ZONE}`,
    { rrsets: [{ name: fqdn, type: 'A', changetype: 'DELETE' }] },
    { headers: { 'X-API-Key': KEY } }
  );
}
```

### DDNS update route (`routes/update.js`)

```js
import express from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { updateDNSRecord } from '../powerdns.js';

const router = express.Router();

const limiter = rateLimit({ windowMs: 30_000, max: 1, keyGenerator: (req) => req.query.token });

router.get('/', limiter, async (req, res) => {
  const { domain, token, ip } = req.query;

  if (!domain || !token) return res.status(400).send('KO - missing params');

  // Detect IP from request if not provided
  const detectedIP = ip ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket.remoteAddress;

  // Validate IPv4
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4.test(detectedIP)) return res.status(400).send('KO - invalid IP');

  // Validate token
  const result = await pool.query(
    'SELECT * FROM domains WHERE subdomain=$1 AND token=$2', [domain, token]
  );
  if (!result.rows.length) return res.status(403).send('KO - invalid token');

  // Update DNS + DB
  await updateDNSRecord(domain, detectedIP);
  await pool.query(
    `UPDATE domains SET current_ip=$1, updated_at=NOW() WHERE subdomain=$2`,
    [detectedIP, domain]
  );
  await pool.query(
    `INSERT INTO update_log (domain, ip) VALUES ($1, $2)`,
    [domain, detectedIP]
  );

  res.send('OK');
});

export default router;
```

### Domains API (`routes/domains.js`)

```js
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db.js';
import { deleteDNSRecord } from '../powerdns.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();
router.use(requireAuth);

// List all domains for logged-in user
router.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM domains WHERE user_id=$1 ORDER BY created_at DESC',
    [req.user.sub]
  );
  res.json(result.rows);
});

// Create a new subdomain
router.post('/', async (req, res) => {
  const { subdomain } = req.body;
  if (!subdomain || !/^[a-z0-9-]{3,63}$/.test(subdomain))
    return res.status(400).json({ error: 'Invalid subdomain' });

  try {
    const result = await pool.query(
      `INSERT INTO domains (user_id, subdomain, token)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.sub, subdomain, uuidv4()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Subdomain taken' });
    throw err;
  }
});

// Delete a subdomain
router.delete('/:subdomain', async (req, res) => {
  const { subdomain } = req.params;
  const result = await pool.query(
    'DELETE FROM domains WHERE subdomain=$1 AND user_id=$2 RETURNING *',
    [subdomain, req.user.sub]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  await deleteDNSRecord(subdomain);
  res.json({ ok: true });
});

// Regenerate token
router.post('/:subdomain/regenerate-token', async (req, res) => {
  const result = await pool.query(
    `UPDATE domains SET token=$1 WHERE subdomain=$2 AND user_id=$3 RETURNING *`,
    [uuidv4(), req.params.subdomain, req.user.sub]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
});

// Get update history for a domain
router.get('/:subdomain/history', async (req, res) => {
  const result = await pool.query(
    `SELECT ip, updated_at FROM update_log
     WHERE domain=$1 ORDER BY updated_at DESC LIMIT 100`,
    [req.params.subdomain]
  );
  res.json(result.rows);
});

export default router;
```

### Main `app.js`

```js
import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import updateRouter from './routes/update.js';
import domainsRouter from './routes/domains.js';

dotenv.config();
const app = express();

app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());

app.use('/auth', authRouter);
app.use('/update', updateRouter);
app.use('/api/domains', domainsRouter);

app.listen(process.env.PORT || 3000, () =>
  console.log(`DDNS API running on port ${process.env.PORT || 3000}`)
);
```

---

## 7. Phase 3 — SSO Authentication

### Install Passport and strategies

```bash
npm install passport passport-google-oauth20 passport-github2 \
  passport-microsoft passport-local bcrypt jsonwebtoken
```

### Register OAuth apps

Before writing code, register your app with each provider:

**Google**
- Go to [console.cloud.google.com](https://console.cloud.google.com)
- APIs & Services → Credentials → Create OAuth 2.0 Client ID
- Authorised redirect URI: `https://yourdomain.com/auth/google/callback`

**GitHub**
- Go to GitHub Settings → Developer settings → OAuth Apps → New OAuth App
- Callback URL: `https://yourdomain.com/auth/github/callback`

**Microsoft**
- Go to [portal.azure.com](https://portal.azure.com)
- Azure Active Directory → App registrations → New registration
- Redirect URI: `https://yourdomain.com/auth/microsoft/callback`
- Use `common` as tenant to allow any Microsoft/personal account

### Passport config (`auth/passport.js`)

```js
import passport from 'passport';
import { Strategy as GoogleStrategy }    from 'passport-google-oauth20';
import { Strategy as GitHubStrategy }    from 'passport-github2';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import { Strategy as LocalStrategy }     from 'passport-local';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';

// ─── Shared helper ─────────────────────────────────────────────────────────
async function findOrCreateOAuthUser(provider, profile) {
  const email      = profile.emails?.[0]?.value;
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
    const result = await pool.query(
      'INSERT INTO users (email) VALUES ($1) RETURNING *',
      [email || `${provider}_${providerId}@noemail.local`]
    );
    user = result.rows[0];
  }

  // 4. Link the OAuth account
  await pool.query(
    `INSERT INTO oauth_accounts (user_id, provider, provider_id, email)
     VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
    [user.id, provider, providerId, email]
  );

  return user;
}

// ─── Google ────────────────────────────────────────────────────────────────
passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  'https://yourdomain.com/auth/google/callback',
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try   { done(null, await findOrCreateOAuthUser('google', profile)); }
  catch (err) { done(err); }
}));

// ─── GitHub ────────────────────────────────────────────────────────────────
passport.use(new GitHubStrategy({
  clientID:     process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL:  'https://yourdomain.com/auth/github/callback',
  scope: ['user:email']
}, async (accessToken, refreshToken, profile, done) => {
  try   { done(null, await findOrCreateOAuthUser('github', profile)); }
  catch (err) { done(err); }
}));

// ─── Microsoft ─────────────────────────────────────────────────────────────
passport.use(new MicrosoftStrategy({
  clientID:     process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  callbackURL:  'https://yourdomain.com/auth/microsoft/callback',
  tenant:       process.env.MICROSOFT_TENANT_ID,
  scope: ['user.read']
}, async (accessToken, refreshToken, profile, done) => {
  try   { done(null, await findOrCreateOAuthUser('microsoft', profile)); }
  catch (err) { done(err); }
}));

// ─── Local (email + password) ───────────────────────────────────────────────
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
      const user = result.rows[0];
      if (!user || !user.password_hash)
        return done(null, false, { message: 'Invalid credentials' });
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return done(null, false, { message: 'Invalid credentials' });
      done(null, user);
    } catch (err) { done(err); }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const result = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
  done(null, result.rows[0] || false);
});

export default passport;
```

### Auth routes (`routes/auth.js`)

```js
import express from 'express';
import passport from '../auth/passport.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';

const router = express.Router();

function issueJWT(res, user) {
  const token = jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.cookie('token', token, {
    httpOnly: true,   // not readable by JS — protects against XSS
    secure:   true,
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000
  });
}

// ─── Google ────────────────────────────────────────────────────────────────
router.get('/google', passport.authenticate('google'));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=1' }),
  (req, res) => { issueJWT(res, req.user); res.redirect('/dashboard'); }
);

// ─── GitHub ────────────────────────────────────────────────────────────────
router.get('/github', passport.authenticate('github'));
router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/login?error=1' }),
  (req, res) => { issueJWT(res, req.user); res.redirect('/dashboard'); }
);

// ─── Microsoft ─────────────────────────────────────────────────────────────
router.get('/microsoft', passport.authenticate('microsoft'));
router.get('/microsoft/callback',
  passport.authenticate('microsoft', { session: false, failureRedirect: '/login?error=1' }),
  (req, res) => { issueJWT(res, req.user); res.redirect('/dashboard'); }
);

// ─── Local login ───────────────────────────────────────────────────────────
router.post('/login',
  passport.authenticate('local', { session: false }),
  (req, res) => { issueJWT(res, req.user); res.json({ ok: true }); }
);

// ─── Register ──────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 8)
    return res.status(400).json({ error: 'Email and password (min 8 chars) required' });

  const hash = await bcrypt.hash(password, 12);
  try {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1,$2) RETURNING *',
      [email, hash]
    );
    issueJWT(res, result.rows[0]);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    throw err;
  }
});

// ─── Logout ────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

export default router;
```

### Auth middleware (`middleware/requireAuth.js`)

```js
import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired' });
  }
}
```

---

## 8. Phase 4 — React Dashboard

### Scaffold

```bash
npm create vite@latest ddns-dashboard -- --template react
cd ddns-dashboard
npm install recharts axios react-router-dom
```

### Login page (`LoginPage.jsx`)

```jsx
import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  async function handleLocalLogin(e) {
    e.preventDefault();
    await axios.post('/auth/login', { email, password }, { withCredentials: true });
    navigate('/dashboard');
  }

  return (
    <div className="login-container">
      <h1>Sign in to YourDDNS</h1>

      <a href="/auth/google"    className="btn btn-google">    Continue with Google    </a>
      <a href="/auth/github"    className="btn btn-github">    Continue with GitHub    </a>
      <a href="/auth/microsoft" className="btn btn-microsoft"> Continue with Microsoft </a>

      <div className="divider">or</div>

      <form onSubmit={handleLocalLogin}>
        <input type="email"    placeholder="Email"    value={email}    onChange={e => setEmail(e.target.value)}    required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit">Sign in</button>
      </form>

      <p>No account? <a href="/register">Register with email</a></p>
    </div>
  );
}
```

### Domain list (`DomainList.jsx`)

```jsx
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function DomainList() {
  const [domains, setDomains] = useState([]);
  const [newSub, setNewSub] = useState('');

  useEffect(() => {
    axios.get('/api/domains', { withCredentials: true }).then(r => setDomains(r.data));
  }, []);

  async function create() {
    const r = await axios.post('/api/domains', { subdomain: newSub }, { withCredentials: true });
    setDomains(prev => [r.data, ...prev]);
    setNewSub('');
  }

  async function remove(subdomain) {
    await axios.delete(`/api/domains/${subdomain}`, { withCredentials: true });
    setDomains(prev => prev.filter(d => d.subdomain !== subdomain));
  }

  return (
    <div>
      <h2>My Domains</h2>

      <div className="create-row">
        <input
          value={newSub}
          onChange={e => setNewSub(e.target.value)}
          placeholder="subdomain"
        />
        <span>.dyn.yourdomain.com</span>
        <button onClick={create}>Create</button>
      </div>

      <table>
        <thead>
          <tr><th>Subdomain</th><th>Current IP</th><th>Last updated</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {domains.map(d => (
            <tr key={d.subdomain}>
              <td><Link to={`/domain/${d.subdomain}`}>{d.subdomain}.dyn.yourdomain.com</Link></td>
              <td>{d.current_ip || '—'}</td>
              <td>{d.updated_at ? new Date(d.updated_at).toLocaleString() : 'Never'}</td>
              <td><button onClick={() => remove(d.subdomain)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Domain detail with history chart (`DomainDetail.jsx`)

```jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function DomainDetail() {
  const { subdomain } = useParams();
  const [domain, setDomain] = useState(null);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    axios.get('/api/domains', { withCredentials: true })
      .then(r => setDomain(r.data.find(d => d.subdomain === subdomain)));
    axios.get(`/api/domains/${subdomain}/history`, { withCredentials: true })
      .then(r => setHistory(r.data.reverse()));
  }, [subdomain]);

  async function regenerate() {
    const r = await axios.post(`/api/domains/${subdomain}/regenerate-token`, {}, { withCredentials: true });
    setDomain(r.data);
  }

  function copyUpdateURL() {
    const url = `https://yourdomain.com/update?domain=${subdomain}&token=${domain.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!domain) return <p>Loading...</p>;

  const updateURL = `https://yourdomain.com/update?domain=${subdomain}&token=${domain.token}`;

  return (
    <div>
      <h2>{subdomain}.dyn.yourdomain.com</h2>
      <p>Current IP: <strong>{domain.current_ip || 'Not yet updated'}</strong></p>

      <h3>Update URL</h3>
      <code>{updateURL}</code>
      <button onClick={copyUpdateURL}>{copied ? 'Copied!' : 'Copy'}</button>

      <h3>cURL example</h3>
      <pre>{`curl "${updateURL}"`}</pre>

      <button onClick={regenerate}>Regenerate token</button>

      <h3>IP history</h3>
      {history.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="updated_at" tickFormatter={v => new Date(v).toLocaleDateString()} />
            <YAxis hide />
            <Tooltip labelFormatter={v => new Date(v).toLocaleString()} />
            <Line type="monotone" dataKey="ip" dot={true} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p>No updates yet.</p>
      )}
    </div>
  );
}
```

---

## 9. Phase 5 — Production Hardening

### Install Caddy

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy
```

### `/etc/caddy/Caddyfile`

```caddyfile
yourdomain.com {
  root * /var/www/ddns-dashboard/dist
  file_server
  try_files {path} /index.html
}

api.yourdomain.com {
  reverse_proxy localhost:3000
}
```

Caddy handles Let's Encrypt certificates automatically — no certbot needed.

### Firewall (UFW)

```bash
ufw allow 22/tcp    # SSH
ufw allow 53/tcp    # DNS
ufw allow 53/udp    # DNS
ufw allow 80/tcp    # HTTP (Caddy redirects to HTTPS)
ufw allow 443/tcp   # HTTPS
ufw enable
```

### PM2 process manager

```bash
npm install -g pm2
cd /var/www/ddns-api
pm2 start app.js --name ddns-api --interpreter node
pm2 save
pm2 startup    # follow the printed command to enable on boot
```

### Automated database backups

```bash
# /etc/cron.daily/ddns-backup
#!/bin/bash
DATE=$(date +%Y-%m-%d)
pg_dump ddns > /backups/ddns-$DATE.sql
mysqldump -u pdns -p powerdns > /backups/powerdns-$DATE.sql
# Upload to object storage (e.g. rclone, s3cmd)
```

---

## 10. Database Schemas

### PostgreSQL (users, tokens, audit)

```sql
-- Users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT,                          -- NULL for SSO-only users
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth account links (one row per provider per user)
CREATE TABLE oauth_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL,                   -- 'google', 'github', 'microsoft'
  provider_id TEXT NOT NULL,                   -- user's ID at that provider
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);

-- DDNS subdomains
CREATE TABLE domains (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subdomain   TEXT UNIQUE NOT NULL,
  token       UUID NOT NULL DEFAULT gen_random_uuid(),
  current_ip  TEXT,
  updated_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- IP update history
CREATE TABLE update_log (
  id          SERIAL PRIMARY KEY,
  domain      TEXT NOT NULL,
  ip          TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast history lookups
CREATE INDEX idx_update_log_domain ON update_log(domain, updated_at DESC);
```

### PowerDNS MySQL (auto-created by schema import)

The PowerDNS schema is imported automatically via:
```bash
mysql -u pdns -p powerdns < /usr/share/doc/pdns-backend-mysql/schema.mysql.sql
```

Key tables used by your API:
- `domains` — one row per zone (e.g. `dyn.yourdomain.com`)
- `records` — one row per DNS record (A, SOA, NS, etc.)

---

## 11. Folder Structure

```
ddns-api/
├── app.js                    # Express entry point
├── db.js                     # PostgreSQL pool
├── powerdns.js               # PowerDNS REST API helpers
├── .env                      # Secrets (never commit)
├── auth/
│   └── passport.js           # Google, GitHub, Microsoft, Local strategies
├── middleware/
│   └── requireAuth.js        # JWT cookie verification
└── routes/
    ├── auth.js               # /auth/* — login, register, OAuth callbacks
    ├── update.js             # /update — DDNS update endpoint
    └── domains.js            # /api/domains — CRUD + history

ddns-dashboard/
├── index.html
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx               # Router setup
    └── pages/
        ├── LoginPage.jsx     # SSO buttons + email/password form
        ├── RegisterPage.jsx
        ├── DomainList.jsx    # All domains overview
        └── DomainDetail.jsx  # History chart + update URL + token management
```

---

## Quick reference — update URL format

Your service will be compatible with any client that supports DuckDNS-style URLs:

```
# Auto-detect IP (recommended)
https://api.yourdomain.com/update?domain=SUBDOMAIN&token=TOKEN

# Explicit IP
https://api.yourdomain.com/update?domain=SUBDOMAIN&token=TOKEN&ip=1.2.3.4
```

This means any router firmware (DD-WRT, OpenWRT, Ubiquiti EdgeRouter) that already supports DuckDNS will work with your service by just changing the URL.

---

*Generated from research and implementation planning session — March 2026*
