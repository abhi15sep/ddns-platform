# Production Deployment Guide

Complete guide to deploying the DDNS platform on a Hostinger VPS with Porkbun domain.

## Requirements

- **VPS**: Hostinger VPS with Ubuntu 22.04+ (minimum 1 vCPU, 1GB RAM, 20GB disk)
- **Domain**: `devops-monk.com` on Porkbun
- **DNS Access**: Porkbun DNS management for NS and A records

> **Note**: The main README has the most detailed step-by-step instructions including Porkbun DNS screenshots. This file serves as a quick reference.

## Step 1: Provision and Secure the VPS

### Initial setup

```bash
# Update system
apt update && apt upgrade -y

# Set hostname
hostnamectl set-hostname ddns-server

# Create non-root user (if not already done)
adduser ddns
usermod -aG sudo ddns
```

### SSH hardening

```bash
# Copy SSH key (from your local machine)
ssh-copy-id ddns@YOUR_VPS_IP

# Disable password auth
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

## Step 2: Install System Dependencies

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# MySQL
sudo apt install -y mysql-server

# PowerDNS
sudo apt install -y pdns-server pdns-backend-mysql

# Build tools (for native npm packages like bcrypt)
sudo apt install -y build-essential python3

# PM2 (process manager)
sudo npm install -g pm2
```

### Nginx + Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

## Step 3: Set Up Databases

### PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE USER ddnsuser WITH PASSWORD 'STRONG_PG_PASSWORD';
CREATE DATABASE ddns OWNER ddnsuser;
\q
```

### MySQL (for PowerDNS)

Follow [docs/dns-setup.md](dns-setup.md) for MySQL + PowerDNS database setup.

## Step 4: Configure PowerDNS

Follow [docs/dns-setup.md](dns-setup.md) for:
1. MySQL backend configuration
2. HTTP API setup
3. Zone creation
4. Registrar NS delegation

## Step 5: Deploy the Application

### Clone the repository

```bash
sudo mkdir -p /opt/ddns-platform
sudo chown ddns:ddns /opt/ddns-platform
cd /opt/ddns-platform
git clone <your-repo-url> .
```

### Install dependencies

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env
nano .env
```

Set production values:

```env
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://ddnsuser:STRONG_PG_PASSWORD@localhost:5432/ddns
PDNS_API_URL=http://127.0.0.1:8081/api/v1
PDNS_API_KEY=your-powerdns-api-key
DDNS_ZONE=dyn.devops-monk.com
JWT_SECRET=$(openssl rand -hex 32)
APP_URL=https://ddns.devops-monk.com
API_URL=https://api.devops-monk.com

# OAuth (optional, configure after initial deploy)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### Run migrations

```bash
npm run migrate
```

### Build the dashboard

```bash
cd dashboard
npm run build
cd ..
```

### Build the server

```bash
cd server
npm run build
cd ..
```

## Step 6: Add Nginx Config

```bash
cp /opt/ddns-platform/dns/nginx-ddns.conf /etc/nginx/sites-available/ddns
ln -s /etc/nginx/sites-available/ddns /etc/nginx/sites-enabled/ddns

# Test config
nginx -t

# If test passes, reload
systemctl reload nginx
```

Then add HTTPS with Certbot:
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d ddns.devops-monk.com -d api.devops-monk.com
```

## Step 7: Start the Backend with PM2

```bash
cd /opt/ddns-platform/server
pm2 start dist/app.js --name ddns-api --interpreter node

# Save PM2 process list
pm2 save

# Enable PM2 to start on boot
pm2 startup
# Run the command it prints
```

### PM2 commands reference

```bash
pm2 status              # Check process status
pm2 logs ddns-api       # View logs
pm2 restart ddns-api    # Restart after code update
pm2 monit               # Real-time monitoring
```

## Step 8: Firewall

```bash
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 53/tcp     # DNS
sudo ufw allow 53/udp     # DNS
sudo ufw allow 80/tcp     # HTTP (Nginx redirects to HTTPS)
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable
```

**Do NOT** open ports 3000 (Node.js), 5432 (PostgreSQL), 3306 (MySQL), or 8081 (PowerDNS API) to the public.

## Step 9: Automated Backups

Create `/etc/cron.daily/ddns-backup`:

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR=/var/backups/ddns

mkdir -p $BACKUP_DIR

# PostgreSQL
pg_dump -U ddnsuser ddns > $BACKUP_DIR/ddns-$DATE.sql

# MySQL (PowerDNS)
mysqldump -u pdns -pYOUR_MYSQL_PASSWORD powerdns > $BACKUP_DIR/powerdns-$DATE.sql

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete

# Optional: upload to remote storage
# rclone copy $BACKUP_DIR remote:ddns-backups/
```

```bash
sudo chmod +x /etc/cron.daily/ddns-backup
```

## Step 10: Verify Everything

```bash
# 1. Check PowerDNS
dig @localhost dyn.devops-monk.com SOA

# 2. Check backend API
curl https://api.devops-monk.com/health

# 3. Check dashboard
curl -I https://devops-monk.com

# 4. Test DDNS update (create a domain via dashboard first)
curl "https://api.devops-monk.com/update?domain=test&token=YOUR_TOKEN"

# 5. Verify DNS resolution
dig test.dyn.devops-monk.com
```

## Updating the Application

```bash
cd /opt/ddns-platform
git pull

# Rebuild
cd server && npm run build && cd ..
cd dashboard && npm run build && cd ..

# Restart backend
pm2 restart ddns-api

# Run new migrations (if any)
npm run migrate
```

## Monitoring

### Basic health check cron

```bash
# /etc/cron.d/ddns-healthcheck
*/5 * * * * root curl -sf https://api.devops-monk.com/health > /dev/null || systemctl restart nginx && pm2 restart ddns-api
```

### PM2 monitoring

```bash
pm2 install pm2-logrotate    # Auto-rotate logs
pm2 monit                     # Real-time dashboard
```

## Troubleshooting

| Issue | Check |
|-------|-------|
| Dashboard shows blank page | `ls /opt/ddns-platform/dashboard/dist/` — did `npm run build` succeed? |
| API returns 502 | `pm2 logs ddns-api` — is the server running? |
| DNS not resolving | `dig @YOUR_VPS_IP dyn.devops-monk.com SOA` — is PowerDNS running? |
| HTTPS not working | `sudo nginx -t` and check `tail -50 /var/log/nginx/error.log` |
| OAuth redirect fails | Check `APP_URL` and `API_URL` in `.env` match your actual domain |
| Database connection error | `sudo systemctl status postgresql` |
