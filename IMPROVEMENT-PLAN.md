# DDNS Platform — Improvement Plan

## Competitor Analysis

### DuckDNS (duckdns.org)
**What they do well:**
- Completely free, no limits
- Simple — one page does everything
- Multiple OAuth providers (Google, GitHub, Reddit, Twitter)
- Install guides for every OS/platform (Linux cron, Windows, macOS, pfSense, DD-WRT, Docker, etc.)
- DuckDNS-compatible API used by many routers natively

**Drawbacks we can beat:**
- Ugly, outdated UI — looks like it was built in 2010
- No dashboard — just a flat list on the homepage
- No IP history or audit log
- No charts or analytics
- No desktop client — relies on cron scripts
- No onboarding wizard — just dumps you into a list
- No documentation on the site itself (just install scripts)
- No mobile-friendly design
- No dark mode
- Limited to 5 subdomains
- Single domain (duckdns.org) — no custom domains
- No notification when IP changes

### No-IP (noip.com)
**What they do well:**
- Professional, modern UI with clear CTAs
- Tiered pricing with free tier
- Desktop Update Client (DUC) for Windows, macOS, Linux
- Good documentation and knowledge base
- Landing page explains the value proposition clearly
- Status page for service health
- API documentation

**Drawbacks we can beat:**
- Free tier requires manual confirmation every 30 days (annoying)
- Limited to 3 hostnames on free tier
- Pushes paid plans aggressively
- Desktop client is closed-source
- No self-hosting option
- Complex UI with too many upsell screens
- No open-source community

### Dyn (dyn.com / Oracle)
**What they do well:**
- Enterprise-grade reliability
- Good API
- Was the original DDNS pioneer

**Drawbacks we can beat:**
- No longer offers free dynamic DNS
- Acquired by Oracle — feels corporate
- Expensive for personal use
- No transparency

---

## Our Competitive Advantages

| Feature | DuckDNS | No-IP | Dyn | **DevOps Monk DDNS** |
|---------|---------|-------|-----|---------------------|
| Free | Yes (5 domains) | Yes (3, confirm monthly) | No | **Yes (5 domains)** |
| Open Source | No | No | No | **Yes** |
| Self-Hosted | No | No | No | **Yes** |
| Modern Dashboard | No | Yes | N/A | **Yes** |
| IP History/Charts | No | Paid only | Paid | **Yes (free)** |
| Desktop Client | No | Yes (closed) | No | **Yes (open source)** |
| No Monthly Confirmation | N/A | No | N/A | **Yes** |
| Custom Zone | No | Paid | Paid | **Yes** |
| Dark Mode | No | No | No | **Yes** |
| IPv6 Support | Yes | Paid | Yes | **Yes (free)** |
| Audit Log | No | Paid | Paid | **Yes (free)** |

---

## Phase 1: Dashboard UI Overhaul (Priority: HIGH)

### 1.1 Landing Page (Public — before login)
Currently missing. Users land directly on login page with no context.

**Add a public landing page at `/` with:**
- Hero section with tagline: "Keep Your Home Online. Forever. Free."
- Animated demo showing IP update flow
- Feature cards (6 key features with icons)
- "How It Works" section (3 steps: Sign up → Create domain → Install client)
- Comparison table vs DuckDNS/No-IP
- "Get Started Free" CTA button
- Footer with links to docs, GitHub, API reference

### 1.2 Dashboard Redesign
**Current state:** Basic table with minimal styling, no visual hierarchy.

**Improvements:**
- Sidebar navigation (Dashboard, Domains, Downloads, API Docs, Settings)
- Top stats bar: Total domains, Current IP, Last update time, Service status
- Domain cards instead of plain table rows (show IP, status indicator, last update, quick actions)
- Status badges (green = updated recently, yellow = stale > 1 hour, red = never updated)
- Quick copy buttons on every domain card
- Toast notifications instead of inline errors
- Loading skeletons during data fetch
- Empty state with illustration and "Create your first domain" CTA
- Mobile-responsive hamburger menu

### 1.3 Domain Detail Page
**Current state:** Basic info grid + chart + table.

