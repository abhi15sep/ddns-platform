# DDNS Platform — devops-monk.com

A self-hosted Dynamic DNS platform (better than DuckDNS) with a web dashboard, SSO login, full DNS control, and a desktop app for non-developers.

**Domain**: `devops-monk.com` (Porkbun)
**VPS**: Hostinger VPS
**DDNS Zone**: `dyn.devops-monk.com` — user subdomains like `myhome.dyn.devops-monk.com`

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
┌──────────────────────────┐
│  Node.js Backend (Express) │──► PostgreSQL (users, tokens, logs)
│  Port 3000                 │──► PowerDNS REST API (port 8081)
└──────────────────────────┘
    │                              │
    ▼                              ▼
React Dashboard              PowerDNS + MySQL
(Vite SPA, served by Caddy)  (Authoritative DNS, port 53)
                                   │
                                   ▼
                              Internet resolvers
                              (anyone doing DNS lookup)
```

---

## Project Structure

```
ddns-platform/
├── server/                  # Backend API (Node.js + Express + TypeScript)
│   └── src/
│       ├── app.ts           # Express entry point
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
├── dns/                     # PowerDNS SQL schemas
│   ├── schema.sql           # MySQL tables for PowerDNS
│   └── init-zone.sql        # Creates dyn.devops-monk.com zone
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
- Hostinger VPS with Ubuntu 22.04+ (any plan with 1+ vCPU, 1+ GB RAM)
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
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://ddnsuser:password@localhost:5432/ddns
PDNS_API_URL=http://127.0.0.1:8081/api/v1
PDNS_API_KEY=dev-api-key-change-in-production
DDNS_ZONE=dyn.devops-monk.com
JWT_SECRET=dev-jwt-secret-change-in-production-min-16-chars
APP_URL=http://localhost:5173
API_URL=http://localhost:3000
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

### Step 4: Run database migrations

```bash
npm run migrate
```

**What this does**: Creates the `users`, `oauth_accounts`, `domains`, and `update_log` tables in PostgreSQL.

**If you get a connection error**: Wait 10 seconds for PostgreSQL to fully start, then try again.

### Step 5: Install dependencies

```bash
npm install
```

### Step 6: Start the backend server

```bash
npm run dev:server
```

**Expected output**: `DDNS API running on port 3000`

**Test it**: Open a new terminal tab and run:
```bash
curl http://localhost:3000/health
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
6. Run it in terminal: `curl "http://localhost:3000/update?domain=test&token=YOUR_TOKEN"`
7. You should see `OK` and the IP will appear in the dashboard

### Step 9: Stop everything when done

```bash
# Stop the servers: Ctrl+C in each terminal tab
# Stop databases:
docker compose down
```

---

## Step-by-Step: Hostinger VPS Production Deployment

> These steps deploy the platform to your Hostinger VPS so it's live on the internet.

### Step 1: Get your Hostinger VPS IP

1. Log in to [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Go to **VPS** → select your server
3. Note down the **IP address** (e.g., `154.x.x.x`) — you'll need this everywhere
4. Note the **root password** or set up SSH keys

### Step 2: SSH into your VPS

```bash
ssh root@YOUR_HOSTINGER_VPS_IP
```

If using password auth (Hostinger default), enter the password from your panel.

### Step 3: Update the system

```bash
apt update && apt upgrade -y
```

### Step 4: Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

**Verify**: `node --version` should show `v20.x.x`

### Step 5: Install PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
```

**Create the database and user**:
```bash
sudo -u postgres psql
```

Inside the PostgreSQL prompt, run:
```sql
CREATE USER ddnsuser WITH PASSWORD 'PICK_A_STRONG_PASSWORD';
CREATE DATABASE ddns OWNER ddnsuser;
\q
```

**Write down the password** — you'll need it for `.env`.

### Step 6: Install MySQL

```bash
apt install -y mysql-server
```

**Create the PowerDNS database**:
```bash
mysql -u root
```

```sql
CREATE DATABASE powerdns;
CREATE USER 'pdns'@'localhost' IDENTIFIED BY 'PICK_ANOTHER_STRONG_PASSWORD';
GRANT ALL ON powerdns.* TO 'pdns'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

**Write down this password too.**

### Step 7: Install PowerDNS

```bash
apt install -y pdns-server pdns-backend-mysql
```

**Import the PowerDNS schema**:
```bash
# First, clone your project
mkdir -p /opt/ddns-platform
cd /opt/ddns-platform
git clone YOUR_REPO_URL .

