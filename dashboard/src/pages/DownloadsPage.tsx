import { useState } from 'react';
import { Link } from 'react-router-dom';

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
*/5 * * * * curl -s "https://ddns.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN" > /dev/null`,
  windows: `# Run in PowerShell as Administrator
# Create a scheduled task that runs every 5 minutes

$action = New-ScheduledTaskAction -Execute "powershell.exe" \`
  -Argument '-Command "Invoke-WebRequest -Uri \\"https://ddns.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN\\" -UseBasicParsing"'
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
        curl -s 'https://ddns.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN';
        sleep 300;
      done"`,
  synology: `# Synology DSM > Control Panel > External Access > DDNS
# Provider: Custom
# Query URL:
https://ddns.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN

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
  option update_url 'https://ddns.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN'
  option check_interval '5'
  option check_unit 'minutes'`,
  rpi: `# Raspberry Pi — works with any Linux method
# Option 1: cron (recommended)
crontab -e
*/5 * * * * curl -s "https://ddns.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN" > /dev/null

# Option 2: systemd timer
sudo tee /etc/systemd/system/ddns-update.service << 'EOF'
[Unit]
Description=DDNS IP Update

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -s "https://ddns.devops-monk.com/update?domain=SUBDOMAIN&token=YOUR_TOKEN"
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

  const platforms = [
    {
      icon: '🪟',
      title: 'Download for Windows',
      file: 'ddns-client-setup.exe',
      req: 'Windows 10+',
      badge: '.exe',
    },
    {
      icon: '🍎',
      title: 'Download for macOS',
      file: 'ddns-client.dmg',
      req: 'macOS 10.13+',
      badge: '.dmg',
    },
    {
      icon: '🐧',
      title: 'Download for Debian/Ubuntu',
      file: 'ddns-client.deb',
      req: 'Ubuntu 16.04+',
      badge: '.deb',
    },
    {
      icon: '📦',
      title: 'Universal Linux',
      file: 'ddns-client.AppImage',
      req: 'Works on any distro',
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
      <nav className="dl-nav">
        <Link to="/dashboard" className="dl-nav-brand">DDNS</Link>
        <div className="dl-nav-links">
          <Link to="/login">Sign In</Link>
          <Link to="/register" className="btn btn-primary">Get Started</Link>
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
            <a href="#" key={p.badge} className="dl-platform-card">
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
          All downloads are from our GitLab releases page. Binaries are built from the{' '}
          <a href="#">open source code</a>. Release binaries will be available soon.
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
                    <code className="dl-inline-code">https://ddns.devops-monk.com</code>
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
        <h2>Ready to get started?</h2>
        <p>Create a free account, claim your subdomain, and keep your IP in sync.</p>
        <div className="dl-cta-buttons">
          <Link to="/register" className="btn btn-primary dl-cta-btn">Create Account</Link>
          <Link to="/login" className="btn btn-secondary dl-cta-btn">Sign In</Link>
        </div>
      </section>
    </div>
  );
}
