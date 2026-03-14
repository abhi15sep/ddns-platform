# DDNS Platform - Implementation Plan

## Overview
A self-hosted Dynamic DNS platform (better DuckDNS) with a dashboard, SSO, full DNS control, and a desktop utility for non-developers.

---

## Architecture

```
User Device (cron/desktop app) ──► Node.js API ──► PowerDNS + MySQL
Browser (Dashboard) ──────────────► Node.js API ──► PostgreSQL (users/tokens/logs)
```

## Monorepo Structure

```
ddns-platform/
├── server/          # Node.js + Express + TypeScript backend
├── dashboard/       # React + Vite + TypeScript frontend
├── client-app/      # Electron desktop utility (cross-platform)
├── dns/             # PowerDNS config + SQL schemas
├── db/migrations/   # PostgreSQL migration files
└── docs/            # Setup guides
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| DNS Engine | PowerDNS + MySQL |
| Backend | Node.js + Express + TypeScript |
| Auth | Passport.js (Google, GitHub, Microsoft, Local) |
| App DB | PostgreSQL |
| Frontend | React + Vite + TypeScript + Recharts |
| Desktop App | Electron + Electron Forge |
| Reverse Proxy | Caddy (auto HTTPS) |
| Process Mgr | PM2 |

## Implementation Phases

### Phase 1: Project Scaffolding
- [x] Monorepo structure with npm workspaces
- [x] TypeScript config
- [x] Docker Compose for dev databases
- [x] Environment config with validation

### Phase 2: Database
- [x] PostgreSQL migrations (users, oauth_accounts, domains, update_log)
- [x] PowerDNS MySQL schema + zone init script

### Phase 3: Backend API
- [x] Health endpoint
- [x] DB connection pool
- [x] PowerDNS helper (update/delete DNS records)
- [x] DDNS update endpoint (`GET /update`)
- [x] Auth: local register/login/logout + JWT
- [x] Auth: OAuth SSO (Google, GitHub, Microsoft)
- [x] Domain CRUD API
- [x] Rate limiting

### Phase 4: React Dashboard
- [x] Vite + React + TypeScript scaffold
- [x] Login/Register pages with SSO buttons
- [x] Domain list (create, delete, view)
- [x] Domain detail (history chart, token management, update URL)
- [x] Protected routes

### Phase 5: Desktop Client (Electron)
- [x] Electron Forge scaffold
- [x] System tray with background operation
- [x] IP update scheduler
- [x] Setup wizard (server URL + token)
- [x] Status page (current IP, last update)
- [x] Settings (interval, autostart, notifications)
- [x] Build for Windows, macOS, Linux

### Phase 6: Production Deployment
- [ ] VPS: Install PowerDNS + MySQL + PostgreSQL + Node.js + Caddy
- [ ] Configure DNS zone + registrar delegation
- [ ] Deploy backend with PM2
- [ ] Deploy dashboard via Caddy
- [ ] Firewall (UFW)
- [ ] Automated backups

## Key API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /health | No | Health check |
| GET | /update | Token | DDNS IP update (DuckDNS-compatible) |
| POST | /auth/register | No | Email + password registration |
| POST | /auth/login | No | Email + password login |
| POST | /auth/logout | JWT | Clear session |
| GET | /auth/google | No | Google OAuth redirect |
| GET | /auth/github | No | GitHub OAuth redirect |
| GET | /auth/microsoft | No | Microsoft OAuth redirect |
| GET | /api/domains | JWT | List user's domains |
| POST | /api/domains | JWT | Create subdomain |
| DELETE | /api/domains/:sub | JWT | Delete subdomain |
| POST | /api/domains/:sub/regenerate-token | JWT | New token |
| GET | /api/domains/:sub/history | JWT | Update history |