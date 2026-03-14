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
9. [Documentation](#documentation)
10. [Troubleshooting](#troubleshooting)

---

## What This Does

Your home internet IP changes frequently. This platform lets you (and your users) register subdomains like `myhome.dyn.devops-monk.com` that always point to their current IP. A small script or the desktop app pings the server every few minutes to keep the DNS record updated.

**Features**:
- Web dashboard to manage domains, view IP history, copy update URLs
- SSO login (Google, GitHub, Microsoft) plus email/password
- A and AAAA records (IPv4 + IPv6)
- Desktop client app for non-developers (Windows, macOS, Linux)
- Unlimited subdomains per user
- Per-domain scoped tokens
- Full IP change audit log
- DuckDNS-compatible update API (works with router firmware)
- Rate limiting and abuse protection

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
| 5432 | PostgreSQL | NEW |
| 8081 | PowerDNS API | NEW (localhost only) |

---

## Project Structure

```
ddns-platform/
├── server/                  # Backend API (Node.js + Express + TypeScript)
│   └── src/
│       ├── app.ts           # Express entry point (port 3001)
│       ├── config.ts        # Environment validation
│       ├── db.ts            # PostgreSQL connection
│       ├── powerdns.ts      # PowerDNS REST API client
│       ├── auth/passport.ts # OAuth + local auth strategies
│       ├── middleware/      # JWT auth, error handling
│       └── routes/          # health, auth, update, domains
│
├── dashboard/               # Web frontend (React + Vite + TypeScript)
│   └── src/
│       ├── App.tsx          # Route definitions
│       ├── api/client.ts    # API calls to backend
│       ├── hooks/useAuth.ts # Auth state management
│       └── pages/           # Login, Register, DomainList, DomainDetail
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
│   └── 004_create_update_log.sql
│
├── docs/                    # Detailed docs for each component
├── docker-compose.yml       # Dev databases (PostgreSQL, MySQL, PowerDNS)
├── .env.example             # All config variables with descriptions
├── PLAN.md                  # Implementation plan
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

**What this does**: Creates the `users`, `oauth_accounts`, `domains`, and `update_log` tables in PostgreSQL.

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

**What this does**: Installs PostgreSQL on port 5432. This is a completely separate database server from MySQL. Your gift site uses MySQL — we're adding PostgreSQL for the DDNS app data.

**Create the DDNS database and user**:
```bash
sudo -u postgres psql
```

```sql
CREATE USER ddnsuser WITH PASSWORD 'PICK_A_STRONG_PASSWORD';
CREATE DATABASE ddns OWNER ddnsuser;
\q
```

**Save this password** — you'll need it for `.env`.

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
DATABASE_URL=postgresql://ddnsuser:YOUR_PG_PASSWORD@localhost:5432/ddns
PDNS_API_URL=http://127.0.0.1:8081/api/v1
PDNS_API_KEY=YOUR_POWERDNS_API_KEY
DDNS_ZONE=dyn.devops-monk.com
JWT_SECRET=RUN_openssl_rand_-hex_32_AND_PASTE_HERE
APP_URL=https://ddns.devops-monk.com
API_URL=https://api.devops-monk.com
```

Generate JWT secret:
```bash
openssl rand -hex 32
```

**Run migrations and build**:
```bash
npm run migrate
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

```bash
# Check current firewall rules first
ufw status

# Add DNS ports (does NOT remove any existing rules)
ufw allow 53/tcp
ufw allow 53/udp
```

**Do NOT** open ports 3001, 5432, or 8081.

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

### Step 16: Set up automated backups

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

> This tells the internet that your Hostinger VPS is the authoritative DNS server for `dyn.devops-monk.com`.
> These are NEW records — they do NOT affect your existing `gift.devops-monk.com` DNS.

### Step 1: Log in to Porkbun

Go to [porkbun.com](https://porkbun.com) and log in.

### Step 2: Go to DNS management

Click **Domain Management** → find `devops-monk.com` → click **DNS**.

### Step 3: Verify your existing gift record is there

You should see an existing A record for `gift` pointing to your VPS IP. **Do not touch it.**

### Step 4: Add the A record for your nameserver

This tells the internet where `ns1.devops-monk.com` lives.

| Field | Value |
|-------|-------|
| Type | **A** |
| Host | **ns1** |
| Answer | **YOUR_HOSTINGER_VPS_IP** (e.g., `154.x.x.x`) |
| TTL | **300** |

Click **Add**.

### Step 5: Add the NS delegation record

This tells the internet that your VPS handles all DNS for `*.dyn.devops-monk.com`.

| Field | Value |
|-------|-------|
| Type | **NS** |
| Host | **dyn** |
| Answer | **ns1.devops-monk.com** |
| TTL | **300** |

Click **Add**.

### Step 6: Add A records for the web dashboard and API

| Field | Value |
|-------|-------|
| Type | **A** |
| Host | **ddns** |
| Answer | **YOUR_HOSTINGER_VPS_IP** |
| TTL | **300** |

| Field | Value |
|-------|-------|
| Type | **A** |
| Host | **api** |
| Answer | **YOUR_HOSTINGER_VPS_IP** |
| TTL | **300** |

### Step 7: Wait for DNS propagation

DNS changes can take up to 48 hours to propagate, but usually it's 5-30 minutes.

**Check propagation**:
```bash
# From your local machine (not the VPS)
dig ns1.devops-monk.com A
dig dyn.devops-monk.com NS

# Should return your VPS IP and ns1.devops-monk.com respectively
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

After completing the steps, your Porkbun DNS should have these records:

| Type | Host | Answer | Status |
|------|------|--------|--------|
| A | `gift` | `YOUR_VPS_IP` | **EXISTING — do not touch** |
| A | `ns1` | `YOUR_VPS_IP` | NEW |
| NS | `dyn` | `ns1.devops-monk.com` | NEW |
| A | `ddns` | `YOUR_VPS_IP` | NEW |
| A | `api` | `YOUR_VPS_IP` | NEW |

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
git pull
cd server && npm run build && cd ..
cd dashboard && npm run build && cd ..
npm run migrate
pm2 restart ddns-api
```

---

## License

MIT
