import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { checkAdmin } from '../api/client';
import { ThemeToggleButton } from '../App';

type Lang = 'curl' | 'python' | 'javascript';

interface Endpoint {
  method: 'GET' | 'POST' | 'DELETE' | 'PUT';
  path: string;
  title: string;
  desc: string;
  auth: 'none' | 'cookie' | 'token';
  params?: { name: string; in: 'query' | 'body' | 'path' | 'header'; required: boolean; desc: string }[];
  response: string;
  examples: Record<Lang, string>;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: 'GET',
    path: '/update',
    title: 'Update DNS Record',
    desc: 'Send your current public IP to update a domain\'s DNS record. This is the main endpoint your cron job or desktop client calls.',
    auth: 'token',
    params: [
      { name: 'domain', in: 'query', required: true, desc: 'Your subdomain (e.g. "myhome")' },
      { name: 'token', in: 'query', required: true, desc: 'Domain-specific update token from dashboard' },
      { name: 'ip', in: 'query', required: false, desc: 'IP address to set. If omitted, your public IP is auto-detected.' },
    ],
    response: `# Success
OK

# Error responses
KO - missing params          (400)
KO - invalid token           (403)
KO - account blocked         (403)
KO - invalid IP              (400)
KO - rate limited (...)      (429)`,
    examples: {
      curl: `# Auto-detect IP (most common)
curl "https://api.devops-monk.com/update?domain=myhome&token=YOUR_TOKEN"

# Set a specific IP
curl "https://api.devops-monk.com/update?domain=myhome&token=YOUR_TOKEN&ip=203.0.113.42"

# IPv6
curl "https://api.devops-monk.com/update?domain=myhome&token=YOUR_TOKEN&ip=2001:db8::1"`,
      python: `import requests

# Auto-detect IP
r = requests.get("https://api.devops-monk.com/update", params={
    "domain": "myhome",
    "token": "YOUR_TOKEN"
})
print(r.text)  # "OK" on success

# Set specific IP
r = requests.get("https://api.devops-monk.com/update", params={
    "domain": "myhome",
    "token": "YOUR_TOKEN",
    "ip": "203.0.113.42"
})`,
      javascript: `// Auto-detect IP
const res = await fetch(
  "https://api.devops-monk.com/update?domain=myhome&token=YOUR_TOKEN"
);
console.log(await res.text()); // "OK"

// Set specific IP
const res2 = await fetch(
  "https://api.devops-monk.com/update?domain=myhome&token=YOUR_TOKEN&ip=203.0.113.42"
);`,
    },
  },
  {
    method: 'GET',
    path: '/health',
    title: 'Health Check',
    desc: 'Check if the DDNS API server is running and the database is reachable.',
    auth: 'none',
    response: `{
  "status": "ok",
  "timestamp": "2026-03-14T12:00:00.000Z"
}`,
    examples: {
      curl: `curl https://api.devops-monk.com/health`,
      python: `import requests
r = requests.get("https://api.devops-monk.com/health")
print(r.json())  # {"status": "ok", "timestamp": "..."}`,
      javascript: `const res = await fetch("https://api.devops-monk.com/health");
const data = await res.json();
console.log(data); // {status: "ok", timestamp: "..."}`,
    },
  },
  {
    method: 'GET',
    path: '/api/domains',
    title: 'List Domains',
    desc: 'Get all domains belonging to the authenticated user.',
    auth: 'cookie',
    response: `[
  {
    "id": "uuid",
    "subdomain": "myhome",
    "current_ip": "203.0.113.42",
    "updated_at": "2026-03-14T12:00:00.000Z",
    "token": "domain-specific-token"
  }
]`,
    examples: {
      curl: `# Using API token (recommended for scripts)
curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
  https://api.devops-monk.com/api/domains

# Using session cookie (browser/session-based)
curl -b cookies.txt https://api.devops-monk.com/api/domains`,
      python: `import requests

# Using API token (recommended)
r = requests.get("https://api.devops-monk.com/api/domains",
    headers={"Authorization": "Bearer YOUR_API_TOKEN"})
print(r.json())

# Using session cookie
session = requests.Session()
session.post("https://api.devops-monk.com/auth/login", json={
    "email": "you@example.com", "password": "your-password"
})
r = session.get("https://api.devops-monk.com/api/domains")`,
      javascript: `// Using API token (recommended for scripts)
const res = await fetch("https://api.devops-monk.com/api/domains", {
  headers: { "Authorization": "Bearer YOUR_API_TOKEN" }
});
const domains = await res.json();

// Using session cookie (browser)
const res2 = await fetch("https://api.devops-monk.com/api/domains", {
  credentials: "include"
});`,
    },
  },
  {
    method: 'POST',
    path: '/api/domains',
    title: 'Create Domain',
    desc: 'Register a new subdomain. Maximum 5 domains per account.',
    auth: 'cookie',
    params: [
      { name: 'subdomain', in: 'body', required: true, desc: 'Subdomain name (3-63 chars, lowercase alphanumeric and hyphens)' },
    ],
    response: `{
  "id": "uuid",
  "subdomain": "myhome",
  "current_ip": null,
  "updated_at": null,
  "token": "generated-update-token"
}`,
    examples: {
      curl: `curl -X POST https://api.devops-monk.com/api/domains \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -d '{"subdomain": "myhome"}'`,
      python: `r = requests.post("https://api.devops-monk.com/api/domains",
    headers={"Authorization": "Bearer YOUR_API_TOKEN"},
    json={"subdomain": "myhome"})
print(r.json())  # New domain with token`,
      javascript: `const res = await fetch("https://api.devops-monk.com/api/domains", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_TOKEN"
  },
  body: JSON.stringify({ subdomain: "myhome" })
});`,
    },
  },
  {
    method: 'DELETE',
    path: '/api/domains/:subdomain',
    title: 'Delete Domain',
    desc: 'Delete a subdomain and its DNS record. This cannot be undone.',
    auth: 'cookie',
    params: [
      { name: 'subdomain', in: 'path', required: true, desc: 'The subdomain to delete' },
    ],
    response: `{ "ok": true }`,
    examples: {
      curl: `curl -X DELETE https://api.devops-monk.com/api/domains/myhome \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
      python: `r = requests.delete("https://api.devops-monk.com/api/domains/myhome",
    headers={"Authorization": "Bearer YOUR_API_TOKEN"})
print(r.json())  # {"ok": true}`,
      javascript: `await fetch("https://api.devops-monk.com/api/domains/myhome", {
  method: "DELETE",
  headers: { "Authorization": "Bearer YOUR_API_TOKEN" }
});`,
    },
  },
  {
    method: 'POST',
    path: '/api/domains/:subdomain/regenerate-token',
    title: 'Regenerate Token',
    desc: 'Generate a new update token for a domain. The old token stops working immediately.',
    auth: 'cookie',
    params: [
      { name: 'subdomain', in: 'path', required: true, desc: 'The subdomain to regenerate token for' },
    ],
    response: `{
  "id": "uuid",
  "subdomain": "myhome",
  "token": "new-generated-token",
  ...
}`,
    examples: {
      curl: `curl -X POST https://api.devops-monk.com/api/domains/myhome/regenerate-token \\
  -H "Authorization: Bearer YOUR_API_TOKEN"`,
      python: `r = requests.post("https://api.devops-monk.com/api/domains/myhome/regenerate-token",
    headers={"Authorization": "Bearer YOUR_API_TOKEN"})
new_token = r.json()["token"]`,
      javascript: `const res = await fetch(
  "https://api.devops-monk.com/api/domains/myhome/regenerate-token",
  { method: "POST", headers: { "Authorization": "Bearer YOUR_API_TOKEN" } }
);
const { token } = await res.json();`,
    },
  },
  {
    method: 'GET',
    path: '/api/domains/:subdomain/history',
    title: 'Update History',
    desc: 'Get the last 3 hours of IP update logs for a domain.',
    auth: 'cookie',
    params: [
      { name: 'subdomain', in: 'path', required: true, desc: 'The subdomain to get history for' },
    ],
    response: `[
  {
    "ip": "203.0.113.42",
    "source_ip": "203.0.113.42",
    "user_agent": "curl/8.0",
    "updated_at": "2026-03-14T12:00:00.000Z"
  }
]`,
    examples: {
      curl: `curl -H "Authorization: Bearer YOUR_API_TOKEN" \\
  https://api.devops-monk.com/api/domains/myhome/history`,
      python: `r = requests.get("https://api.devops-monk.com/api/domains/myhome/history",
    headers={"Authorization": "Bearer YOUR_API_TOKEN"})
for entry in r.json():
    print(f"{entry['updated_at']}: {entry['ip']}")`,
      javascript: `const res = await fetch(
  "https://api.devops-monk.com/api/domains/myhome/history",
  { headers: { "Authorization": "Bearer YOUR_API_TOKEN" } }
);
const history = await res.json();`,
    },
  },
  {
    method: 'POST',
    path: '/auth/login',
    title: 'Login',
    desc: 'Authenticate with email and password. Returns a session cookie.',
    auth: 'none',
    params: [
      { name: 'email', in: 'body', required: true, desc: 'Your email address' },
      { name: 'password', in: 'body', required: true, desc: 'Your password' },
    ],
    response: `{ "ok": true, "user": { "id": "uuid", "email": "you@example.com" } }`,
    examples: {
      curl: `curl -X POST https://api.devops-monk.com/auth/login \\
  -H "Content-Type: application/json" \\
  -c cookies.txt \\
  -d '{"email": "you@example.com", "password": "your-password"}'`,
      python: `session = requests.Session()
r = session.post("https://api.devops-monk.com/auth/login", json={
    "email": "you@example.com",
    "password": "your-password"
})
# Session cookie is stored automatically`,
      javascript: `const res = await fetch("https://api.devops-monk.com/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    email: "you@example.com",
    password: "your-password"
  })
});`,
    },
  },
  {
    method: 'POST',
    path: '/auth/register',
    title: 'Register',
    desc: 'Create a new account with email and password (min 8 characters).',
    auth: 'none',
    params: [
      { name: 'email', in: 'body', required: true, desc: 'Your email address' },
      { name: 'password', in: 'body', required: true, desc: 'Password (minimum 8 characters)' },
    ],
    response: `{ "ok": true, "user": { "id": "uuid", "email": "you@example.com" } }`,
    examples: {
      curl: `curl -X POST https://api.devops-monk.com/auth/register \\
  -H "Content-Type: application/json" \\
  -c cookies.txt \\
  -d '{"email": "you@example.com", "password": "your-password"}'`,
      python: `r = requests.post("https://api.devops-monk.com/auth/register", json={
    "email": "you@example.com",
    "password": "your-password"
})`,
      javascript: `const res = await fetch("https://api.devops-monk.com/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({
    email: "you@example.com",
    password: "your-password"
  })
});`,
    },
  },
];

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn btn-sm btn-secondary"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: '#059669',
    POST: '#d97706',
    DELETE: '#dc2626',
  };
  return (
    <span
      style={{
        background: colors[method] || 'var(--accent)',
        color: 'white',
        padding: '0.15rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 700,
        fontFamily: 'monospace',
        letterSpacing: '0.03em',
      }}
    >
      {method}
    </span>
  );
}