# Import the schema
mysql -u pdns -p powerdns < dns/schema.sql
```

**Configure MySQL backend** — edit `/etc/powerdns/pdns.d/gmysql.conf`:
```bash
nano /etc/powerdns/pdns.d/gmysql.conf
```

Paste:
```ini
launch=gmysql
gmysql-host=127.0.0.1
gmysql-user=pdns
gmysql-password=YOUR_PDNS_MYSQL_PASSWORD
gmysql-dbname=powerdns
```

**Enable the HTTP API** — edit `/etc/powerdns/pdns.conf`:
```bash
nano /etc/powerdns/pdns.conf
```

Add these lines at the bottom:
```ini
api=yes
api-key=GENERATE_WITH_openssl_rand_-hex_32
webserver=yes
webserver-address=127.0.0.1
webserver-port=8081
webserver-allow-from=127.0.0.1
```

Generate the API key:
```bash
openssl rand -hex 32
# Copy the output and paste it as api-key above
# Also save it — you need it for .env
```

**Fix port 53 conflict** (Ubuntu uses systemd-resolved on port 53):
```bash
systemctl stop systemd-resolved
systemctl disable systemd-resolved

# Fix DNS resolution for the server itself
echo "nameserver 8.8.8.8" > /etc/resolv.conf
echo "nameserver 1.1.1.1" >> /etc/resolv.conf
```

**Create the DDNS zone**:
```bash
mysql -u pdns -p powerdns < dns/init-zone.sql
```

**Start PowerDNS**:
```bash
systemctl restart pdns
systemctl enable pdns
```

**Verify**:
```bash
dig @127.0.0.1 dyn.devops-monk.com SOA
```

You should see a response with `ns1.devops-monk.com` in the ANSWER section.

### Step 8: Install build tools and PM2

```bash
apt install -y build-essential python3
npm install -g pm2
```

### Step 9: Install and configure the app

```bash
cd /opt/ddns-platform
npm install
```

**Create the production `.env`**:
```bash
cp .env.example .env
nano .env
```

Set these values (replace placeholders with your actual passwords):
```env
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://ddnsuser:YOUR_PG_PASSWORD@localhost:5432/ddns
PDNS_API_URL=http://127.0.0.1:8081/api/v1
PDNS_API_KEY=YOUR_POWERDNS_API_KEY
DDNS_ZONE=dyn.devops-monk.com
JWT_SECRET=RUN_openssl_rand_-hex_32_AND_PASTE_HERE
APP_URL=https://ddns.devops-monk.com
API_URL=https://api.devops-monk.com
```

Generate the JWT secret:
```bash
openssl rand -hex 32
```

### Step 10: Run migrations and build

```bash
# Create PostgreSQL tables
npm run migrate

# Build the server
cd server && npm run build && cd ..

