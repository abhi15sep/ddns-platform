# Dashboard Component

The web frontend built with React, Vite, and TypeScript. Provides a full management UI for DDNS domains.

## Directory Structure

```
dashboard/
├── index.html               # HTML entry point
├── vite.config.ts            # Vite config with API proxy for dev
├── tsconfig.json
├── package.json
└── src/
    ├── main.tsx              # React entry, BrowserRouter setup
    ├── App.tsx               # Route definitions + ProtectedRoute component
    ├── api/
    │   └── client.ts         # Axios API client (all backend calls)
    ├── hooks/
    │   └── useAuth.ts        # Auth state hook (user, loading, logout)
    ├── pages/
    │   ├── LoginPage.tsx     # SSO buttons + email/password form
    │   ├── RegisterPage.tsx  # Account creation form
    │   ├── DomainList.tsx    # Main dashboard: domain table + create form
    │   └── DomainDetail.tsx  # Domain details: IP history chart, token, update URL
    └── styles/
        └── global.css        # Application styles
```

## Pages

### LoginPage
- SSO buttons for Google and GitHub OAuth (links to `/auth/google`, `/auth/github`)
- Email + password login form
- Error display for failed attempts
- Link to registration page

### RegisterPage
- Email + password form with 8-char minimum
- Auto-redirects to dashboard on success
- Link back to login

### DomainList (Main Dashboard)
- Header with user email and logout button
- "Add Domain" section: input for subdomain + `.dyn.devops-monk.com` suffix
- Domain table columns: Domain (linked), Current IP, Last Updated, Actions (Delete)
- Empty state when no domains exist
- Confirmation dialog before deletion

### DomainDetail
- Back link to domain list
- Info cards grid: Current IP, Last Updated, Token (masked with show/hide toggle)
- **Update URL section**: Copyable URL, cURL example, cron job example
- **Regenerate Token** button with confirmation
- **IP History Chart**: Recharts LineChart showing IP changes over time
- **History Table**: IP, source IP, client user-agent, timestamp

## API Client (`api/client.ts`)

All API calls are centralized in this file using Axios with `withCredentials: true` (sends cookies).

| Function | Method | Endpoint |
|----------|--------|----------|
| `login(email, password)` | POST | `/auth/login` |
| `register(email, password)` | POST | `/auth/register` |
| `logout()` | POST | `/auth/logout` |
| `getMe()` | GET | `/auth/me` |
| `getDomains()` | GET | `/api/domains` |
| `createDomain(subdomain)` | POST | `/api/domains` |
| `deleteDomain(subdomain)` | DELETE | `/api/domains/:sub` |
| `regenerateToken(subdomain)` | POST | `/api/domains/:sub/regenerate-token` |
| `getDomainHistory(subdomain)` | GET | `/api/domains/:sub/history` |

## Auth Flow

1. User lands on `/login` or is redirected there by `ProtectedRoute`
2. SSO: Clicks provider button → redirected to `/auth/{provider}` → OAuth flow → cookie set → redirect to `/dashboard`
3. Local: Submits email/password → `POST /auth/login` → cookie set → navigate to `/dashboard`
4. `useAuth` hook checks `GET /auth/me` on mount to verify session
5. `ProtectedRoute` wraps dashboard pages — redirects to `/login` if no valid session

## Development Proxy

In `vite.config.ts`, the Vite dev server proxies API requests to the backend:

```
/api/*    → http://localhost:3000
/auth/*   → http://localhost:3000
/update/* → http://localhost:3000
/health/* → http://localhost:3000
```

This avoids CORS issues during development.

## Building for Production

```bash
cd dashboard
npm install
npm run build
```

Output goes to `dashboard/dist/`. Serve with Caddy or any static file server. Configure `try_files {path} /index.html` for SPA routing.

## Customization

- **Branding**: Update `<title>` in `index.html` and headings in components
- **Domain suffix**: Replace `.dyn.devops-monk.com` in `DomainList.tsx` and `DomainDetail.tsx`
- **Colors**: Edit CSS variables in `styles/global.css` (primary: `#4f46e5`)
- **Additional SSO**: Add new `<a href="/auth/{provider}">` buttons in `LoginPage.tsx`