**Improvements:**
- Tabbed interface: Overview | History | Settings | Setup Guide
- Overview tab: Large IP display, uptime indicator, last 24h mini-chart
- History tab: Filterable/searchable table with date range picker, export CSV
- Settings tab: Update interval preference, notification webhook URL, delete domain
- Setup Guide tab: Platform-specific install instructions (like DuckDNS install page)
  - Linux (cron + curl)
  - Windows (desktop app + PowerShell)
  - macOS (desktop app + launchd)
  - Docker
  - Router (DD-WRT, OpenWRT, pfSense, Ubiquiti)
  - Synology NAS
  - Raspberry Pi
- Code blocks with one-click copy for each platform
- "Test your setup" button that shows real-time if updates are arriving

### 1.4 Authentication Pages
**Current state:** Minimal centered card.

**Improvements:**
- Split layout: left side = branding/feature highlights, right side = login form
- Animated background or gradient
- "Trusted by X users" social proof
- Password strength indicator on register
- "Forgot password" link (implement password reset flow)
- Terms of service and privacy policy links

### 1.5 User Profile / Settings Page
**Currently missing.**

**Add:**
- Change password
- Connected OAuth accounts (link/unlink Google, GitHub)
- API key management (global API key for programmatic access)
- Email notification preferences
- Delete account
- Export all data (GDPR compliance)

---

## Phase 2: Downloads & Desktop Client Page (Priority: HIGH)

### 2.1 Downloads Page on Dashboard (`/downloads`)
**Add a dedicated downloads page with:**
- Platform detection (auto-highlight the right download)
- Download buttons for each OS:
  - Windows (.exe) — NSIS installer
  - macOS (.dmg) — drag to Applications
  - Linux (.deb) — Debian/Ubuntu
  - Linux (.AppImage) — Universal
- File size and version number shown
- SHA256 checksums for security
- System requirements listed
- Link to GitHub/GitLab releases page
- Screenshot/GIF showing the desktop app in action

### 2.2 Quick Setup Instructions on Downloads Page
For each platform, show:
```
1. Download the installer
2. Install and launch
3. Enter server URL: https://ddns.devops-monk.com
4. Paste your subdomain and token from the dashboard
5. Done — your IP stays updated automatically
```

### 2.3 Alternative: Script-Based Updates (No App Required)
Show one-liner scripts for users who prefer terminal:

**Linux/macOS (cron):**
```bash
*/5 * * * * curl -s "https://ddns.devops-monk.com/update?domain=SUBDOMAIN&token=TOKEN&ip=auto"
```

**Windows (Task Scheduler + PowerShell):**
```powershell
Invoke-WebRequest "https://ddns.devops-monk.com/update?domain=SUBDOMAIN&token=TOKEN&ip=auto"
```

**Docker:**
```yaml
services:
  ddns-updater:
    image: curlimages/curl
    command: sh -c 'while true; do curl -s "https://ddns.devops-monk.com/update?domain=SUBDOMAIN&token=TOKEN&ip=auto"; sleep 300; done'
```

### 2.4 Desktop Client README
Create comprehensive README at `client-app/README.md` (see separate file).

---

## Phase 3: Enhanced Features (Priority: MEDIUM)

### 3.1 API Documentation Page (`/docs` or `/api-docs`)
- Interactive API explorer (like Swagger UI)
- Code examples in curl, Python, JavaScript, Go
- Authentication docs
- Rate limit info
- Webhook setup

### 3.2 Public Status Page (`/status`)
- Service health indicators
- DNS resolution check
- API response time
- Uptime percentage (last 7/30/90 days)
- Incident history

### 3.3 Notification System
- Email alerts when IP changes
- Webhook notifications (Discord, Slack, custom URL)
- In-app notification center
- Configurable per domain

### 3.4 Dark Mode
- System preference detection
- Manual toggle in settings
- CSS custom properties for theme switching

### 3.5 Multi-Language Support
- i18n framework (react-i18next)
- Start with English, Hindi
- Community-contributed translations

---

## Phase 4: Advanced Features (Priority: LOW)

### 4.1 Admin Dashboard (for you as platform owner)
- Total users, domains, updates/day
- Usage graphs
- User management
- System health monitoring
- Abuse detection

### 4.2 Custom Domain Support
- Users bring their own domain
- CNAME verification flow
- Instructions for NS delegation

### 4.3 DNS Record Types
- Beyond A/AAAA: MX, TXT, CNAME, SRV
- Full DNS management for power users

### 4.4 Teams & Sharing
- Share domain management with team members
- Role-based access (viewer, editor, admin)

### 4.5 Two-Factor Authentication (2FA)
- TOTP (Google Authenticator / Authy)
- Backup codes

---

## Technical Improvements

