# Database Component

The platform uses two databases: PostgreSQL for application data and MySQL for PowerDNS zone storage.

## PostgreSQL — Application Database

Stores users, OAuth accounts, domains, and update history.

### Schema

#### `users`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `email` | TEXT (UNIQUE) | User's email address |
| `password_hash` | TEXT (nullable) | bcrypt hash, NULL for SSO-only users |
| `display_name` | TEXT (nullable) | Display name from OAuth profile |
| `is_admin` | BOOLEAN | Admin flag (default: false) |
| `created_at` | TIMESTAMPTZ | Account creation time |
| `updated_at` | TIMESTAMPTZ | Last profile update |

#### `oauth_accounts`
Links external OAuth identities to users. One user can have multiple OAuth accounts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK → users) | Owning user, CASCADE on delete |
| `provider` | TEXT | Provider name: `google`, `github`, `microsoft` |
| `provider_id` | TEXT | User's ID at that provider |
| `email` | TEXT (nullable) | Email from provider |
| `created_at` | TIMESTAMPTZ | Link creation time |

**Unique constraint**: `(provider, provider_id)` — one entry per provider identity.

#### `domains`
DDNS subdomain registrations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK → users) | Owner, CASCADE on delete |
| `subdomain` | TEXT (UNIQUE) | Subdomain name (e.g., `myhome`) |
| `token` | UUID | Update authentication token |
| `current_ip` | TEXT (nullable) | Last known IP address |
| `record_type` | TEXT | DNS record type: `A` or `AAAA` (default: `A`) |
| `updated_at` | TIMESTAMPTZ (nullable) | Last IP update time |
| `created_at` | TIMESTAMPTZ | Domain creation time |

**Indexes**: `user_id` (list user's domains), `token` (fast token validation on update).

#### `update_log`
Audit trail of all IP updates.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL (PK) | Auto-incrementing |
| `domain` | TEXT | Subdomain name |
| `ip` | TEXT | Updated IP address |
| `source_ip` | TEXT (nullable) | IP of the client making the request |
| `user_agent` | TEXT (nullable) | Client identifier (cron, desktop app, etc.) |
| `updated_at` | TIMESTAMPTZ | Update timestamp |

**Index**: `(domain, updated_at DESC)` — fast history queries sorted by recency.

### Entity Relationships

```
users (1) ──► (N) oauth_accounts    One user can link multiple OAuth providers
users (1) ──► (N) domains           One user can own many subdomains
domains (1) ──► (N) update_log      Each domain has many IP update entries
```

### Account Linking Flow

When a user logs in via OAuth:
1. Check if `(provider, provider_id)` exists in `oauth_accounts` → return linked user
2. If not, check if the OAuth email matches a `users.email` → link to existing user
3. If no match, create a new user + link the OAuth account

This means a user who registers with email can later "Sign in with Google" using the same email, and both login methods will work for the same account.

## MySQL — PowerDNS Database

Stores DNS zones and records. Managed entirely by PowerDNS.

### Key Tables

#### `domains` (PowerDNS)
| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Auto-increment |
| `name` | VARCHAR(255) | Zone name (e.g., `dyn.devops-monk.com`) |
| `type` | VARCHAR(8) | Zone type: `NATIVE`, `MASTER`, `SLAVE` |

#### `records` (PowerDNS)
| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT (PK) | Auto-increment |
| `domain_id` | INT (FK → domains) | Zone this record belongs to |
| `name` | VARCHAR(255) | FQDN (e.g., `myhome.dyn.devops-monk.com`) |
| `type` | VARCHAR(10) | Record type: `A`, `AAAA`, `SOA`, `NS` |
| `content` | VARCHAR(65535) | Record value (IP address, nameserver, etc.) |
| `ttl` | INT | Time to live in seconds (60 for DDNS records) |

**Note**: The PowerDNS MySQL schema is imported from `/usr/share/doc/pdns-backend-mysql/schema.mysql.sql`. A copy is in `dns/schema.sql`.

## Migrations

Migration files are in `db/migrations/` and run in order:

```
001_create_users.sql        # Users table + pgcrypto extension
002_create_oauth_accounts.sql  # OAuth account links + index
003_create_domains.sql      # DDNS domains + indexes
004_create_update_log.sql   # IP update audit log + index
```

### Running Migrations

```bash
# Using the migration script
cd db
DATABASE_URL=postgresql://ddnsuser:password@localhost:5432/ddns sh migrate.sh

# Or via npm
npm run migrate
```

### Adding New Migrations

Create a new numbered file in `db/migrations/`:
```bash
# Example: adding webhooks
touch db/migrations/005_create_webhooks.sql
```

The migration script runs all `.sql` files in alphabetical order. Already-applied migrations will show errors for existing tables (harmless) — for a production system, consider using a proper migration tool like `node-pg-migrate`.

## Backup

```bash
# PostgreSQL
pg_dump ddns > backup-ddns-$(date +%Y-%m-%d).sql

# MySQL (PowerDNS)
mysqldump -u pdns -p powerdns > backup-powerdns-$(date +%Y-%m-%d).sql
```

See [deployment.md](deployment.md) for automated backup setup.
