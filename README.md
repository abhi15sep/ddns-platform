# DDNS Platform — devops-monk.com

A self-hosted Dynamic DNS platform (better than DuckDNS) with a web dashboard, SSO login, full DNS control, and a desktop app for non-developers.

**Domain**: `devops-monk.com` (Porkbun)
**VPS**: Hostinger VPS (also hosts `gift.devops-monk.com`)
**DDNS Zone**: `dyn.devops-monk.com` — user subdomains like `myhome.dyn.devops-monk.com`

---

> **IMPORTANT — Existing Site Safety**
>
> Your Hostinger VPS already runs `gift.devops-monk.com` (Next.js + Nginx + PM2 on port 3000).
> This DDNS platform is designed to coexist safely:
> - DDNS API runs on **port 3001** (not 3000) to avoid conflicts
> - We **add** Nginx config files — we never edit or replace existing ones
> - Your existing `gift.devops-monk.com` Nginx config stays untouched
> - MySQL is already installed for your gift site — we reuse it (just add a new database)
>
> **What could go wrong and how we prevent it:**
> - Port conflict → DDNS uses 3001, gift stays on 3000
> - Nginx config overwrite → we create a separate file in `sites-available`
> - MySQL conflict → separate `powerdns` database, separate `pdns` user
> - PM2 conflict → DDNS process is named `ddns-api`, gift process keeps its name
> - Firewall issues → we only add rules, never remove existing ones

---

## Table of Contents

