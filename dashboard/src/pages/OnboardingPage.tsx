import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { createDomain } from '../api/client';
import { ThemeToggleButton } from '../App';

type Platform = 'linux' | 'macos' | 'windows' | 'docker';

const STEPS = ['Create Domain', 'Copy Token', 'Setup Client', 'Done'];

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [subdomain, setSubdomain] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState('');
  const [platform, setPlatform] = useState<Platform>('linux');

  async function handleCreateDomain() {
    setError('');
    const name = subdomain.trim().toLowerCase();
    if (!name || !/^[a-z0-9-]{3,63}$/.test(name)) {
      setError('3-63 characters, lowercase letters, numbers, and hyphens only');
      return;
    }
    setCreating(true);
    try {
      const r = await createDomain(name);
      setSubdomain(r.data.subdomain);
      setToken(r.data.token);
      setStep(1);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create domain');
    } finally {
      setCreating(false);
    }
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  }

  function finish() {
    localStorage.setItem('onboarding_complete', '1');
    navigate('/dashboard');
  }

  function skip() {
    localStorage.setItem('onboarding_complete', '1');
    navigate('/dashboard');
  }

  const updateUrl = `https://api.devops-monk.com/update?domain=${subdomain}&token=${token}`;

  const platformScripts: Record<Platform, { label: string; script: string }> = {
    linux: {
      label: 'Linux (cron)',
      script: `# Add to crontab (runs every 5 minutes):\ncrontab -e\n\n# Paste this line:\n*/5 * * * * curl -s "${updateUrl}&ip=auto"`,
    },
    macos: {
      label: 'macOS (launchd)',
      script: `# Quick setup with cron:\ncrontab -e\n\n# Paste this line:\n*/5 * * * * curl -s "${updateUrl}&ip=auto"`,
    },
    windows: {
      label: 'Windows (PowerShell)',
      script: `# Run in PowerShell as Administrator:\n$action = New-ScheduledTaskAction -Execute "powershell" -Argument "-Command Invoke-WebRequest '${updateUrl}&ip=auto'"\n$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 5) -Once -At (Get-Date)\nRegister-ScheduledTask -TaskName "DDNS Update" -Action $action -Trigger $trigger`,
    },
    docker: {
      label: 'Docker',
      script: `# docker-compose.yml\nservices:\n  ddns:\n    image: curlimages/curl\n    command: sh -c 'while true; do curl -s "${updateUrl}&ip=auto"; sleep 300; done'\n    restart: unless-stopped`,
    },
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-light)',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '600px',
    margin: '0 auto',
    boxShadow: '0 1px 3px var(--shadow-md)',
  };

  const codeBlockStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    borderRadius: '8px',
    padding: '1rem',
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    fontSize: '0.8rem',
    lineHeight: 1.6,
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    color: 'var(--text-primary)',
  };

  return (
    <div style={{ background: 'var(--bg-body)', minHeight: '100vh' }}>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/dashboard" className="navbar-brand">
            <span className="navbar-brand-icon">D</span>
            DDNS
          </Link>
          <div className="navbar-right">
            <ThemeToggleButton />
            <button onClick={skip} className="btn btn-secondary btn-sm">Skip</button>
          </div>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
            Welcome{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Let's set up your first dynamic DNS domain in under 2 minutes.
          </p>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 700,
                background: i <= step ? 'var(--accent-primary, #4f46e5)' : 'var(--bg-secondary)',
                color: i <= step ? 'white' : 'var(--text-muted)',
                transition: 'all 0.3s',
              }}>
                {i < step ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : i + 1}
              </div>
              <span style={{
                fontSize: '0.8rem', fontWeight: i === step ? 600 : 400,
                color: i <= step ? 'var(--text-primary)' : 'var(--text-muted)',
                display: window.innerWidth < 500 && i !== step ? 'none' : 'inline',
              }}>
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div style={{
                  width: '2rem', height: '2px',
                  background: i < step ? 'var(--accent-primary, #4f46e5)' : 'var(--border-light)',
                  transition: 'background 0.3s',
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Create Domain */}
        {step === 0 && (
          <div style={cardStyle}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--accent-muted)', color: 'var(--accent-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem' }}>Create Your First Domain</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Choose a subdomain name. This will be your dynamic DNS address.
              </p>
            </div>

            {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="myhome"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateDomain()}
                style={{
                  flex: 1, padding: '0.75rem', border: '1px solid var(--border-input)',
                  borderRadius: '8px', fontSize: '1rem', background: 'var(--bg-input)',
                  color: 'var(--text-primary)', fontFamily: "'SF Mono', 'Fira Code', monospace",
                }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                .dyn.devops-monk.com
              </span>
            </div>

            {subdomain.trim() && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Your domain will be: <strong style={{ color: 'var(--accent-text)' }}>{subdomain.trim()}.dyn.devops-monk.com</strong>
              </p>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={handleCreateDomain}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Domain'}
            </button>
          </div>
        )}

        {/* Step 1: Copy Token */}
        {step === 1 && (
          <div style={cardStyle}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--accent-muted)', color: 'var(--accent-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem' }}>Copy Your Update Token</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                You'll need this token to authenticate DNS updates. Keep it secret.
              </p>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                Domain
              </label>
              <div style={{ ...codeBlockStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{subdomain}.dyn.devops-monk.com</span>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                Update Token
              </label>
              <div style={{ ...codeBlockStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <span style={{ wordBreak: 'break-all' }}>{token}</span>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => copyText(token, 'token')}
                  style={{ flexShrink: 0 }}
                >
                  {copied === 'token' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                Update URL
              </label>
              <div style={{ ...codeBlockStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                <span style={{ wordBreak: 'break-all', fontSize: '0.75rem' }}>{updateUrl}</span>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => copyText(updateUrl, 'url')}
                  style={{ flexShrink: 0 }}
                >
                  {copied === 'url' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setStep(2)}>
              Next: Setup Your Client
            </button>
          </div>
        )}

        {/* Step 2: Choose Platform & Setup */}
        {step === 2 && (
          <div style={cardStyle}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--accent-muted)', color: 'var(--accent-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem' }}>Setup Automatic Updates</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Choose your platform and follow the instructions.
              </p>
            </div>

            {/* Platform tabs */}
            <div className="dl-tabs" style={{ marginBottom: '1.25rem', justifyContent: 'center' }}>
              {(Object.keys(platformScripts) as Platform[]).map((p) => (
                <button
                  key={p}
                  className={`dl-tab ${platform === p ? 'dl-tab-active' : ''}`}
                  onClick={() => setPlatform(p)}
                >
                  {platformScripts[p].label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <pre style={codeBlockStyle}>{platformScripts[platform].script}</pre>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => copyText(platformScripts[platform].script, 'script')}
                style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}
              >
                {copied === 'script' ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem', textAlign: 'center' }}>
              Or download our <Link to="/downloads" style={{ color: 'var(--accent-text)' }}>Desktop App</Link> for automatic updates with a GUI.
            </p>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setStep(3)}>
              Next: Finish Setup
            </button>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div style={cardStyle}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem' }}>You're All Set!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Your domain <strong style={{ color: 'var(--accent-text)' }}>{subdomain}.dyn.devops-monk.com</strong> is ready.
                Once your update script runs, it will automatically keep your DNS pointing to your current IP.
              </p>

              <div style={{
                background: 'var(--bg-secondary)', borderRadius: '10px', padding: '1rem',
                marginBottom: '1.5rem', textAlign: 'left',
              }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>What's next:</p>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                  <li>Check your <Link to="/dashboard" style={{ color: 'var(--accent-text)' }}>dashboard</Link> to see when updates arrive</li>
                  <li>Enable <Link to={`/domain/${subdomain}`} style={{ color: 'var(--accent-text)' }}>email or webhook notifications</Link> for IP changes</li>
                  <li>Create up to 5 domains total</li>
                </ul>
              </div>

              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={finish}>
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
