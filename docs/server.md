# Server Component

The backend API built with Node.js, Express, and TypeScript. It handles authentication, domain management, DDNS updates, and communicates with PowerDNS.

## Directory Structure

```
server/
├── src/
│   ├── app.ts              # Express entry point, middleware setup, route mounting
│   ├── config.ts            # Environment variable validation (zod schema)
│   ├── db.ts                # PostgreSQL connection pool
│   ├── powerdns.ts          # PowerDNS REST API client
│   ├── auth/
│   │   └── passport.ts      # OAuth strategies (Google, GitHub) + local
│   ├── middleware/
│   │   ├── requireAuth.ts   # JWT cookie verification middleware
│   │   └── errorHandler.ts  # Global async error handler
│   └── routes/
│       ├── health.ts        # GET /health — service health check
│       ├── auth.ts          # /auth/* — login, register, OAuth, logout
│       ├── update.ts        # GET /update — DDNS IP update endpoint
│       └── domains.ts       # /api/domains — CRUD + history
├── package.json
└── tsconfig.json
```

## Key Files Explained

### `config.ts`
Validates all environment variables at startup using Zod. If any required variable is missing or invalid, the server fails fast with a clear error message. This prevents runtime crashes from misconfiguration.

### `db.ts`
Creates a PostgreSQL connection pool using `pg.Pool`. The pool is shared across all routes. Connection string comes from `DATABASE_URL` env var.

### `powerdns.ts`
Wraps the PowerDNS HTTP API with three functions:
- `updateDNSRecord(subdomain, ip, type)` — Creates or replaces an A/AAAA record
- `deleteDNSRecord(subdomain, type)` — Removes a record
- `getDNSRecord(subdomain)` — Queries current records for a subdomain

All calls use the PowerDNS API key for authentication.

### `routes/update.ts`
The core DDNS endpoint. DuckDNS-compatible format:
```
GET /update?domain=SUBDOMAIN&token=TOKEN[&ip=1.2.3.4]
```
- If `ip` is omitted, auto-detects from request headers (`x-forwarded-for`) or socket
- Validates IPv4 and IPv6 addresses
- Rate limited: 1 request per 30 seconds per token
- Returns plain text `OK` or `KO - reason`

### `routes/auth.ts`
Handles all authentication flows:
- `POST /auth/register` — Email + password registration (bcrypt, 12 rounds)
- `POST /auth/login` — Email + password login
- `POST /auth/logout` — Clears JWT cookie
- `GET /auth/me` — Returns current user from JWT
- `GET /auth/google` + callback — Google OAuth2
- `GET /auth/github` + callback — GitHub OAuth2

JWTs are issued as httpOnly, secure, sameSite=lax cookies with 7-day expiry.

### `routes/domains.ts`
Protected CRUD API (requires JWT):
- `GET /api/domains` — List user's domains
- `POST /api/domains` — Create subdomain (validates format: 3-63 chars, lowercase alphanumeric + hyphens)
- `DELETE /api/domains/:subdomain` — Delete domain + remove DNS record
- `POST /api/domains/:subdomain/regenerate-token` — Generate new UUID token
- `GET /api/domains/:subdomain/history` — Paginated IP update log

### `auth/passport.ts`
Configures Passport.js strategies:
- **Google** — OAuth2 with profile + email scopes
- **GitHub** — OAuth2 with user:email scope
- **Local** — Email + password with bcrypt comparison

Account linking: If a user logs in via OAuth and their email matches an existing account, the OAuth identity is linked to that account rather than creating a duplicate.

## Running

```bash
# Development (auto-reload)
cd server
npm install
npm run dev

# Production build
npm run build
node dist/app.js

# With PM2
pm2 start dist/app.js --name ddns-api
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | development/production (default: development) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PDNS_API_URL` | Yes | PowerDNS REST API base URL |
| `PDNS_API_KEY` | Yes | PowerDNS API key |
| `DDNS_ZONE` | Yes | DNS zone name (e.g., `ddns.devops-monk.com`) |
| `JWT_SECRET` | Yes | Secret for signing JWTs (min 16 chars) |
| `APP_URL` | No | Frontend URL for OAuth redirects |
| `API_URL` | No | Backend URL for OAuth callbacks |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth client secret |

## Adding a New OAuth Provider

1. Install the Passport strategy: `npm install passport-<provider>`
2. Add client ID/secret env vars to `config.ts`
3. Add strategy configuration in `auth/passport.ts` using `findOrCreateOAuthUser()`
4. Add routes in `routes/auth.ts` (GET redirect + GET callback)
