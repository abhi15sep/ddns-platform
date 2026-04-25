# DDNS Platform — devops-monk.com

A self-hosted Dynamic DNS platform with a web dashboard, SSO login, full DNS control, and a desktop app for non-developers.

**Domain**: `devops-monk.com` (Porkbun)
**VPS**: Hostinger VPS
**DDNS Zone**: `ddns.devops-monk.com` — user subdomains like `myhome.ddns.devops-monk.com`

---

## Table of Contents

1. [What This Does](#what-this-does)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Step-by-Step: Local Development Setup](#step-by-step-local-development-setup)
6. [Step-by-Step: VPS Production Deployment](#step-by-step-vps-production-deployment)
7. [Step-by-Step: Porkbun DNS Delegation](#step-by-step-porkbun-dns-delegation)
8. [How to Use the DDNS Service](#how-to-use-the-ddns-service)
9. [Admin Console](#admin-console)
10. [Documentation](#documentation)
11. [Troubleshooting](#troubleshooting)

---

## What This Does

Your home internet IP changes frequently. This platform lets you (and your users) register subdomains like `myhome.ddns.devops-monk.com` that always point to their current IP. A small script or the desktop app pings the server every few minutes to keep the DNS record updated.

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
└───────────────┬─────────────────┘
                │
                ▼
          ┌───────────┐
          │ DDNS API  │──► PostgreSQL (users, tokens, logs)
          │ port 3001 │──► PowerDNS REST API (port 8081)
          └───────────┘
                │
                ▼
          PowerDNS + MySQL
          (Authoritative DNS, port 53)
                │
                ▼
          Internet resolvers
```

**Port allocation on the VPS:**

| Port | Service |
|------|---------|
| 22 | SSH |
| 53 | PowerDNS (DNS queries) |
| 80 | Nginx |
| 443 | Nginx (HTTPS) |
| 3001 | DDNS API (Express) |
| 3306 | MySQL (PowerDNS backend) |
| 5432/5433 | PostgreSQL (app data) |
| 8081 | PowerDNS API (localhost only) |

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
│   ├── init-zone.sql        # Creates ddns.devops-monk.com zone
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
└── package.json             # npm workspace root
```

---

## Prerequisites

**For local development** (your Mac):
- Node.js 20+ (`brew install node`)
- Docker Desktop (`brew install --cask docker`)
- Git

**For production** (Hostinger VPS):
- A VPS running Ubuntu 20.04+
- SSH access
- Porkbun account with `devops-monk.com` domain

---

## Step-by-Step: Local Development Setup

### Step 1: Clone the project

```bash
git clone https://github.com/devops-monk/ddns-platform.git
cd ddns-platform
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
DDNS_ZONE=ddns.devops-monk.com
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

Starts 3 containers:
- PostgreSQL on port 5432 (app data: users, domains, logs)
- MySQL on port 3306 (PowerDNS zone data)
- PowerDNS on port 5353 (DNS) and port 8081 (API)

### Step 4: Install dependencies

```bash
npm install
```

### Step 5: Run database migrations

```bash
npm run migrate
```

### Step 6: Start the backend server

```bash
npm run dev:server
```

Test it: `curl http://localhost:3001/health` → `{"status":"ok","timestamp":"..."}`

### Step 7: Start the dashboard (new terminal tab)

```bash
npm run dev:dashboard
```

Open http://localhost:5173 in your browser.

### Step 8: Test the flow

1. Go to http://localhost:5173/register and create an account
2. Create a subdomain (e.g., `test`)
3. Copy the update URL from the domain detail page
4. Run: `curl "http://localhost:3001/update?domain=test&token=YOUR_TOKEN"`
5. You should see `OK` and the IP appears in the dashboard

---

## Step-by-Step: VPS Production Deployment

### Step 1: SSH into your VPS

```bash
ssh root@YOUR_VPS_IP
```

### Step 2: Install PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
```

**Check the PostgreSQL port** (may be 5432 or 5433):
```bash
sudo -u postgres psql -c 'SHOW port;'
```

**Create the DDNS database and user**:
```bash
sudo -u postgres psql
```
```sql
CREATE USER ddnsuser;
CREATE DATABASE ddns OWNER ddnsuser;
\q
```

**Set up trust auth** so the app connects without a password:
```bash
nano /etc/postgresql/*/main/pg_hba.conf
```
Add near the top:
```
local   ddns    ddnsuser                                trust
host    ddns    ddnsuser    127.0.0.1/32                trust
```
```bash
systemctl restart postgresql
```

### Step 3: Install MySQL and create PowerDNS database

```bash
apt install -y mysql-server
mysql -u root
```
```sql
CREATE DATABASE powerdns;
CREATE USER 'pdns'@'localhost' IDENTIFIED BY 'PICK_A_PDNS_PASSWORD';
GRANT ALL ON powerdns.* TO 'pdns'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 4: Install PowerDNS

```bash
apt install -y pdns-server pdns-backend-mysql

# Remove the default bind backend (causes startup failure if left)
rm -f /etc/powerdns/pdns.d/bind.conf
```

### Step 5: Clone the project

```bash
mkdir -p /opt/ddns-platform
cd /opt/ddns-platform
git clone https://github.com/devops-monk/ddns-platform.git .
```

### Step 6: Import PowerDNS schema and create DNS zone

```bash
mysql -u pdns -p powerdns < dns/schema.sql
mysql -u pdns -p powerdns < dns/init-zone.sql
```

### Step 7: Configure PowerDNS

Create `/etc/powerdns/pdns.d/gmysql.conf`:
```ini
launch=gmysql
gmysql-host=127.0.0.1
gmysql-user=pdns
gmysql-password=YOUR_PDNS_MYSQL_PASSWORD
gmysql-dbname=powerdns
```

Add to `/etc/powerdns/pdns.conf`:
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
```

**Fix port 53 conflict** (Ubuntu's systemd-resolved uses port 53):
```bash
systemctl stop systemd-resolved
systemctl disable systemd-resolved
echo "nameserver 8.8.8.8" > /etc/resolv.conf
echo "nameserver 1.1.1.1" >> /etc/resolv.conf
```

```bash
systemctl restart pdns
systemctl enable pdns
```

Verify: `dig @127.0.0.1 ddns.devops-monk.com SOA`

### Step 8: Configure and build the app

```bash
cd /opt/ddns-platform
npm install
cp .env.example .env
nano .env
```

```env
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://ddnsuser@127.0.0.1:PORT/ddns
PDNS_API_URL=http://127.0.0.1:8081/api/v1
PDNS_API_KEY=YOUR_POWERDNS_API_KEY
DDNS_ZONE=ddns.devops-monk.com
JWT_SECRET=RUN_openssl_rand_-hex_32_AND_PASTE_HERE
APP_URL=https://ddns.devops-monk.com
API_URL=https://api.devops-monk.com

# SMTP — for password reset emails (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=your-email@gmail.com

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

**Run migrations**:
```bash
for f in db/migrations/*.sql; do
  sudo -u postgres psql -p PORT -d ddns -f "$f"
done
sudo -u postgres psql -p PORT -d ddns -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO ddnsuser; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ddnsuser;"
```

**Build**:
```bash
cd server && npm run build && cd ..
cd dashboard && npm run build && cd ..
```

### Step 9: Start with PM2

```bash
cd /opt/ddns-platform/server
pm2 start dist/app.js --name ddns-api
pm2 save
```

Test: `curl http://localhost:3001/health`

### Step 10: Add Nginx config

```bash
cp /opt/ddns-platform/dns/nginx-ddns.conf /etc/nginx/sites-available/ddns
ln -s /etc/nginx/sites-available/ddns /etc/nginx/sites-enabled/ddns
nginx -t && systemctl reload nginx
```

### Step 11: Add HTTPS with Certbot

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d ddns.devops-monk.com -d api.devops-monk.com
certbot renew --dry-run
```

### Step 12: Open port 53 in the firewall

**UFW (server-level)**:
```bash
ufw allow 53/tcp
ufw allow 53/udp
```

**Hostinger firewall (network-level)**: Log in to [hpanel.hostinger.com](https://hpanel.hostinger.com) → VPS → Firewall → add Accept TCP/UDP port 53.

### Step 13: Verify everything works

```bash
curl https://api.devops-monk.com/health
curl -I https://ddns.devops-monk.com
dig @127.0.0.1 ddns.devops-monk.com SOA
pm2 status
```

### Step 14: Set up Google OAuth (optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Credentials → Create OAuth 2.0 Client ID
2. Authorized redirect URI: `https://ddns.devops-monk.com/auth/google/callback`
3. Add to `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```
4. `cd /opt/ddns-platform/server && npm run build && pm2 restart ddns-api`

### Step 15: Set up GitHub OAuth (optional)

1. GitHub → Settings → Developer Settings → OAuth Apps → New OAuth App
2. Callback URL: `https://ddns.devops-monk.com/auth/github/callback`
3. Add to `.env`:
   ```env
   GITHUB_CLIENT_ID=your-client-id
   GITHUB_CLIENT_SECRET=your-client-secret
   ```
4. `cd /opt/ddns-platform/server && npm run build && pm2 restart ddns-api`

### Step 16: Set up SMTP for password reset emails

1. Enable 2-Step Verification on your Google account
2. Create an App Password at https://myaccount.google.com/apppasswords
3. Add to `.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   SMTP_FROM=your-email@gmail.com
   ```
4. `pm2 restart ddns-api`

### Step 17: Set up automated backups

```bash
mkdir -p /var/backups/ddns
nano /etc/cron.daily/ddns-backup
```

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR=/var/backups/ddns

pg_dump -U ddnsuser ddns > $BACKUP_DIR/ddns-$DATE.sql
mysqldump -u pdns -pYOUR_PDNS_MYSQL_PASSWORD powerdns > $BACKUP_DIR/powerdns-$DATE.sql

find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
```

```bash
chmod +x /etc/cron.daily/ddns-backup
```

---

## Step-by-Step: Porkbun DNS Delegation

This tells the internet that your VPS handles DNS for everything under `ddns.devops-monk.com` — both the dashboard itself and all user subdomains like `homelab.ddns.devops-monk.com`.

**Key insight**: instead of a CNAME for `ddns`, we use an NS delegation pointing to our own PowerDNS. PowerDNS then serves both the apex A record (dashboard) and all user subdomain records from within the same zone.

### Step 1: Add DNS records in Porkbun

Log in to [porkbun.com](https://porkbun.com) → Domain Management → `devops-monk.com` → DNS.

Add these three records:

| Type | Host   | Answer                | TTL | Notes                                              |
|------|--------|-----------------------|-----|----------------------------------------------------|
| NS   | `ddns` | `ns1.devops-monk.com` | 600 | Delegates all of `ddns.devops-monk.com` to your VPS |
| A    | `ns1`  | `YOUR_VPS_IPv4`       | 600 | Must be A record — NS targets can't be CNAMEs      |
| CNAME | `api` | `YOUR_VPS_HOSTNAME`   | 600 | Serves the backend API                             |

> **Do NOT add a CNAME for `ddns`** — you cannot have both a CNAME and NS on the same label. The NS record handles it all.

Run `curl -4 ifconfig.me` on the VPS to get `YOUR_VPS_IPv4`.
Your `YOUR_VPS_HOSTNAME` is the Hostinger hostname (e.g. `srv870470.hstgr.cloud`).

### Step 2: Add the apex A record in PowerDNS

Once PowerDNS is authoritative for `ddns.devops-monk.com`, add an A record so the dashboard resolves:

```bash
# On the VPS — adds ddns.devops-monk.com → VPS IP so nginx can serve the dashboard
mysql -u pdns -p powerdns -e "
  SET @did = (SELECT id FROM domains WHERE name='ddns.devops-monk.com');
  INSERT INTO records (domain_id, name, type, content, ttl)
  VALUES (@did, 'ddns.devops-monk.com', 'A', 'YOUR_VPS_IPv4', 300);
"
```

Or use `init-zone.sql` (already includes this record) when setting up for the first time.

### Step 3: Verify propagation

```bash
dig ddns.devops-monk.com          # should return your VPS IP (dashboard)
dig api.devops-monk.com           # should return your VPS IP (API)
dig ns1.devops-monk.com           # should return your VPS IP
dig ddns.devops-monk.com NS       # should return ns1.devops-monk.com
dig homelab.ddns.devops-monk.com  # should return the user's home IP (once registered)
```

### Step 4: Run Certbot (after DNS propagates)

```bash
certbot --nginx -d ddns.devops-monk.com -d api.devops-monk.com
```

---

## How to Use the DDNS Service

### Cron job (Linux/macOS)

```bash
# Add to crontab: crontab -e
*/5 * * * * curl -s "https://api.devops-monk.com/update?domain=SUBDOMAIN&token=TOKEN" > /dev/null
```

### Router firmware (DD-WRT, OpenWRT, EdgeRouter)

```
https://api.devops-monk.com/update?domain=SUBDOMAIN&token=TOKEN
```

### Desktop app (Windows, macOS, Linux)

1. Download from `https://ddns.devops-monk.com/downloads`
2. Install and launch
3. Enter server URL: `https://api.devops-monk.com`
4. Paste your subdomain and token from the web dashboard
5. The app runs in the background and keeps your IP updated automatically

---

## Admin Console

Available at `/admin` for users with the `is_admin` flag set.

**Set up your admin account** (run on VPS):
```bash
sudo -u postgres psql -d ddns -c "UPDATE users SET is_admin = TRUE WHERE email = 'your-email@example.com';"
```

**Features**:
- Stats dashboard — total users, domains, recent updates, blocked users
- User management — search, view domains, block/unblock
- Activity monitor — domains with the most updates, abuse indicators
- Rate limit settings — configure per-token and per-account limits via the UI

---

## Documentation

| Document | What it covers |
|---|---|
| [docs/server.md](docs/server.md) | Backend API — every route, auth flow, env vars |
| [docs/dashboard.md](docs/dashboard.md) | React frontend — pages, API client, customization |
| [docs/client-app.md](docs/client-app.md) | Desktop app — how it works, building, user guide |
| [docs/database.md](docs/database.md) | All database schemas, relationships, migrations |
| [docs/dns-setup.md](docs/dns-setup.md) | PowerDNS installation, zone config, troubleshooting |
| [docs/deployment.md](docs/deployment.md) | Full VPS deployment guide |
| [docs/api-reference.md](docs/api-reference.md) | Every API endpoint with examples |

---

## Troubleshooting

### PowerDNS won't start

```bash
journalctl -u pdns -n 50

# Most common: port 53 is in use by systemd-resolved
systemctl stop systemd-resolved
systemctl disable systemd-resolved
echo "nameserver 8.8.8.8" > /etc/resolv.conf
systemctl restart pdns
```

### DDNS API not responding

```bash
pm2 logs ddns-api
pm2 restart ddns-api
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
dig @YOUR_VPS_IP ddns.devops-monk.com SOA
# If that works but public DNS doesn't, NS delegation hasn't propagated
# Check firewall: ufw status (port 53 tcp/udp should be ALLOW)
# Also check your VPS provider's network-level firewall for port 53
```

### HTTPS certificate not working

```bash
tail -50 /var/log/nginx/error.log
certbot --nginx -d ddns.devops-monk.com -d api.devops-monk.com
certbot renew --dry-run
```

### PostgreSQL connection errors

```bash
# Check the actual port
sudo -u postgres psql -c 'SHOW port;'

# Switch to trust auth if needed
nano /etc/postgresql/*/main/pg_hba.conf
# Add: local ddns ddnsuser trust
# Add: host  ddns ddnsuser 127.0.0.1/32 trust
systemctl restart postgresql
pm2 restart ddns-api
```

### "permission denied for table users"

```bash
sudo -u postgres psql -d ddns -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO ddnsuser; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ddnsuser;"
pm2 restart ddns-api
```

### "Unknown authentication strategy google"

```bash
grep GOOGLE /opt/ddns-platform/.env
cd /opt/ddns-platform/server && npm run build && pm2 restart ddns-api
```

### PowerDNS "bind-config" error

```bash
rm -f /etc/powerdns/pdns.d/bind.conf
systemctl restart pdns
```

### DNS resolves directly but not publicly

1. Check `ns1` is an **A record**, not a CNAME
2. Check NS delegation: `dig ddns.devops-monk.com NS`
3. Check your VPS provider's firewall allows port 53 TCP+UDP
4. Try a different resolver: `dig @1.1.1.1 homelab.ddns.devops-monk.com A`

### Google OAuth "redirect_uri_mismatch"

Redirect URI must be exactly: `https://ddns.devops-monk.com/auth/google/callback`

### "KO - invalid token" when updating

Copy the correct token from the dashboard. If you regenerated it, update your cron/script/desktop app.

### Updating to a new version

```bash
cd /opt/ddns-platform
git pull origin main
cd server && npm install && npm run build && cd ..
cd dashboard && npx vite build && cd ..
for f in db/migrations/*.sql; do
  sudo -u postgres psql -d ddns -f "$f"
done
sudo -u postgres psql -d ddns -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO ddnsuser; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ddnsuser;"
pm2 restart ddns-api
```

---

## License

MIT