function AuthBadge({ auth }: { auth: string }) {
  if (auth === 'none')
    return <span style={{ fontSize: '0.75rem', color: 'var(--badge-active-text)' }}>Public</span>;
  if (auth === 'token')
    return <span style={{ fontSize: '0.75rem', color: 'var(--badge-stale-text)' }}>Domain Token</span>;
  return <span style={{ fontSize: '0.75rem', color: 'var(--accent-text)' }}>API Token / Cookie</span>;
}

export default function ApiDocsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>('curl');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  useEffect(() => {
    if (user) checkAdmin().then(() => setIsAdmin(true)).catch(() => {});
  }, [user]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const langs: { key: Lang; label: string }[] = [
    { key: 'curl', label: 'cURL' },
    { key: 'python', label: 'Python' },
    { key: 'javascript', label: 'JavaScript' },
  ];

  return (
    <div style={{ background: 'var(--bg-body)', minHeight: '100vh' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to={user ? '/dashboard' : '/'} className="navbar-brand">
            <span className="navbar-brand-icon">D</span>
            DDNS
          </Link>
          <div className="navbar-links">
            {user && (
              <Link to="/dashboard" className="navbar-link">
                Dashboard
              </Link>
            )}
            <Link to="/how-it-works" className="navbar-link">
              How It Works
            </Link>
            <Link to="/downloads" className="navbar-link">
              Downloads
            </Link>
            <Link to="/api-docs" className="navbar-link active">
              API
            </Link>
            {isAdmin && (
              <Link to="/admin" className="navbar-link">
                Admin
              </Link>
            )}
          </div>
          <div className="navbar-right">
            <ThemeToggleButton />
            {user ? (
              <>
                <Link to="/profile" className="navbar-email" style={{ cursor: 'pointer', color: 'var(--accent-text)' }}>
                  {user.email}
                </Link>
                <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary btn-sm">Sign In</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header style={{ textAlign: 'center', padding: '3rem 1rem 2rem', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: 'white' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 800, color: 'white' }}>API Reference</h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto' }}>
          Everything you need to integrate with the DDNS API programmatically
        </p>
      </header>

      <div className="container">
        {/* Quick info */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="info-card">
            <h3>Base URL</h3>
            <div className="info-value" style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>
              https://api.devops-monk.com
            </div>
          </div>
          <div className="info-card">
            <h3>Authentication</h3>
            <div className="info-value" style={{ fontSize: '0.85rem', fontWeight: 400 }}>
              API token, session cookie, or domain token
            </div>
          </div>
          <div className="info-card">
            <h3>Rate Limits</h3>
            <div className="info-value" style={{ fontSize: '0.85rem', fontWeight: 400 }}>
              20 req/min global, 6 updates/min per domain
            </div>
          </div>
          <div className="info-card">
            <h3>Response Format</h3>
            <div className="info-value" style={{ fontSize: '0.85rem', fontWeight: 400 }}>
              JSON (except /update which returns text)
            </div>
          </div>
        </div>

        {/* Auth explanation */}
        <section style={{ marginBottom: '2rem' }}>
          <div className="section-label">Authentication</div>
          <div className="info-card" style={{ lineHeight: 1.7 }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              The API supports three authentication methods:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ background: 'var(--badge-stale-bg)', color: 'var(--badge-stale-text)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', marginTop: '0.15rem' }}>Domain Token</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Used for the <code style={{ background: 'var(--bg-secondary)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.8rem' }}>/update</code> endpoint only. Pass your domain-specific token as a query parameter. Each domain has its own token — find it in your dashboard.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ background: 'var(--accent-bg)', color: 'var(--accent-text)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', marginTop: '0.15rem' }}>API Token</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <strong>Recommended for scripts and programmatic access.</strong> Get your personal API token from your <a href="/profile" style={{ color: 'var(--accent-text)' }}>Profile page</a>. Send it as an <code style={{ background: 'var(--bg-secondary)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.8rem' }}>Authorization: Bearer &lt;YOUR_API_TOKEN&gt;</code> header. Works with all authenticated endpoints.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', marginTop: '0.15rem' }}>Session Cookie</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Used by the web dashboard internally. Login via <code style={{ background: 'var(--bg-secondary)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.8rem' }}>/auth/login</code> to receive an httpOnly cookie (valid for 7 days). The cookie is set automatically and sent with every browser request — you don't need to manage it manually. For scripts, use the API token instead.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Language selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="section-label" style={{ marginBottom: 0 }}>Endpoints</div>
          <div className="dl-tabs" style={{ marginBottom: 0 }}>
            {langs.map((l) => (
              <button
                key={l.key}
                className={`dl-tab ${activeLang === l.key ? 'dl-tab-active' : ''}`}
                onClick={() => setActiveLang(l.key)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Endpoints */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
          {ENDPOINTS.map((ep, idx) => {
            const isOpen = expandedIdx === idx;
            return (
              <div
                key={idx}
                className="info-card"
                style={{ padding: 0, overflow: 'hidden' }}
              >
                {/* Header - clickable */}
                <button
                  onClick={() => setExpandedIdx(isOpen ? null : idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '1rem 1.25rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                >
                  <MethodBadge method={ep.method} />
                  <code style={{ fontSize: '0.85rem', color: 'var(--text-heading)', fontWeight: 600 }}>{ep.path}</code>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AuthBadge auth={ep.auth} />
                    <svg
                      width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--border-light)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-heading)', margin: '1rem 0 0.35rem' }}>{ep.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>{ep.desc}</p>

                    {/* Parameters */}
                    {ep.params && ep.params.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>Parameters</div>
                        <table className="domain-table" style={{ fontSize: '0.82rem' }}>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>In</th>
                              <th>Required</th>
                              <th>Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ep.params.map((p) => (
                              <tr key={p.name}>
                                <td><code style={{ background: 'var(--bg-secondary)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>{p.name}</code></td>
                                <td>{p.in}</td>
                                <td>{p.required ? 'Yes' : 'No'}</td>
                                <td>{p.desc}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Response */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>Response</div>
                      <div className="code-block" style={{ fontSize: '0.78rem' }}>
                        <pre>{ep.response}</pre>
                      </div>
                    </div>

                    {/* Code example */}
                    <div>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>Example</div>
                      <div className="code-block" style={{ fontSize: '0.78rem' }}>
                        <pre>{ep.examples[activeLang]}</pre>
                        <CopyBtn text={ep.examples[activeLang]} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Rate Limits */}
        <section style={{ marginBottom: '2rem' }}>
          <div className="section-label">Rate Limits</div>
          <div className="info-card">
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              All API endpoints are rate limited to prevent abuse. Exceeding any limit returns a <code style={{ background: 'var(--bg-secondary)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.8rem' }}>429</code> status.
            </p>
            <table className="domain-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Scope</th>
                  <th>Limit</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Global (per IP)</strong></td>
                  <td>20 requests / 60s</td>
                  <td>Applies to all endpoints across the entire API per IP address</td>
                </tr>
                <tr>
                  <td><strong>Auth endpoints</strong></td>
                  <td>5 requests / 60s</td>
                  <td>Login, register, password reset — stricter limit per IP</td>
                </tr>
                <tr>
                  <td><strong>Per domain (update)</strong></td>
                  <td>6 requests / 60s</td>
                  <td>Each subdomain can be updated up to 6 times per minute</td>
                </tr>
                <tr>
                  <td><strong>Per account (update)</strong></td>
                  <td>15 requests / 60s</td>
                  <td>Total updates across all your domains per minute</td>
                </tr>
              </tbody>
            </table>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
              A 5-minute update interval is recommended for DNS updates. Rate limit headers (<code style={{ background: 'var(--bg-secondary)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.75rem' }}>RateLimit-Limit</code>, <code style={{ background: 'var(--bg-secondary)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.75rem' }}>RateLimit-Remaining</code>, <code style={{ background: 'var(--bg-secondary)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.75rem' }}>RateLimit-Reset</code>) are included in every response.
            </p>
          </div>
        </section>

        {/* Errors */}
        <section style={{ marginBottom: '2rem' }}>
          <div className="section-label">Error Codes</div>
          <div className="info-card">
            <table className="domain-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['200', 'Success'],
                  ['400', 'Bad request — missing or invalid parameters'],
                  ['401', 'Not authenticated — login required'],
                  ['403', 'Forbidden — invalid token or account blocked'],
                  ['404', 'Resource not found'],
                  ['409', 'Conflict — subdomain already taken or email already registered'],
                  ['429', 'Rate limited — too many requests'],
                  ['500', 'Server error'],
                  ['503', 'Service unavailable — database unreachable'],
                ].map(([code, desc]) => (
                  <tr key={code}>
                    <td><code style={{ background: 'var(--bg-secondary)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>{code}</code></td>
                    <td>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer CTA */}
        <section style={{ textAlign: 'center', padding: '2rem 0 3rem' }}>
          {user ? (
            <>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>Ready to integrate?</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>Get your domain token from the dashboard and start making API calls.</p>
              <Link to="/dashboard" className="btn btn-primary btn-lg">Go to Dashboard</Link>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>Get started for free</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>Create an account, register a subdomain, and start updating your DNS in minutes.</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <Link to="/register" className="btn btn-primary btn-lg">Create Account</Link>
                <Link to="/login" className="btn btn-secondary btn-lg">Sign In</Link>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
