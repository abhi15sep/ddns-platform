# DNS Setup Guide

How to install and configure PowerDNS as the authoritative DNS server for your DDNS platform.

## Overview

PowerDNS serves as the authoritative nameserver for your DDNS zone (e.g., `ddns.devops-monk.com`). When someone queries `myhome.ddns.devops-monk.com`, PowerDNS returns the IP address stored in its MySQL database. The Node.js backend updates these records via the PowerDNS REST API.

```
Internet resolver
    │
    ▼  "What is myhome.ddns.devops-monk.com?"
Registrar NS delegation
    │
    ▼  "Ask ns1.devops-monk.com"
PowerDNS (your VPS)
    │
    ▼  Looks up MySQL → returns A record
"203.0.113.42"
```

## Step 1: Install PowerDNS + MySQL

### Ubuntu/Debian

```bash
apt update
apt install -y pdns-server pdns-backend-mysql mysql-server
```

### Verify installation

```bash
pdns_server --version
mysql --version
```

## Step 2: Create PowerDNS Database

```bash
mysql -u root -p
```

```sql
CREATE DATABASE powerdns;
CREATE USER 'pdns'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';
GRANT ALL ON powerdns.* TO 'pdns'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Import the schema

If using the system-provided schema:
```bash
mysql -u pdns -p powerdns < /usr/share/doc/pdns-backend-mysql/schema.mysql.sql
```

Or use the copy in this project:
```bash
mysql -u pdns -p powerdns < dns/schema.sql
```

## Step 3: Configure PowerDNS MySQL Backend

Edit `/etc/powerdns/pdns.d/gmysql.conf`:

```ini
launch=gmysql
gmysql-host=127.0.0.1
gmysql-user=pdns
gmysql-password=STRONG_PASSWORD_HERE
gmysql-dbname=powerdns
```

## Step 4: Enable the HTTP API

Edit `/etc/powerdns/pdns.conf`:

```ini
api=yes
api-key=YOUR_LONG_RANDOM_API_KEY
webserver=yes
webserver-address=127.0.0.1
webserver-port=8081
webserver-allow-from=127.0.0.1
```

**Important**: `webserver-address=127.0.0.1` ensures the API is only accessible locally. The Node.js backend talks to it on localhost.

Generate the API key:
```bash
openssl rand -hex 32
```

## Step 5: Create Your DDNS Zone

```bash
mysql -u pdns -p powerdns
```

```sql
-- Create the zone
INSERT INTO domains (name, type) VALUES ('ddns.devops-monk.com', 'NATIVE');

-- Get the zone ID
SET @did = (SELECT id FROM domains WHERE name='ddns.devops-monk.com');

-- Add required SOA and NS records
INSERT INTO records (domain_id, name, type, content, ttl) VALUES
  (@did, 'ddns.devops-monk.com', 'SOA',
    'ns1.devops-monk.com. hostmaster.devops-monk.com. 1 3600 600 604800 300', 300),
  (@did, 'ddns.devops-monk.com', 'NS', 'ns1.devops-monk.com', 300);
```

Replace `devops-monk.com` with your actual domain everywhere.

Or use the provided script:
```bash
mysql -u pdns -p powerdns < dns/init-zone.sql
```

## Step 6: Delegate the Zone at Your Registrar

Go to Porkbun DNS management for `devops-monk.com` and add these records:

| Record Type | Host    | Answer                |
|-------------|---------|-----------------------|
| A           | `ns1`   | `YOUR_VPS_IP`         |
| NS          | `ddns`  | `ns1.devops-monk.com` |
| CNAME       | `api`   | `YOUR_VPS_HOSTNAME`   |

**Do NOT add a CNAME for `ddns`** — the NS record on `ddns` already makes your VPS authoritative for that entire label. PowerDNS serves the apex A record (dashboard) and all user subdomains from within the `ddns.devops-monk.com` zone.

This tells the internet: "For anything under `ddns.devops-monk.com`, ask `ns1.devops-monk.com` (your VPS). That includes the dashboard at `ddns.devops-monk.com` itself and all user subdomains like `homelab.ddns.devops-monk.com`."

### Porkbun steps

1. Log in at [porkbun.com](https://porkbun.com)
2. Go to **Domain Management** → `devops-monk.com` → **DNS**
3. Add each record above (Type, Host, Answer, TTL=300)
4. Wait 5-30 minutes for propagation (can take up to 48 hours)

## Step 7: Start and Verify

```bash
# Restart PowerDNS
systemctl restart pdns
systemctl enable pdns

# Check status
systemctl status pdns

# Test locally
dig @127.0.0.1 ddns.devops-monk.com SOA

# Test from the internet (after DNS propagation, may take up to 48 hours)
dig @YOUR_VPS_IP ddns.devops-monk.com SOA
```

### Test the API

```bash
# List zones
curl -s -H "X-API-Key: YOUR_API_KEY" http://127.0.0.1:8081/api/v1/servers/localhost/zones

# Get zone details
curl -s -H "X-API-Key: YOUR_API_KEY" http://127.0.0.1:8081/api/v1/servers/localhost/zones/ddns.devops-monk.com

# Create a test record
curl -s -X PATCH \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"rrsets":[{"name":"test.ddns.devops-monk.com.","type":"A","ttl":60,"changetype":"REPLACE","records":[{"content":"1.2.3.4","disabled":false}]}]}' \
  http://127.0.0.1:8081/api/v1/servers/localhost/zones/ddns.devops-monk.com

# Verify the test record
dig @127.0.0.1 test.ddns.devops-monk.com A
```

## Troubleshooting

### PowerDNS won't start
```bash
# Check logs
journalctl -u pdns -n 50

# Common issue: port 53 already in use (systemd-resolved on Ubuntu)
systemctl stop systemd-resolved
systemctl disable systemd-resolved
# Edit /etc/resolv.conf to use 8.8.8.8 or 1.1.1.1
```

### API returns 401
- Check that `api-key` in `pdns.conf` matches your `PDNS_API_KEY` env var
- Ensure `webserver-allow-from` includes the source IP (use `127.0.0.1` for local access)

### DNS queries don't resolve from the internet
- Wait for NS delegation to propagate (up to 48 hours)
- Verify the A record for `ns1.devops-monk.com` points to your VPS IP
- Check firewall: `ufw allow 53/tcp && ufw allow 53/udp`
- Test directly: `dig @YOUR_VPS_IP ddns.devops-monk.com SOA`

## Docker (Development)

For local development, use the included Docker Compose setup:

```bash
docker compose up -d
```

This starts PowerDNS on port 5353 (DNS) and 8081 (API). Set `PDNS_API_URL=http://127.0.0.1:8081/api/v1` and `PDNS_API_KEY=dev-api-key-change-in-production` in your `.env`.