# Build the dashboard
cd dashboard && npm run build && cd ..
```

### Step 11: Start the backend with PM2

```bash
cd /opt/ddns-platform/server
pm2 start dist/app.js --name ddns-api
pm2 save
pm2 startup
# Run the command it prints (starts PM2 on boot)
```

**Verify**: `pm2 status` should show `ddns-api` as `online`.

### Step 12: Install and configure Caddy (HTTPS + reverse proxy)

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

**Configure Caddy** — edit `/etc/caddy/Caddyfile`:
```bash
nano /etc/caddy/Caddyfile
```

Replace the entire file with:
```caddyfile
ddns.devops-monk.com {
    root * /opt/ddns-platform/dashboard/dist
    file_server
    try_files {path} /index.html

    handle /api/* {
        reverse_proxy localhost:3000
    }
    handle /auth/* {
        reverse_proxy localhost:3000
    }
    handle /update* {
        reverse_proxy localhost:3000
    }
    handle /health* {
        reverse_proxy localhost:3000
    }
}

api.devops-monk.com {
    reverse_proxy localhost:3000
}
```

**Start Caddy**:
```bash
systemctl restart caddy
systemctl enable caddy
```

Caddy automatically gets Let's Encrypt HTTPS certificates — no certbot needed.

### Step 13: Set up the firewall

```bash
ufw allow 22/tcp     # SSH
ufw allow 53/tcp     # DNS queries
ufw allow 53/udp     # DNS queries
ufw allow 80/tcp     # HTTP (Caddy redirects to HTTPS)
ufw allow 443/tcp    # HTTPS
ufw enable
```

Type `y` when it asks to confirm.

**Important**: Do NOT open ports 3000, 5432, 3306, or 8081. They should only be accessible locally.

### Step 14: Set up automated backups

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
mysqldump -u pdns -pYOUR_MYSQL_PASSWORD powerdns > $BACKUP_DIR/powerdns-$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
```

```bash
chmod +x /etc/cron.daily/ddns-backup
```

---

## Step-by-Step: Porkbun DNS Delegation

> This tells the internet that your Hostinger VPS is the authoritative DNS server for `dyn.devops-monk.com`.

### Step 1: Log in to Porkbun

Go to [porkbun.com](https://porkbun.com) and log in.

### Step 2: Go to DNS management

Click **Domain Management** → find `devops-monk.com` → click **DNS**.

### Step 3: Add the A record for your nameserver

This tells the internet where `ns1.devops-monk.com` lives.

| Field | Value |
|-------|-------|
| Type | **A** |
| Host | **ns1** |
| Answer | **YOUR_HOSTINGER_VPS_IP** (e.g., `154.x.x.x`) |
| TTL | **300** |

Click **Add**.

### Step 4: Add the NS delegation record

This tells the internet that your VPS handles all DNS for `*.dyn.devops-monk.com`.

| Field | Value |
|-------|-------|
| Type | **NS** |
| Host | **dyn** |
| Answer | **ns1.devops-monk.com** |
| TTL | **300** |

Click **Add**.

### Step 5: Add A records for the web dashboard and API

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

### Step 6: Wait for DNS propagation

DNS changes can take up to 48 hours to propagate, but usually it's 5-30 minutes.

**Check propagation**:
```bash
# From your local machine (not the VPS)
dig ns1.devops-monk.com A
dig dyn.devops-monk.com NS

# Should return your VPS IP and ns1.devops-monk.com respectively
```

### Step 7: Verify the full chain

```bash
# Test PowerDNS directly
dig @YOUR_HOSTINGER_VPS_IP dyn.devops-monk.com SOA

# Test the API
curl https://api.devops-monk.com/health

# Test the dashboard
curl -I https://ddns.devops-monk.com
```

### Porkbun DNS summary — what it should look like

After completing the steps, your Porkbun DNS should have these records (in addition to any existing ones):

| Type | Host | Answer |
|------|------|--------|
| A | `ns1` | `YOUR_VPS_IP` |
| NS | `dyn` | `ns1.devops-monk.com` |
| A | `ddns` | `YOUR_VPS_IP` |
| A | `api` | `YOUR_VPS_IP` |

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

### Backend API not responding

```bash
pm2 logs ddns-api        # Check for errors
pm2 restart ddns-api     # Restart
```

### Dashboard shows blank page

```bash
# Check if build succeeded
ls /opt/ddns-platform/dashboard/dist/

# If empty, rebuild
cd /opt/ddns-platform/dashboard && npm run build
```

### DNS not resolving from the internet

```bash
# 1. Check PowerDNS directly
dig @YOUR_VPS_IP dyn.devops-monk.com SOA

# 2. If that works but public DNS doesn't, NS delegation hasn't propagated yet
# Check at: https://www.whatsmydns.net (search for dyn.devops-monk.com NS)

# 3. Check firewall
ufw status    # Port 53 tcp/udp should be ALLOW
```

### HTTPS certificate not working

```bash
# Check Caddy logs
journalctl -u caddy -n 50

# Make sure DNS A records for ddns.devops-monk.com and api.devops-monk.com
# point to your VPS IP (check in Porkbun)

# Restart Caddy
systemctl restart caddy
```

### "KO - invalid token" when updating

- Make sure you're using the correct token (copy from dashboard)
- Check that the domain exists: go to `https://ddns.devops-monk.com/dashboard`
- If you regenerated the token, update your cron/script/desktop app with the new one

### Updating to a new version

```bash
cd /opt/ddns-platform
git pull
cd server && npm run build && cd ..
cd dashboard && npm run build && cd ..
npm run migrate          # Apply any new migrations
pm2 restart ddns-api
```

---

## License

MIT
