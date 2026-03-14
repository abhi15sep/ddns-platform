import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggleButton } from '../App';

type TabKey = 'linux' | 'windows' | 'docker' | 'synology' | 'router' | 'rpi';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'linux', label: 'Linux / macOS' },
  { key: 'windows', label: 'Windows' },
  { key: 'docker', label: 'Docker' },
  { key: 'synology', label: 'Synology NAS' },
  { key: 'router', label: 'DD-WRT / OpenWRT' },
  { key: 'rpi', label: 'Raspberry Pi' },
];

const SNIPPETS: Record<TabKey, string> = {
  linux: `# Add a cron job to update every 5 minutes
crontab -e

# Paste this line:
*/5 * * * * curl -s "https://api.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN" > /dev/null`,
  windows: `# Run in PowerShell as Administrator
# Create a scheduled task that runs every 5 minutes

$action = New-ScheduledTaskAction -Execute "powershell.exe" \`
  -Argument '-Command "Invoke-WebRequest -Uri \\"https://api.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN\\" -UseBasicParsing"'
$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 5) -Once -At (Get-Date)
Register-ScheduledTask -TaskName "DDNS-Update" -Action $action -Trigger $trigger -Description "Update DDNS IP"`,
  docker: `# docker-compose.yml
version: "3"
services:
  ddns-updater:
    image: curlimages/curl:latest
    restart: unless-stopped
    entrypoint: /bin/sh
    command: >
      -c "while true; do
        curl -s 'https://api.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN';
        sleep 300;
      done"`,
  synology: `# Synology DSM > Control Panel > External Access > DDNS
# Provider: Custom
# Query URL:
https://api.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN

# Hostname: SUBDOMAIN.dyn.devops-monk.com
# Username/Password: leave blank (token is in the URL)`,
  router: `# DD-WRT: Services > DDNS
# DDNS Service: Custom
# DYNDNS Server: ddns.devops-monk.com
# URL: /update?domain=SUBDOMAIN&token=YOUR_TOKEN

# OpenWRT: /etc/config/ddns
config service 'ddns'
  option enabled '1'
  option service_name 'custom'
  option domain 'SUBDOMAIN'
  option update_url 'https://api.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN'
  option check_interval '5'
  option check_unit 'minutes'`,
  rpi: `# Raspberry Pi — works with any Linux method
# Option 1: cron (recommended)
crontab -e
*/5 * * * * curl -s "https://api.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN" > /dev/null

# Option 2: systemd timer
sudo tee /etc/systemd/system/ddns-update.service << 'EOF'
[Unit]
Description=DDNS IP Update

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -s "https://api.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN"
EOF

sudo tee /etc/systemd/system/ddns-update.timer << 'EOF'
[Unit]
Description=Run DDNS update every 5 minutes

[Timer]
OnBootSec=1min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
EOF

sudo systemctl enable --now ddns-update.timer`,
};

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="dl-code-block">
      <pre>{code}</pre>
      <button onClick={handleCopy} className="btn btn-sm btn-primary dl-copy-btn">
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