1. [What This Does](#what-this-does)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Step-by-Step: Local Development Setup](#step-by-step-local-development-setup)
6. [Step-by-Step: Hostinger VPS Production Deployment](#step-by-step-hostinger-vps-production-deployment)
7. [Step-by-Step: Porkbun DNS Delegation](#step-by-step-porkbun-dns-delegation)
8. [How to Use the DDNS Service](#how-to-use-the-ddns-service)
9. [Admin Console](#admin-console)
10. [Documentation](#documentation)
11. [Troubleshooting](#troubleshooting)

---

## What This Does

Your home internet IP changes frequently. This platform lets you (and your users) register subdomains like `myhome.dyn.devops-monk.com` that always point to their current IP. A small script or the desktop app pings the server every few minutes to keep the DNS record updated.

**Features**:
- Web dashboard to manage domains, view IP history, copy update URLs
- SSO login (Google, GitHub, Microsoft) plus email/password
- Password reset via email (SMTP/Gmail)
- A and AAAA records (IPv4 + IPv6)
- Desktop client app for non-developers (Windows, macOS, Linux)
- Up to 5 subdomains per user
- Per-domain scoped tokens
- IP change history (last 3 hours, auto-pruned)
- Webhook notifications on IP change (Discord, Telegram, Slack, custom)
- Simple HTTP GET update API (works with router firmware)
- Configurable rate limiting (per-token and per-account via admin console)
- Dark mode with system preference detection
- Admin console — user management, activity monitoring, rate limit settings, block/unblock users
- Profile page with password change, API token management, and account deletion
- Interactive API documentation page (`/api-docs`)
- Live status page with health checks (`/status`)
- "How It Works" page with SVG flow diagrams

---

## Architecture

```
User Device (cron job / router / desktop app)
    │
    │  GET /update?domain=myhome&token=xxx
    ▼
┌───────────────────────────────┐
│  Nginx (reverse proxy + HTTPS) │
│  Port 80/443                    │
└───────┬───────────┬─────────────┘
        │           │
        ▼           ▼
  ┌──────────┐  ┌───────────┐
  │ gift site │  │ DDNS API  │
  │ port 3000 │  │ port 3001 │──► PostgreSQL (users, tokens, logs)
  └──────────┘  └───────────┘──► PowerDNS REST API (port 8081)
                      │
                      ▼
                PowerDNS + MySQL
                (Authoritative DNS, port 53)
                      │
                      ▼
                Internet resolvers
```

**Port allocation on your VPS:**

| Port | Service | Notes |
|------|---------|-------|
| 22 | SSH | Already open |
| 53 | PowerDNS | DNS queries (NEW) |
| 80 | Nginx | Already open (gift site) |
| 443 | Nginx | Already open (gift site) |
| 3000 | Gift site (Next.js) | Already in use — DO NOT TOUCH |
| 3001 | DDNS API (Express) | NEW |
| 3306 | MySQL | Already in use (gift site) — we add a new database |
| 5432 or 5433 | PostgreSQL | NEW — check with `sudo -u postgres psql -c 'SHOW port;'` |
| 8081 | PowerDNS API | NEW (localhost only) |

---

## Project Structure

```
ddns-platform/
├── server/                  # Backend API (Node.js + Express + TypeScript)
│   └── src/
│       ├── app.ts           # Express entry point (port 3001)
│       ├── config.ts        # Environment validation (incl. SMTP config)
│       ├── db.ts            # PostgreSQL connection
│       ├── email.ts         # Nodemailer SMTP transport (password reset emails)
│       ├── powerdns.ts      # PowerDNS REST API client
│       ├── auth/passport.ts # OAuth + local auth strategies
│       ├── middleware/      # JWT auth, error handling, admin check
│       └── routes/
│           ├── health.ts    # GET /health
│           ├── auth.ts      # Login, register, OAuth, forgot/reset password
│           ├── update.ts    # GET /update (DDNS update endpoint + webhook trigger)
│           ├── domains.ts   # CRUD domains, webhook URL, token regeneration
│           └── admin.ts     # Admin stats, users, activity, settings
│
├── dashboard/               # Web frontend (React + Vite + TypeScript)
│   └── src/
│       ├── App.tsx          # Route definitions
│       ├── api/client.ts    # API calls to backend
│       ├── hooks/useAuth.ts # Auth state management
│       ├── hooks/useTheme.ts # Dark/light theme with localStorage
│       └── pages/
│           ├── LandingPage.tsx       # Public landing page
│           ├── LoginPage.tsx         # Email/password + OAuth login
│           ├── RegisterPage.tsx      # Registration
│           ├── ForgotPasswordPage.tsx # Request password reset email
│           ├── ResetPasswordPage.tsx  # Set new password with token
│           ├── DomainList.tsx        # Dashboard with domain cards
│           ├── DomainDetail.tsx      # Domain detail (Update URL, History,
│           │                         #   Notifications, Setup Guide tabs)
│           ├── ProfilePage.tsx       # Password change, API token, delete account
│           ├── AdminPage.tsx         # Admin console
│           ├── DownloadsPage.tsx     # Desktop app downloads + scripts
│           ├── HowItWorksPage.tsx    # How It Works with SVG diagrams
│           ├── ApiDocsPage.tsx       # Interactive API documentation
│           └── StatusPage.tsx        # Live service health checks
│
├── client-app/              # Desktop app (Electron) for non-developers
│   └── src/
│       ├── main/            # System tray, IP updater
│       ├── preload/         # Secure bridge to UI
│       └── renderer/        # Setup wizard, status, settings UI
│
├── dns/                     # PowerDNS SQL schemas + Nginx config
│   ├── schema.sql           # MySQL tables for PowerDNS
│   ├── init-zone.sql        # Creates dyn.devops-monk.com zone
│   └── nginx-ddns.conf      # Nginx server blocks for DDNS
│
├── db/migrations/           # PostgreSQL migration files (run in order)
│   ├── 001_create_users.sql
│   ├── 002_create_oauth_accounts.sql
│   ├── 003_create_domains.sql
│   ├── 004_create_update_log.sql
│   ├── 005_add_blocked_to_users.sql
│   ├── 006_create_settings.sql
│   ├── 007_add_webhook_to_domains.sql
│   └── 008_create_password_reset_tokens.sql
│
├── docs/                    # Detailed docs for each component
├── docker-compose.yml       # Dev databases (PostgreSQL, MySQL, PowerDNS)
├── .env.example             # All config variables with descriptions
├── PLAN.md                  # Implementation plan
├── IMPROVEMENT-PLAN.md      # Feature roadmap with status tracking
└── package.json             # npm workspace root
```

---

## Prerequisites

**For local development** (your Mac):
- Node.js 20+ (`brew install node`)
- Docker Desktop (`brew install --cask docker`)
- Git

**For production** (Hostinger VPS):
- Your existing Hostinger VPS with `gift.devops-monk.com` already running
- SSH access to the VPS
- Porkbun account with `devops-monk.com` domain

---

## Step-by-Step: Local Development Setup

> These steps run everything on your Mac for development/testing.

### Step 1: Clone the project

```bash
cd ~/Documents/Personal/home_static_ip
# You're already here — the code is ready
```

### Step 2: Copy the environment file

```bash
cp .env.example .env
```

Open `.env` and set these for local dev:
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://ddnsuser:password@localhost:5432/ddns
PDNS_API_URL=http://127.0.0.1:8081/api/v1
PDNS_API_KEY=dev-api-key-change-in-production
DDNS_ZONE=dyn.devops-monk.com
JWT_SECRET=dev-jwt-secret-change-in-production-min-16-chars
APP_URL=http://localhost:5173
API_URL=http://localhost:3001

# SMTP (optional for local dev — leave empty to skip password reset emails)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@devops-monk.com
```

### Step 3: Start the databases

```bash
docker compose up -d
```

**What this does**: Starts 3 containers:
- PostgreSQL on port 5432 (app data: users, domains, logs)
- MySQL on port 3306 (PowerDNS zone data)
- PowerDNS on port 5353 (DNS) and port 8081 (API)

**Verify they're running**:
```bash
docker compose ps
```
You should see 3 containers in "running" state.

### Step 4: Install dependencies

```bash
npm install
```

### Step 5: Run database migrations

```bash
npm run migrate
```

**What this does**: Creates all PostgreSQL tables — users, oauth_accounts, domains, update_log, settings, and password_reset_tokens. Also adds the `blocked` column and `webhook_url` column.

**If you get a connection error**: Wait 10 seconds for PostgreSQL to fully start, then try again.

### Step 6: Start the backend server

```bash
npm run dev:server
```

**Expected output**: `DDNS API running on port 3001`

**Test it**: Open a new terminal tab and run:
```bash
curl http://localhost:3001/health
```
You should see: `{"status":"ok","timestamp":"..."}`

### Step 7: Start the dashboard (new terminal tab)

```bash
npm run dev:dashboard
```

**Expected output**: `Local: http://localhost:5173/`

Open http://localhost:5173 in your browser. You should see the login page.

### Step 8: Test the flow

1. Go to http://localhost:5173/register
2. Create an account with any email + password (min 8 chars)
3. You'll be redirected to the dashboard
4. Create a subdomain (e.g., `test`)
5. Copy the update URL shown on the domain detail page
6. Run it in terminal: `curl "http://localhost:3001/update?domain=test&token=YOUR_TOKEN"`
7. You should see `OK` and the IP will appear in the dashboard

### Step 9: Stop everything when done

```bash
# Stop the servers: Ctrl+C in each terminal tab
# Stop databases:
docker compose down
```

---

## Step-by-Step: Hostinger VPS Production Deployment

> These steps deploy DDNS alongside your existing gift site. Each step explains what it does and what it does NOT touch.

### Step 1: SSH into your VPS

```bash
ssh root@YOUR_HOSTINGER_VPS_IP
```

### Step 2: Check your existing setup is working

**Before changing anything**, verify the gift site is healthy:
```bash
# Check Nginx is running
systemctl status nginx

# Check your gift site process
pm2 status

# Check MySQL is running
systemctl status mysql

# Test the gift site
curl -I https://gift.devops-monk.com
```

**Write down the output.** If anything breaks later, you can compare.

### Step 3: Install PostgreSQL (new — does NOT affect MySQL or gift site)

```bash
apt install -y postgresql postgresql-contrib
```

**What this does**: Installs PostgreSQL. This is a completely separate database server from MySQL. Your gift site uses MySQL — we're adding PostgreSQL for the DDNS app data.

**IMPORTANT — Check the PostgreSQL port** (it may NOT be 5432):
```bash
sudo -u postgres psql -c 'SHOW port;'
```
Note this port — you'll need it for `.env` and all `psql` commands below. On some systems it runs on **5433** instead of 5432.

**Create the DDNS database and user** (passwordless for local connections):
```bash
sudo -u postgres psql
```

```sql
CREATE USER ddnsuser;
CREATE DATABASE ddns OWNER ddnsuser;
\q
```

**Set up trust auth** so the app can connect without a password (safe since PostgreSQL only listens on localhost):
```bash
nano /etc/postgresql/*/main/pg_hba.conf
```

Add this line near the top (before other rules):
```
local   ddns    ddnsuser                                trust
host    ddns    ddnsuser    127.0.0.1/32                trust
```

Then restart PostgreSQL:
```bash
systemctl restart postgresql
```

**Your DATABASE_URL** will be (replace PORT with actual port from above):
```
DATABASE_URL=postgresql://ddnsuser@127.0.0.1:PORT/ddns
```

### Step 4: Create PowerDNS MySQL database (uses existing MySQL — new database only)

> This adds a new `powerdns` database to your existing MySQL server. It does NOT touch your gift site's database.

```bash
mysql -u root
```

```sql
-- Check existing databases first (your gift DB should be listed)
SHOW DATABASES;

-- Create a NEW database for PowerDNS (does not affect other databases)
CREATE DATABASE powerdns;
CREATE USER 'pdns'@'localhost' IDENTIFIED BY 'PICK_A_PDNS_PASSWORD';
GRANT ALL ON powerdns.* TO 'pdns'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Save this password too.**

### Step 5: Install PowerDNS

```bash
apt install -y pdns-server pdns-backend-mysql
```

**IMPORTANT — Remove the default bind backend** (causes startup failure):
```bash
# Check for leftover bind config
ls /etc/powerdns/pdns.d/
# If you see bind.conf, remove it:
rm -f /etc/powerdns/pdns.d/bind.conf
```

> If you skip this, PowerDNS will fail with `Fatal error: Trying to set unknown setting 'bind-config'`.

### Step 6: Clone the DDNS project

```bash
mkdir -p /opt/ddns-platform
cd /opt/ddns-platform
git clone YOUR_REPO_URL .
```

### Step 7: Import PowerDNS schema and create DNS zone

```bash
mysql -u pdns -p powerdns < dns/schema.sql
mysql -u pdns -p powerdns < dns/init-zone.sql
```

### Step 8: Configure PowerDNS

**MySQL backend** — create `/etc/powerdns/pdns.d/gmysql.conf`:
```bash
nano /etc/powerdns/pdns.d/gmysql.conf
```

Paste (replace password):
```ini
launch=gmysql
gmysql-host=127.0.0.1
gmysql-user=pdns
gmysql-password=YOUR_PDNS_MYSQL_PASSWORD
gmysql-dbname=powerdns
```

**HTTP API** — edit `/etc/powerdns/pdns.conf`:
```bash
nano /etc/powerdns/pdns.conf
```

Add at the bottom:
```ini
api=yes
api-key=PASTE_YOUR_API_KEY_HERE
webserver=yes
webserver-address=127.0.0.1
webserver-port=8081
webserver-allow-from=127.0.0.1
```

Generate the API key:
```bash
openssl rand -hex 32
# Copy the output → paste as api-key above
# Also save it for .env
```

**Fix port 53 conflict** (Ubuntu's systemd-resolved uses port 53):
```bash
# Check if systemd-resolved is running
systemctl status systemd-resolved

# If it is, stop and disable it
systemctl stop systemd-resolved
systemctl disable systemd-resolved

# Set DNS resolvers so the server itself can resolve domains
echo "nameserver 8.8.8.8" > /etc/resolv.conf
echo "nameserver 1.1.1.1" >> /etc/resolv.conf
```

> **Warning**: After disabling systemd-resolved, verify your gift site still works:
> `curl -I https://gift.devops-monk.com` — if it works, continue. If not, your gift site
> was using systemd-resolved, and the `/etc/resolv.conf` fix above handles it.

**Start PowerDNS**:
```bash
systemctl restart pdns
systemctl enable pdns
```

**Verify**:
```bash
dig @127.0.0.1 dyn.devops-monk.com SOA
```

### Step 9: Install build tools (if not already installed)

```bash
# Check if already installed (likely yes from gift site)
node --version      # Should be v18+ or v20+
npm --version
pm2 --version

# Install build-essential if needed
apt install -y build-essential python3
```

### Step 10: Configure and build the DDNS app

```bash
cd /opt/ddns-platform
npm install
```

**Create production `.env`**:
```bash
cp .env.example .env
nano .env
```

```env
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://ddnsuser@127.0.0.1:PORT/ddns
PDNS_API_URL=http://127.0.0.1:8081/api/v1
PDNS_API_KEY=YOUR_POWERDNS_API_KEY
DDNS_ZONE=dyn.devops-monk.com
JWT_SECRET=RUN_openssl_rand_-hex_32_AND_PASTE_HERE
APP_URL=https://ddns.devops-monk.com
API_URL=https://api.devops-monk.com

# SMTP — for password reset emails (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=your-email@gmail.com

# OAuth (optional — skip if you only want email/password login)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

> **Replace `PORT` in DATABASE_URL** with the actual PostgreSQL port you found in Step 3 (e.g., `5432` or `5433`).

Generate JWT secret:
```bash
openssl rand -hex 32
```

**Run migrations** (replace PORT with your PostgreSQL port):
```bash
sudo -u postgres psql -p PORT -d ddns -f db/migrations/001_create_users.sql
sudo -u postgres psql -p PORT -d ddns -f db/migrations/002_create_oauth_accounts.sql
sudo -u postgres psql -p PORT -d ddns -f db/migrations/003_create_domains.sql
sudo -u postgres psql -p PORT -d ddns -f db/migrations/004_create_update_log.sql
sudo -u postgres psql -p PORT -d ddns -f db/migrations/005_add_blocked_to_users.sql
sudo -u postgres psql -p PORT -d ddns -f db/migrations/006_create_settings.sql
sudo -u postgres psql -p PORT -d ddns -f db/migrations/007_add_webhook_to_domains.sql
sudo -u postgres psql -p PORT -d ddns -f db/migrations/008_create_password_reset_tokens.sql
```

**IMPORTANT — Grant permissions to ddnsuser** (the app user needs access to tables):
```bash
sudo -u postgres psql -p PORT -d ddns -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ddnsuser; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ddnsuser;"
```

> If you skip this, the app will fail with `permission denied for table users`.

**Build the server and dashboard**:
```bash
cd server && npm run build && cd ..
cd dashboard && npm run build && cd ..
```

### Step 11: Start DDNS backend with PM2

```bash
cd /opt/ddns-platform/server
pm2 start dist/app.js --name ddns-api
pm2 save
```

**Verify both apps are running**:
```bash
pm2 status
```

You should see both your gift site process AND `ddns-api` as `online`.

**Test the DDNS API**:
```bash
curl http://localhost:3001/health
```

### Step 12: Add Nginx config for DDNS (does NOT touch gift site config)

> We're adding a NEW config file. Your existing gift site Nginx config stays exactly as it is.

**First, check your existing Nginx configs** (so you know what's there):
```bash
ls /etc/nginx/sites-enabled/
```

**Copy the DDNS Nginx config**:
```bash
cp /opt/ddns-platform/dns/nginx-ddns.conf /etc/nginx/sites-available/ddns
ln -s /etc/nginx/sites-available/ddns /etc/nginx/sites-enabled/ddns
```

**Test Nginx config** (this checks ALL configs including your gift site — if it fails, don't reload):
```bash
nginx -t
```

If it says `syntax is ok` and `test is successful`, reload:
```bash
systemctl reload nginx
```

**If `nginx -t` fails**: Read the error. It's likely a typo in the new file. Edit `/etc/nginx/sites-available/ddns` and fix it. Your gift site is still running fine because we haven't reloaded Nginx yet.

### Step 13: Add HTTPS with Certbot (does NOT touch existing certificates)

```bash
# Install certbot if not already installed
apt install -y certbot python3-certbot-nginx

# Get certificates for the NEW subdomains only
certbot --nginx -d ddns.devops-monk.com -d api.devops-monk.com
```

Certbot will:
- Get Let's Encrypt certificates for the two new subdomains
- Auto-modify the Nginx config to add SSL
- NOT touch your existing `gift.devops-monk.com` certificate

**Verify HTTPS auto-renewal**:
```bash
certbot renew --dry-run
```

### Step 14: Open port 53 in firewall (for DNS queries)

You need to open port 53 in **TWO places**:

**A) UFW (server-level firewall):**
```bash
# Check current firewall rules first
ufw status

# Add DNS ports (does NOT remove any existing rules)
ufw allow 53/tcp
ufw allow 53/udp
```

**B) Hostinger VPS Firewall (network-level firewall):**

> **IMPORTANT**: Hostinger has its own firewall that is separate from UFW. Even if UFW allows port 53, Hostinger's firewall will block it unless you add rules there too.

1. Log in to [Hostinger VPS panel](https://hpanel.hostinger.com)
2. Go to your VPS → **Firewall** section
3. Add two rules:
   - **Accept / TCP / Port 53 / Any source**
   - **Accept / UDP / Port 53 / Any source**

If you skip the Hostinger firewall step, `dig @ns1.devops-monk.com` will time out even though PowerDNS is running correctly.

**Do NOT** open ports 3001, 5432, or 8081 in either firewall.

### Step 15: Verify everything works (including gift site!)

```bash
# 1. Gift site still working? (MOST IMPORTANT)
curl -I https://gift.devops-monk.com

# 2. DDNS API
curl https://api.devops-monk.com/health

# 3. DDNS dashboard
curl -I https://ddns.devops-monk.com

# 4. PowerDNS
dig @127.0.0.1 dyn.devops-monk.com SOA

# 5. Both PM2 processes healthy
pm2 status
```

### Step 16: Set up Google OAuth (optional — for "Sign in with Google")

> Skip this if you only want email/password login.

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select existing one
3. Go to **OAuth consent screen**:
   - App name: `DevOps Monk DDNS`
   - User support email: your email
   - Audience: **External**
   - Contact email: your email
   - Save
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**:
   - Application type: **Web application**
   - Name: `DDNS Web`
   - Authorized JavaScript origins: `https://ddns.devops-monk.com`
   - Authorized redirect URIs: `https://ddns.devops-monk.com/auth/google/callback`
5. Copy **Client ID** and **Client Secret**
6. Add to `.env` on VPS:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```
7. Rebuild and restart:
   ```bash
   cd /opt/ddns-platform/server && npm run build && pm2 restart ddns-api
   ```

> **IMPORTANT**: The redirect URI must be `https://ddns.devops-monk.com/auth/google/callback` (NOT `api.devops-monk.com`). The Nginx config proxies `/auth/` from the dashboard domain to the backend, so the cookie stays on the same domain.

### Step 17: Set up GitHub OAuth (optional — for "Sign in with GitHub")

1. Go to GitHub → Settings → Developer Settings → OAuth Apps → **New OAuth App**
2. Fill in:
   - Application name: `DevOps Monk DDNS`
   - Homepage URL: `https://ddns.devops-monk.com`
   - Authorization callback URL: `https://ddns.devops-monk.com/auth/github/callback`
3. Copy **Client ID** and generate a **Client Secret**
4. Add to `.env` on VPS:
   ```
   GITHUB_CLIENT_ID=your-client-id
   GITHUB_CLIENT_SECRET=your-client-secret
   ```
5. Rebuild and restart:
   ```bash
   cd /opt/ddns-platform/server && npm run build && pm2 restart ddns-api
   ```

### Step 18: Set up SMTP for password reset emails

> Required for the "Forgot your password?" flow. Without SMTP, password resets will silently fail (no error to users, but no email sent).

**Using Gmail (free):**

1. Enable **2-Step Verification** on your Google account:
   - Go to https://myaccount.google.com/security
   - Turn on 2-Step Verification

2. Create an **App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - App name: `DDNS`
   - Click **Create**
   - Copy the 16-character password

3. Add to `.env` on VPS:
   ```bash
   nano /opt/ddns-platform/.env
   ```
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=abcdefghijklmnop
   SMTP_FROM=your-email@gmail.com
   ```

4. Restart:
   ```bash
   pm2 restart ddns-api
   ```

**Using other SMTP providers:**

| Provider | SMTP_HOST | SMTP_PORT | Notes |
|----------|-----------|-----------|-------|
| Gmail | smtp.gmail.com | 587 | Requires app password (2FA must be on) |
| Zoho | smtp.zoho.com | 587 | Free tier available |
| Outlook | smtp.office365.com | 587 | Microsoft account |
| Mailgun | smtp.mailgun.org | 587 | 5,000 free emails/month |

### Step 19: Set up automated backups

```bash
mkdir -p /var/backups/ddns
nano /etc/cron.daily/ddns-backup
```

Paste:
```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR=/var/backups/ddns

pg_dump -U ddnsuser ddns > $BACKUP_DIR/ddns-$DATE.sql
mysqldump -u pdns -pYOUR_PDNS_MYSQL_PASSWORD powerdns > $BACKUP_DIR/powerdns-$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
```

```bash
chmod +x /etc/cron.daily/ddns-backup
```

---

## Step-by-Step: Porkbun DNS Delegation

> **IMPORTANT**: Complete this BEFORE Step 13 (Certbot). Certbot needs these DNS records to exist before it can issue HTTPS certificates.
>
> This tells the internet that your Hostinger VPS handles DNS for `dyn.devops-monk.com` and serves the dashboard/API.
> These are NEW records — they do NOT affect your existing `gift.devops-monk.com` DNS.

### Step 1: Log in to Porkbun

Go to [porkbun.com](https://porkbun.com) and log in.

### Step 2: Go to DNS management

Click **Domain Management** → find `devops-monk.com` → click **DNS**.

### Step 3: Verify your existing records are there

You should see your existing records including `CNAME gift → srv870470.hstgr.cloud`. **Do not touch any existing records.**

### Step 4: Add CNAME records for dashboard, API, and nameserver

We use CNAME records pointing to your Hostinger VPS hostname (same pattern as your gift site).

**Add CNAME for `ddns`** (dashboard):

| Field | Value |
|-------|-------|
| Type | **CNAME** |
| Host | **ddns** |
| Answer | **srv870470.hstgr.cloud** |
| TTL | **600** |

Click **Add**.

**Add CNAME for `api`** (backend API):

| Field | Value |
|-------|-------|
| Type | **CNAME** |
| Host | **api** |
| Answer | **srv870470.hstgr.cloud** |
| TTL | **600** |

Click **Add**.

**Add A record for `ns1`** (PowerDNS nameserver):

> **IMPORTANT**: `ns1` MUST be an **A record**, NOT a CNAME. NS targets cannot be CNAMEs — DNS resolvers will refuse to follow them, and your DDNS subdomains will not resolve publicly.

| Field | Value |
|-------|-------|
| Type | **A** |
| Host | **ns1** |
| Answer | **YOUR_VPS_IPv4** (run `curl -4 ifconfig.me` on VPS to find it) |
| TTL | **600** |

Click **Add**.

### Step 5: Add the NS delegation record

This tells the internet that your VPS handles all DNS for `*.dyn.devops-monk.com`.

| Field | Value |
|-------|-------|
| Type | **NS** |
| Host | **dyn** |
| Answer | **ns1.devops-monk.com** |
| TTL | **600** |

Click **Add**.

### Step 6: Wait for DNS propagation

DNS changes usually take 2-5 minutes, but can take up to 48 hours.

**Check propagation** (from your local machine, not the VPS):
```bash
dig ddns.devops-monk.com
dig api.devops-monk.com
dig ns1.devops-monk.com

# All three should resolve to your VPS IP

dig dyn.devops-monk.com NS
# Should return ns1.devops-monk.com
```

### Step 7: Now run Certbot (back on the VPS)

Once the DNS records resolve, go back to your VPS and run:
```bash
certbot --nginx -d ddns.devops-monk.com -d api.devops-monk.com
```

### Step 8: Verify the full chain

```bash
# Test PowerDNS directly
dig @YOUR_HOSTINGER_VPS_IP dyn.devops-monk.com SOA

# Test the API
curl https://api.devops-monk.com/health

# Test the dashboard
curl -I https://ddns.devops-monk.com

# Verify gift site is STILL working
curl -I https://gift.devops-monk.com
```

### Porkbun DNS summary — what it should look like

After completing the steps, your Porkbun DNS should have these new records alongside your existing ones:

| Type | Host | Answer | Status |
|------|------|--------|--------|
| CNAME | `gift` | `srv870470.hstgr.cloud` | **EXISTING — do not touch** |
| CNAME | `ddns` | `srv870470.hstgr.cloud` | NEW |
| CNAME | `api` | `srv870470.hstgr.cloud` | NEW |
| **A** | **`ns1`** | **YOUR_VPS_IPv4** | **NEW — must be A record, NOT CNAME** |
| NS | `dyn` | `ns1.devops-monk.com` | NEW |

---

## How to Use the DDNS Service

### For developers (cron job)

```bash
# Add to crontab: crontab -e
*/5 * * * * curl -s "https://api.devops-monk.com/update?domain=SUBDOMAIN&token=TOKEN" > /dev/null
```

### For router firmware (DD-WRT, OpenWRT, EdgeRouter)

Use custom DDNS with this URL:
```
https://api.devops-monk.com/update?domain=SUBDOMAIN&token=TOKEN
```

### For non-developers (desktop app)

1. Download the DDNS Desktop Client from the releases page
2. Install it (drag to Applications on Mac, run .exe on Windows)
3. Enter server URL: `https://api.devops-monk.com`
4. Paste your subdomain and token from the web dashboard
5. The app runs in the background and keeps your IP updated automatically

---

## Admin Console

The admin console is available at `/admin` for users with the `is_admin` flag set.

**Setting up your admin account** (run on VPS):
```bash
sudo -u postgres psql -d ddns -c "UPDATE users SET is_admin = TRUE WHERE email = 'your-email@example.com';"
```

**Features**:
- **Stats dashboard** — total users, total domains, updates in the last 3 hours, blocked users
- **User management** — search users by email, view their domains, block/unblock accounts
- **Activity monitor** — see which domains have the most updates in the last 3 hours, with abuse indicators (>20 updates flagged as HIGH)
- **Rate limit settings** — configure per-token and per-account rate limits and time window via the UI
- **Block/unblock** — blocked users cannot log in or update DNS records

The admin link appears conditionally in the navbar on all pages for admin users.

---

## Documentation

| Document | What it covers |
|----------|----------------|
| [docs/server.md](docs/server.md) | Backend API — every route, auth flow, env vars |
| [docs/dashboard.md](docs/dashboard.md) | React frontend — pages, API client, customization |
| [docs/client-app.md](docs/client-app.md) | Desktop app — how it works, building, user guide |
| [docs/database.md](docs/database.md) | All database schemas, relationships, migrations |
| [docs/dns-setup.md](docs/dns-setup.md) | PowerDNS installation, zone config, troubleshooting |
| [docs/deployment.md](docs/deployment.md) | Full VPS deployment guide |
| [docs/api-reference.md](docs/api-reference.md) | Every API endpoint with examples |
| [PLAN.md](PLAN.md) | Implementation plan and phase tracking |

---

## Troubleshooting

### Gift site stopped working after DDNS setup

```bash
# Check Nginx configs for errors
nginx -t

# If there's an error in the DDNS config, disable it temporarily
rm /etc/nginx/sites-enabled/ddns
systemctl reload nginx
# Gift site should be back. Fix the DDNS config and re-enable.

# Check PM2 — both processes should be online
pm2 status

# Check if port 3000 is still used by gift site
ss -tlnp | grep 3000
```

### PowerDNS won't start

```bash
# Check what's wrong
journalctl -u pdns -n 50

# Most common: port 53 is in use by systemd-resolved
systemctl stop systemd-resolved
systemctl disable systemd-resolved
echo "nameserver 8.8.8.8" > /etc/resolv.conf
systemctl restart pdns
```

### DDNS API not responding

```bash
pm2 logs ddns-api        # Check for errors
pm2 restart ddns-api     # Restart

# Check it's on port 3001 (not 3000!)
ss -tlnp | grep 3001
```

### Dashboard shows blank page

```bash
ls /opt/ddns-platform/dashboard/dist/
# If empty, rebuild:
cd /opt/ddns-platform/dashboard && npm run build
```

### DNS not resolving from the internet

```bash
# 1. Check PowerDNS directly
dig @YOUR_VPS_IP dyn.devops-monk.com SOA

# 2. If that works but public DNS doesn't, NS delegation hasn't propagated
# Check: https://www.whatsmydns.net (search for dyn.devops-monk.com NS)

# 3. Check firewall
ufw status    # Port 53 tcp/udp should be ALLOW
```

### HTTPS certificate not working

```bash
# Check Nginx logs
tail -50 /var/log/nginx/error.log

# Re-run certbot
certbot --nginx -d ddns.devops-monk.com -d api.devops-monk.com

# Test renewal
certbot renew --dry-run
```

### PostgreSQL "password authentication failed" or "connection refused"

```bash
# Check what port PostgreSQL is actually running on
sudo -u postgres psql -c 'SHOW port;'

# If it's 5433 (not 5432), update your .env:
# DATABASE_URL=postgresql://ddnsuser@127.0.0.1:5433/ddns

# If password auth fails, switch to trust auth (safe for localhost):
nano /etc/postgresql/*/main/pg_hba.conf
# Add these lines near the top:
# local   ddns    ddnsuser    trust
# host    ddns    ddnsuser    127.0.0.1/32    trust

systemctl restart postgresql
pm2 restart ddns-api
```

### "permission denied for table users"

The app user doesn't have access to the tables. Fix:
```bash
sudo -u postgres psql -p PORT -d ddns -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ddnsuser; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ddnsuser;"
pm2 restart ddns-api
```

### "Unknown authentication strategy google"

The `.env` file isn't being loaded at startup, so Google OAuth credentials are empty.
```bash
# Check the .env has Google credentials
grep GOOGLE /opt/ddns-platform/.env

# Rebuild the server (the config.ts uses __dirname to find .env)
cd /opt/ddns-platform/server && npm run build && pm2 restart ddns-api
```

### PowerDNS "bind-config" error on startup

```bash
# Remove leftover bind backend config
rm -f /etc/powerdns/pdns.d/bind.conf
systemctl restart pdns
```

### DNS resolves directly but not publicly (nslookup fails)

If `dig @ns1.devops-monk.com homelab.dyn.devops-monk.com A` works but `nslookup homelab.dyn.devops-monk.com` doesn't:

1. **Check `ns1` is an A record, NOT a CNAME** — NS targets can't be CNAMEs
2. **Check NS delegation exists**: `dig dyn.devops-monk.com NS` should return `ns1.devops-monk.com`
3. **Check Hostinger firewall** allows port 53 TCP+UDP (separate from UFW)
4. **Wait for negative cache to expire** — if a resolver cached a NXDOMAIN/empty response, it may take up to 30 minutes. Try a different resolver: `dig @1.1.1.1 homelab.dyn.devops-monk.com A`

### Google OAuth "redirect_uri_mismatch" error

The redirect URI in Google Cloud Console doesn't match what the app sends.
- It must be exactly: `https://ddns.devops-monk.com/auth/google/callback`
- NOT `https://api.devops-monk.com/auth/google/callback`
- Changes in Google Console can take 5 minutes to propagate

### OAuth sign-in redirects to home page without logging in

The JWT cookie is being set on a different domain than the dashboard reads it from.
- OAuth callback URL must use the **dashboard domain** (`ddns.devops-monk.com`), not the API domain
- The Nginx config proxies `/auth/` to the backend, so cookies stay on the correct domain

### "KO - invalid token" when updating

- Copy the correct token from `https://ddns.devops-monk.com/dashboard`
- If you regenerated the token, update your cron/script/desktop app

### Rollback — completely remove DDNS without affecting gift site

```bash
# 1. Stop DDNS backend
pm2 stop ddns-api
pm2 delete ddns-api
pm2 save

# 2. Remove Nginx config
rm /etc/nginx/sites-enabled/ddns
rm /etc/nginx/sites-available/ddns
systemctl reload nginx

# 3. Stop PowerDNS
systemctl stop pdns
systemctl disable pdns

# 4. Remove databases (optional)
sudo -u postgres dropdb ddns
sudo -u postgres dropuser ddnsuser
mysql -u root -e "DROP DATABASE powerdns; DROP USER 'pdns'@'localhost';"

# 5. Remove files
rm -rf /opt/ddns-platform

# Gift site is completely unaffected
```

### Updating to a new version

```bash
cd /opt/ddns-platform
git pull origin main

# Install any new dependencies
cd server && npm install && npm run build && cd ..
cd dashboard && npx vite build && cd ..

# Run any new migrations (safe to re-run — all use IF NOT EXISTS / IF NOT EXISTS)
for f in db/migrations/*.sql; do
  sudo -u postgres psql -d ddns -f "$f"
done

# Grant permissions for any new tables
sudo -u postgres psql -d ddns -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ddnsuser; GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ddnsuser;"

pm2 restart ddns-api
```

---

## License

MIT