### Styling
- Replace global.css with CSS modules or Tailwind CSS
- Design system with consistent spacing, colors, typography
- Component library (consider shadcn/ui or Radix UI)

### Performance
- React Query for data fetching (caching, background refetch)
- Lazy loading for routes
- Service worker for offline dashboard access

### Testing
- Unit tests with Vitest
- E2E tests with Playwright
- API integration tests

### CI/CD
- GitHub Actions for:
  - Lint + type check on PR
  - Build dashboard + server
  - Build Electron app for all platforms
  - Auto-release with version tags
  - Deploy to VPS on merge to main

---

## Implementation Order & Status

| Priority | Task | Effort | Status |
|----------|------|--------|--------|
| 1 | Landing page (hero, features, comparison, use cases, footer) | 1 day | **DONE** |
| 2 | Dashboard UI overhaul (cards, stats bar, nav, status badges, toasts) | 2 days | **DONE** |
| 3 | Downloads page with install instructions (6 platform tabs) | 1 day | **DONE** |
| 4 | Desktop client README + build binaries | 1 day | **DONE** |
| 5 | Setup guide tabs on domain detail page | 1 day | **DONE** |
| 6 | Domain detail tabbed interface (Update URL, IP History, Setup) | 1 day | **DONE** |
| 7 | Toast notifications + loading states | 0.5 day | **DONE** |
| 8 | Dark mode (system detection + manual toggle) | 0.5 day | **DONE** |
| 9 | User profile/settings page (password, API token, delete account) | 1 day | **DONE** |
| 10 | Admin dashboard (users, activity, rate limit settings, block/unblock) | 2 days | **DONE** |
| 11 | Build Electron binaries (macOS x64/arm64, Windows, Linux deb/AppImage) | 1 day | **DONE** |
| 12 | Live connectivity diagram (dashboard + desktop client) | 0.5 day | **DONE** |
| 13 | Configurable rate limits via admin console (per-token, per-account) | 0.5 day | **DONE** |
| 14 | API docs page (interactive explorer) | 1 day | **DONE** |
| 15 | Status page (public service health) | 0.5 day | **DONE** |
| 16 | Webhook notifications on IP change | 1 day | **DONE** |
| 17 | Password reset flow | 0.5 day | **DONE** |
| 18 | 2FA/TOTP support | 1 day | **DONE** |

### What Was Completed

**Phase 1 — Dashboard UI Overhaul:**
- `dashboard/src/pages/LandingPage.tsx` — New public landing page with animated terminal demo, feature cards, competitor comparison table, use cases, gradient hero, sticky nav, footer
- `dashboard/src/pages/DownloadsPage.tsx` — Downloads page with 4 platform cards, quick setup guide, 6-tab script-based update snippets (Linux, Windows, Docker, Synology, Router, Raspberry Pi), router compatibility list
- `dashboard/src/pages/DomainList.tsx` — Rewritten dashboard with stats bar, domain cards (replacing table), status badges (Active/Stale/Never), toast notifications, improved create flow with live preview, empty state
- `dashboard/src/pages/DomainDetail.tsx` — Rewritten with tabbed interface (Update URL / IP History / Setup Guide), improved info cards, code blocks with copy buttons, setup guides for 4 platforms
- `dashboard/src/App.tsx` — Added LandingPage, DownloadsPage routes, PublicOnlyRoute wrapper
- `dashboard/src/styles/global.css` — Major expansion with navbar, stats bar, domain cards, badges, toasts, tabs, setup grid, loading spinner, responsive breakpoints
- `client-app/README.md` — Comprehensive desktop client documentation with install instructions for 8 platforms

**Phase 3 — Enhanced Features:**
- `dashboard/src/pages/ApiDocsPage.tsx` — Interactive API reference with 9 endpoints, expandable accordion UI, language tabs (cURL/Python/JavaScript), auth explanation, rate limits table, error codes
- `dashboard/src/pages/StatusPage.tsx` — Live health checks for API Server, Database, DNS Resolution; auto-refreshes every 60s; overall status banner with troubleshooting hints
- `server/src/routes/update.ts` — Webhook trigger on IP change with Discord/Slack/custom JSON format support, 10s timeout
- `server/src/routes/domains.ts` — PUT /:subdomain/webhook endpoint for managing webhook URLs with validation
- `dashboard/src/pages/DomainDetail.tsx` — Notifications tab with webhook URL configuration, save/remove, supported format docs
- `db/migrations/007_add_webhook_to_domains.sql` — Added webhook_url column to domains table