export default function DownloadsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('linux');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const platforms = [
    {
      icon: '🍎',
      title: 'macOS (Apple Silicon)',
      file: 'DDNS Client-1.0.0-arm64.dmg',
      href: '/downloads/DDNS Client-1.0.0-arm64.dmg',
      req: 'macOS 10.13+ (M1/M2/M3)',
      badge: '.dmg',
    },
    {
      icon: '🍎',
      title: 'macOS (Intel)',
      file: 'DDNS Client-1.0.0.dmg',
      href: '/downloads/DDNS Client-1.0.0.dmg',
      req: 'macOS 10.13+ (Intel x64)',
      badge: '.dmg',
    },
    {
      icon: '🪟',
      title: 'Windows',
      file: 'DDNS Client Setup 1.0.0.exe',
      href: '/downloads/DDNS Client Setup 1.0.0.exe',
      req: 'Windows 10+',
      badge: '.exe',
    },
    {
      icon: '🐧',
      title: 'Debian / Ubuntu',
      file: 'ddns-client_1.0.0_amd64.deb',
      href: '/downloads/ddns-client_1.0.0_amd64.deb',
      req: 'Ubuntu 16.04+, Debian 10+',
      badge: '.deb',
    },
    {
      icon: '📦',
      title: 'Universal Linux',
      file: 'DDNS Client-1.0.0.AppImage',
      href: '/downloads/DDNS Client-1.0.0.AppImage',
      req: 'Works on any x64 distro',
      badge: '.AppImage',
    },
  ];

  const compatibleRouters = [
    'DD-WRT',
    'OpenWRT',
    'pfSense',
    'Ubiquiti EdgeRouter',
    'Synology',
    'QNAP',
  ];

  return (
    <div className="dl-page">
      {/* Navigation */}
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
            <Link to="/downloads" className="navbar-link active">
              Downloads
            </Link>
          </div>
          <div className="navbar-right">
            <ThemeToggleButton />
            {user ? (
              <>
                <Link to="/profile" className="navbar-email" style={{ cursor: 'pointer', color: 'var(--accent-text)' }}>{user.email}</Link>
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
      <header className="dl-hero">
        <h1>Download DDNS Client</h1>
        <p className="dl-subtitle">
          Keep your IP updated automatically — no terminal required
        </p>
      </header>

      {/* Platform Downloads */}
      <section className="container">
        <h2 className="dl-section-title">Choose Your Platform</h2>
        <div className="dl-platform-grid">
          {platforms.map((p) => (
            <a href={p.href} key={p.badge} className="dl-platform-card" download>
              <span className="dl-platform-icon">{p.icon}</span>
              <span className="dl-platform-badge">{p.badge}</span>
              <strong className="dl-platform-title">{p.title}</strong>
              <span className="dl-platform-file">{p.file}</span>
              <span className="dl-platform-req">{p.req}</span>
              <span className="btn btn-primary dl-download-btn">Download</span>
            </a>
          ))}
        </div>
        <p className="dl-note">
          All binaries are built from{' '}
          <a href="https://github.com/devops-monk/ddns" target="_blank" rel="noreferrer">open source code</a>.
          Windows build coming soon. Version 1.0.0.
        </p>
      </section>

      {/* Quick Setup */}
      <section className="dl-setup-section">
        <div className="container">
          <h2 className="dl-section-title">Quick Setup</h2>
          <p className="dl-section-sub">Get running in under a minute after downloading.</p>
          <div className="dl-steps">
            {[
              {
                num: '1',
                title: 'Install & Launch',
                desc: 'Install the DDNS Client and launch it.',
              },
              {
                num: '2',
                title: 'Enter Server URL',
                desc: (
                  <>
                    Set the server to{' '}
                    <code className="dl-inline-code">https://api.devops-monk.com</code>
                  </>
                ),
              },
              {
                num: '3',
                title: 'Paste Credentials',
                desc: 'Copy your subdomain and token from the dashboard and paste them into the app.',
              },
              {
                num: '4',
                title: 'Done!',
                desc: 'Your IP stays updated automatically in the background.',
              },
            ].map((step) => (
              <div key={step.num} className="dl-step">
                <div className="dl-step-num">{step.num}</div>
                <div>
                  <strong>{step.title}</strong>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Script-Based Updates */}
      <section className="container">
        <h2 className="dl-section-title">Alternative: Script-Based Updates</h2>
        <p className="dl-section-sub">
          Prefer the command line? Use these snippets on any platform. Replace{' '}
          <code className="dl-inline-code">SUBDOMAIN</code> and{' '}
          <code className="dl-inline-code">YOUR_TOKEN</code> with your actual values from the
          dashboard.
        </p>

        <div className="dl-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`dl-tab ${activeTab === tab.key ? 'dl-tab-active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <CopyBlock code={SNIPPETS[activeTab]} />
      </section>

      {/* Router Compatibility */}
      <section className="dl-compat-section">
        <div className="container">
          <h2 className="dl-section-title">Router Compatibility</h2>
          <p className="dl-section-sub">
            Our API is DuckDNS-compatible, which means most routers with custom DDNS support will
            work out of the box.
          </p>
          <div className="dl-compat-grid">
            {compatibleRouters.map((name) => (
              <div key={name} className="dl-compat-item">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="dl-cta">
        {user ? (
          <>
            <h2>Go to your dashboard</h2>
            <p>Manage your domains, view IP history, and get update URLs.</p>
            <div className="dl-cta-buttons">
              <Link to="/dashboard" className="btn btn-primary dl-cta-btn">Dashboard</Link>
            </div>
          </>
        ) : (
          <>
            <h2>Ready to get started?</h2>
            <p>Create a free account, claim your subdomain, and keep your IP in sync.</p>
            <div className="dl-cta-buttons">
              <Link to="/register" className="btn btn-primary dl-cta-btn">Create Account</Link>
              <Link to="/login" className="btn btn-secondary dl-cta-btn">Sign In</Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