**Password Reset Flow:**
- `db/migrations/008_create_password_reset_tokens.sql` — Token table with SHA-256 hashed tokens, expiry, single-use
- `server/src/email.ts` — Nodemailer SMTP transport with HTML reset email template
- `server/src/routes/auth.ts` — POST /auth/forgot-password (rate limited, no email enumeration) and POST /auth/reset-password (token validation)
- `dashboard/src/pages/ForgotPasswordPage.tsx` — Email input form with success confirmation UI
- `dashboard/src/pages/ResetPasswordPage.tsx` — New password form with token validation, error states
- `dashboard/src/pages/LoginPage.tsx` — Added "Forgot your password?" link

**2FA/TOTP Support:**
- `db/migrations/009_create_totp_secrets.sql` — TOTP secrets table with backup codes
- `server/src/routes/auth.ts` — 2FA setup, verify, disable endpoints; modified login + OAuth flow for 2FA challenge
- `dashboard/src/pages/LoginPage.tsx` — 2FA challenge screen with 6-digit code input and backup code support
- `dashboard/src/pages/ProfilePage.tsx` — 2FA section: enable with QR code, verify, view backup codes, disable with password

### Recent Additions (Post Phase 4)

**Global API Rate Limiting + API Token Auth:**
- `server/src/app.ts` — Global rate limiter (20 req/min per IP, admin-configurable, 30s cache from DB)
- `server/src/middleware/requireAuth.ts` — Added `Authorization: Bearer <api_token>` support alongside session cookies
- `server/src/routes/admin.ts` — Admin settings now include `global_api_rate_limit`
- `dashboard/src/pages/AdminPage.tsx` — Global API Rate Limit card in Settings tab
- `dashboard/src/pages/ApiDocsPage.tsx` — Updated with 3 auth methods, API token examples, global rate limit docs
- `db/migrations/010_add_api_token_to_users.sql` — Personal API token column

### All Phase 1–4 Items Complete
All 18 original planned improvements have been implemented and deployed.

---

## Phase 5: Next Improvements (Priority: HIGH → LOW)

### 5.1 Email Notifications on IP Change (HIGH) — DONE
SMTP is already configured (Gmail). Added email as a notification channel alongside webhooks.
- `db/migrations/011_add_notify_email_to_domains.sql` — `notify_email` boolean column
- `server/src/email.ts` — `sendIPChangeEmail()` with HTML template showing old/new IP, timestamp, manage link
- `server/src/routes/update.ts` — Fires email on IP change when `notify_email` is enabled and SMTP is configured
- `server/src/routes/domains.ts` — `PUT /:subdomain/notify-email` toggle endpoint
- `dashboard/src/pages/DomainDetail.tsx` — Toggle switch on Notifications tab with active indicator

### 5.2 Onboarding Wizard (HIGH) — DONE
Guide new users through setup after registration.
- `dashboard/src/pages/OnboardingPage.tsx` — 4-step wizard with progress bar
  - Step 1: Create domain with live preview
  - Step 2: Copy token and update URL
  - Step 3: Platform-specific setup scripts (Linux, macOS, Windows, Docker) with copy buttons
  - Step 4: Completion screen with next steps links
- `dashboard/src/pages/RegisterPage.tsx` — Redirects to `/onboarding` after registration
- `dashboard/src/App.tsx` — Added `/onboarding` protected route
- Skippable at any time, stores `onboarding_complete` in localStorage

### 5.3 Extended IP History + Charts (HIGH) — DONE
Extended from 3 hours to 30 days with configurable range and export.
- `server/src/routes/update.ts` — Retention extended from 3h to 30 days
- `server/src/routes/domains.ts` — History endpoint accepts `range` param (3h/24h/7d/30d) with per-range limits (500-2000)
- `dashboard/src/pages/DomainDetail.tsx` — Date range picker tabs, CSV export button, adaptive chart XAxis (time vs date), dynamic empty state
- `dashboard/src/api/client.ts` — `getDomainHistory` accepts range parameter

### 5.4 Lazy Loading / Code Splitting (HIGH)
JS bundle is ~800KB. Split it up.
- `React.lazy()` + `Suspense` for all page routes
- Separate chunks: landing, auth, dashboard, admin, api-docs
- Landing page visitors won't download admin/dashboard code
- Add loading spinner fallback per route

### 5.5 Automated Database Backups (HIGH)
Protect all user data with automated backups.
- Cron job: `pg_dump` daily at 3am → compressed `.sql.gz`
- Keep last 7 daily + 4 weekly backups (rotate old ones)
- Optional: upload to S3/Cloudflare R2 for offsite backup
- Alert via email/webhook if backup fails

### 5.6 CI/CD with GitHub Actions (MEDIUM) — DONE
Automated pipeline replaces manual SSH deploy.
- `.github/workflows/ci.yml` — Typecheck + build server and dashboard on every push/PR to main
- `.github/workflows/deploy.yml` — Auto-deploy to VPS via SSH after typecheck passes (push to main only)
  - Uses `appleboy/ssh-action` with concurrency lock (cancels in-progress deploys)
  - Runs: `git pull` → `npm ci` → `npm run build` → `vite build` → `pm2 restart`
- Requires 3 GitHub secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`

### 5.7 Data Export / GDPR Compliance (MEDIUM)
Let users export all their data from the profile page.
- Export as JSON: user profile, domains, update history, webhook configs
- Export as CSV: IP history per domain
- "Download my data" button on Profile page
- Useful for compliance and user trust

### 5.8 Session Management (MEDIUM)
Show and manage active login sessions.
- Track sessions in DB: device, IP, browser, last active, created_at
- "Active Sessions" section on Profile page
- "Logout all other devices" button
- "Logout" individual sessions
- Show "Current session" badge

### 5.9 IPv6 Per-Domain Toggle (MEDIUM)
Let users choose record type per domain.
- Options: A (IPv4 only), AAAA (IPv6 only), Both
- Add `record_type` column to domains table (default: 'A')
- Update `/update` endpoint to create appropriate DNS records
- Show record type badge on domain cards

### 5.10 Uptime Monitoring (LOW)
External monitoring for the platform itself.
- UptimeRobot or similar free service pinging `/health` every 5 min
- Public status badge on landing page
- Alert admin via email/Telegram if service goes down
- Historical uptime percentage display on Status page

### 5.11 PM2 Log Rotation (LOW)
Prevent disk fill from growing logs.
- `pm2 install pm2-logrotate`
- Configure: max 10MB per file, keep 10 rotated files
- 15-minute setup, prevents future disk issues

### 5.12 Domain Sharing / Teams (LOW)
Allow collaboration on domains.
- Invite users by email to manage specific domains
- Roles: viewer (read-only), editor (can update), admin (full control)
- `domain_shares` table: domain_id, user_id, role
- Shared domains appear in collaborator's dashboard with a "Shared" badge

### 5.13 Multi-Language Support (LOW)
i18n for broader audience.
- `react-i18next` framework
- Start with English + Hindi
- Language selector in navbar
- Community-contributed translations via JSON files

---

## Phase 5 Implementation Order

| Priority | Task | Effort | Status |
|----------|------|--------|--------|
| 19 | Email notifications on IP change | 0.5 day | **DONE** |
| 20 | Onboarding wizard for new users | 0.5 day | **DONE** |
| 21 | Extended IP history (30d) + charts + CSV export | 1 day | **DONE** |
| 22 | Lazy loading / code splitting (React.lazy) | 0.5 day | TODO |
| 23 | Automated database backups (cron + pg_dump) | 0.5 day | TODO |
| 24 | CI/CD with GitHub Actions (lint, build, deploy) | 1 day | **DONE** |
| 25 | Data export / GDPR compliance | 0.5 day | TODO |
| 26 | Session management (active sessions, logout all) | 1 day | TODO |
| 27 | IPv6 per-domain toggle (A/AAAA/Both) | 0.5 day | TODO |
| 28 | Uptime monitoring (external + status badge) | 0.5 day | TODO |
| 29 | PM2 log rotation | 15 min | TODO |
| 30 | Domain sharing / teams | 1.5 days | TODO |
| 31 | Multi-language support (i18n) | 1 day | TODO |

---

## Design Inspiration

The goal: **Look as professional as No-IP, be as simple as DuckDNS, but better than both.**

- Clean, modern UI with generous whitespace
- Indigo/blue primary color (already in use)
- Card-based layouts with subtle shadows
- Smooth transitions and micro-animations
- Mobile-first responsive design
- Clear typography hierarchy
- Consistent iconography (Lucide icons)
- One-click copy everywhere
- Contextual help tooltips
