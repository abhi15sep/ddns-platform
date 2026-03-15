import { useEffect, useState, useCallback, CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggleButton } from '../App';

/* ---------- tiny helpers ---------- */
const TERMINAL_LINES = [
  { prompt: '$ ', text: 'curl https://api.devops-monk.com/update?domain=homelab&token=abc123', delay: 40 },
  { prompt: '', text: '{"success":true,"ip":"98.42.117.5","changed":true}', delay: 20 },
  { prompt: '', text: '', delay: 0 },
  { prompt: '$ ', text: 'dig +short homelab.dyn.devops-monk.com', delay: 50 },
  { prompt: '', text: '98.42.117.5', delay: 30 },
];

function TerminalAnimation() {
  const [lines, setLines] = useState<{ prompt: string; text: string }[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    if (currentLine >= TERMINAL_LINES.length) {
      setDone(true);
      return;
    }
    const entry = TERMINAL_LINES[currentLine];
    if (entry.delay === 0 || currentChar >= entry.text.length) {
      setLines((prev) => {
        const copy = [...prev];
        copy[currentLine] = { prompt: entry.prompt, text: entry.text };
        return copy;
      });
      const timeout = setTimeout(() => {
        setCurrentLine((l) => l + 1);
        setCurrentChar(0);
      }, 400);
      return () => clearTimeout(timeout);
    }
    const timeout = setTimeout(() => {
      setLines((prev) => {
        const copy = [...prev];
        copy[currentLine] = {
          prompt: entry.prompt,
          text: entry.text.slice(0, currentChar + 1),
        };
        return copy;
      });
      setCurrentChar((c) => c + 1);
    }, entry.delay);
    return () => clearTimeout(timeout);
  }, [currentLine, currentChar, done]);

  return (
    <div style={styles.terminal}>
      <div style={styles.terminalBar}>
        <span style={{ ...styles.terminalDot, background: '#ff5f57' }} />
        <span style={{ ...styles.terminalDot, background: '#febc2e' }} />
        <span style={{ ...styles.terminalDot, background: '#28c840' }} />
        <span style={styles.terminalTitle}>Terminal</span>
      </div>
      <div style={styles.terminalBody}>
        {lines.map((l, i) => (
          <div key={i} style={styles.terminalLine}>
            {l.prompt && <span style={styles.terminalPrompt}>{l.prompt}</span>}
            <span style={l.prompt ? styles.terminalCmd : styles.terminalOutput}>{l.text}</span>
            {i === currentLine && !done && <span style={styles.cursor}>|</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- icon SVGs (inline, no deps) ---------- */
function IconGlobe() {
  return (
    <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#4f46e5" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
    </svg>
  );
}
function IconStack() {
  return (
    <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#4f46e5" strokeWidth="1.5">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#4f46e5" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
function IconMonitor() {
  return (
    <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#4f46e5" strokeWidth="1.5">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
function IconCode() {
  return (
    <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#4f46e5" strokeWidth="1.5">
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  );
}
function IconPlug() {
  return (
    <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#4f46e5" strokeWidth="1.5">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M14.31 8l5.74 9.94M9.69 8h11.48M7.38 12l5.74-9.94M9.69 16l-5.74-9.94M14.31 16H2.83M16.62 12l-5.74 9.94" />
    </svg>
  );
}

/* ---------- check / cross for table ---------- */
function Check() {
  return <span style={{ color: 'var(--badge-active-text)', fontWeight: 700, fontSize: '1.1rem' }}>Yes</span>;
}
function Cross() {
  return <span style={{ color: 'var(--badge-never-text)', fontWeight: 700, fontSize: '1.1rem' }}>No</span>;
}
function Free() {
  return <span style={{ color: 'var(--badge-active-text)', fontWeight: 700 }}>Free</span>;
}

/* ---------- uptime badge ---------- */
function UptimeBadge() {
  const [uptime, setUptime] = useState<{ status: string; pct: number } | null>(null);

  const fetchUptime = useCallback(async () => {
    try {
      const res = await fetch('/health/uptime', { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        const pct = data.uptime?.['30d'] || 0;
        setUptime({ status: data.status || 'unknown', pct });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchUptime(); }, [fetchUptime]);

  if (!uptime || uptime.pct === 0) return null;

  const isOk = uptime.status === 'ok';
  const dotColor = isOk ? '#34d399' : uptime.status === 'degraded' ? '#fbbf24' : '#f87171';

  return (
    <Link to="/status" style={styles.uptimeBadge}>
      <span style={{ ...styles.uptimeDot, background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
      <span style={styles.uptimeText}>
        {isOk ? 'All Systems Operational' : uptime.status === 'degraded' ? 'Partial Degradation' : 'Service Issues'}
      </span>
      <span style={styles.uptimePct}>{uptime.pct}% uptime (30d)</span>
    </Link>
  );
}

/* ---------- main component ---------- */
export default function LandingPage() {
  return (
    <div style={styles.page}>
      {/* NAV */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <Link to="/" style={styles.logo}>
            <span style={styles.logoIcon}>&#9670;</span> DevOps Monk DDNS
          </Link>
          <div style={styles.navLinks}>
            <a href="#features" style={styles.navLink}>Features</a>
            <a href="#how-it-works" style={styles.navLink}>How It Works</a>
            <a href="#compare" style={styles.navLink}>Compare</a>
            <Link to="/login" style={styles.navLink}>Sign In</Link>
            <ThemeToggleButton />
            <Link to="/register" style={styles.navCta}>Get Started</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.heroText}>
            <h1 style={styles.heroH1}>Your Home Server.<br />Always Reachable.</h1>
            <p style={styles.heroSub}>
              Free, open-source Dynamic DNS that keeps your domains pointed at your
              changing IP address. No monthly confirmations. No limits. No catch.
            </p>
            <UptimeBadge />
            <div style={styles.heroCtas}>
              <Link to="/register" style={styles.ctaPrimary}>Get Started Free</Link>
              <a href="#how-it-works" style={styles.ctaSecondary}>Learn More &darr;</a>
            </div>
          </div>
          <div style={styles.heroTerminal}>
            <TerminalAnimation />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={styles.sectionLight}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>How It Works</h2>
          <p style={styles.sectionSub}>Three simple steps to never lose access to your home server again.</p>
          <div style={styles.stepsRow}>
            {[
              {
                num: '1',
                title: 'Create a Subdomain',
                desc: 'Sign up and pick a name like homelab.dyn.devops-monk.com',
              },
              {
                num: '2',
                title: 'Install the Updater',
                desc: 'Download our desktop app or add a one-line cron job',
              },
              {
                num: '3',
                title: 'Always Connected',
                desc: 'Your domain always points to your current IP, even when it changes',
              },
            ].map((s) => (
              <div key={s.num} style={styles.stepCard}>
                <div style={styles.stepNum}>{s.num}</div>
                <h3 style={styles.stepTitle}>{s.title}</h3>
                <p style={styles.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={styles.sectionWhite}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Everything You Need</h2>
          <p style={styles.sectionSub}>Powerful features, completely free.</p>
          <div style={styles.featuresGrid}>
            {[
              { icon: <IconGlobe />, title: '5 Free Subdomains', desc: 'Create up to 5 subdomains per account — no credit card required.' },
              { icon: <IconStack />, title: 'IPv4 + IPv6 Support', desc: 'Full dual-stack support. Update A and AAAA records seamlessly.' },
              { icon: <IconClock />, title: 'IP Change History & Charts', desc: 'Track every IP change with timestamps and visual charts.' },
              { icon: <IconMonitor />, title: 'Desktop App', desc: 'Native app for Windows, macOS, and Linux. Zero terminal knowledge needed.' },
              { icon: <IconCode />, title: 'Open Source & Self-Hosted', desc: 'Run your own instance. Inspect every line of code on GitHub.' },
              { icon: <IconPlug />, title: 'Simple HTTP API', desc: 'Update your IP with a single GET request. Works with routers, cron, scripts, and more.' },
            ].map((f) => (
              <div key={f.title} style={styles.featureCard}>
                <div style={styles.featureIcon}>{f.icon}</div>
                <h3 style={styles.featureTitle}>{f.title}</h3>
                <p style={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section id="compare" style={styles.sectionLight}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>How We Compare</h2>
          <p style={styles.sectionSub}>See why DevOps Monk DDNS is the best choice for home server owners.</p>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Feature</th>
                  <th style={styles.th}>DuckDNS</th>
                  <th style={styles.th}>No-IP Free</th>
                  <th style={{ ...styles.th, ...styles.thHighlight }}>DevOps Monk DDNS</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ['Price', <Free key="f1" />, <Free key="f2" />, <Free key="f3" />],
                  ['Domain Limit', '5 subdomains', '1 hostname', '5 subdomains'],
                  ['Monthly Confirmation', <Cross key="c1" />, <span key="s1" style={{ color: 'var(--badge-never-text)', fontWeight: 700 }}>Required</span>, <Cross key="c2" />],
                  ['IP Change History', <Cross key="c3" />, <Cross key="c4" />, <Check key="k1" />],
                  ['Desktop App', <Cross key="c5" />, <Check key="k2" />, <Check key="k3" />],
                  ['Open Source', <Check key="k4" />, <Cross key="c6" />, <Check key="k5" />],
                  ['Self-Hosted', <Cross key="c7" />, <Cross key="c8" />, <Check key="k6" />],
                  ['IPv6 Support', <Check key="k7" />, <Check key="k8" />, <Check key="k9" />],
                  ['Custom DNS Zone', <Cross key="c9" />, <Cross key="c10" />, <Check key="k10" />],
                ] as [string, React.ReactNode, React.ReactNode, React.ReactNode][]).map(([label, duck, noip, us], i) => (
                  <tr key={i} style={i % 2 === 0 ? styles.trEven : undefined}>
                    <td style={styles.tdLabel}>{label}</td>
                    <td style={styles.td}>{duck}</td>
                    <td style={styles.td}>{noip}</td>
                    <td style={{ ...styles.td, ...styles.tdHighlight }}>{us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section style={styles.sectionWhite}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle}>Built For Your Use Case</h2>
          <p style={styles.sectionSub}>Whether you run a home lab or a game server, we have you covered.</p>
          <div style={styles.useCasesRow}>
            {[
              { emoji: '\uD83D\uDDA5\uFE0F', title: 'Home Lab / Self-Hosting', desc: 'Nextcloud, Plex, Jellyfin, Gitea -- access them all from anywhere.' },
              { emoji: '\uD83D\uDD10', title: 'Remote Access (SSH, RDP)', desc: 'SSH into your home machine or RDP into your desktop from any network.' },
              { emoji: '\uD83C\uDFAE', title: 'Game Servers', desc: 'Host Minecraft, Valheim, or Terraria servers your friends can always find.' },
              { emoji: '\uD83D\uDCA1', title: 'IoT / Smart Home', desc: 'Reach your Home Assistant, Node-RED, or MQTT broker remotely.' },
              { emoji: '\uD83D\uDCF7', title: 'Security Cameras', desc: 'Check your cameras from anywhere without paying for cloud subscriptions.' },
            ].map((u) => (
              <div key={u.title} style={styles.useCaseCard}>
                <div style={styles.useCaseEmoji}>{u.emoji}</div>
                <h3 style={styles.useCaseTitle}>{u.title}</h3>
                <p style={styles.useCaseDesc}>{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section style={styles.ctaSection}>
        <div style={styles.ctaSectionInner}>
          <h2 style={styles.ctaH2}>Ready to get started?</h2>
          <p style={styles.ctaSub}>
            Create your free account in seconds. No credit card required.
          </p>
          <Link to="/register" style={styles.ctaPrimaryLg}>Create Free Account</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerBrand}>
            <span style={styles.footerLogo}><span style={styles.logoIcon}>&#9670;</span> DevOps Monk DDNS</span>
            <p style={styles.footerTagline}>Free, open-source Dynamic DNS for everyone.</p>
          </div>
          <div style={styles.footerLinks}>
            <div style={styles.footerCol}>
              <h4 style={styles.footerColTitle}>Product</h4>
              <a href="#features" style={styles.footerLink}>Features</a>
              <a href="#compare" style={styles.footerLink}>Compare</a>
              <Link to="/register" style={styles.footerLink}>Sign Up</Link>
            </div>
            <div style={styles.footerCol}>
              <h4 style={styles.footerColTitle}>Resources</h4>
              <Link to="/downloads" style={styles.footerLink}>Downloads</Link>
              <Link to="/status" style={styles.footerLink}>Status</Link>
              <a href="https://github.com/devops-monk/ddns" target="_blank" rel="noreferrer" style={styles.footerLink}>GitHub</a>
            </div>
          </div>
        </div>
        <div style={styles.footerBottom}>
          <p>&copy; {new Date().getFullYear()} DevOps Monk. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

/* ---------- styles ---------- */
const styles: Record<string, CSSProperties> = {
  page: {
    background: 'var(--bg-body)',
    color: 'var(--text-primary)',
    minHeight: '100vh',
    overflowX: 'hidden',
    transition: 'background 0.2s, color 0.2s',
  },

  /* NAV */
  nav: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'var(--bg-card)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--border-default)',
    transition: 'background 0.2s, border-color 0.2s',
  },
  navInner: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0.75rem 1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  },
  logoIcon: {
    color: 'var(--accent-text)',
    fontSize: '1.3rem',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    flexWrap: 'wrap' as const,
  },
  navLink: {
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  navCta: {
    background: 'var(--accent)',
    color: '#fff',
    padding: '0.5rem 1.15rem',
    borderRadius: 8,
    fontSize: '0.9rem',
    fontWeight: 600,
    textDecoration: 'none',
  },

  /* HERO */
  hero: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    padding: '5rem 1.5rem 4rem',
  },
  heroInner: {
    maxWidth: 1200,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: '3rem',
    flexWrap: 'wrap' as const,
  },
  heroText: {
    flex: '1 1 420px',
    minWidth: 300,
  },
  heroH1: {
    fontSize: 'clamp(2rem, 5vw, 3.25rem)',
    fontWeight: 800,
    color: '#ffffff',
    lineHeight: 1.15,
    marginBottom: '1.25rem',
  },
  heroSub: {
    fontSize: 'clamp(1rem, 2vw, 1.2rem)',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 1.7,
    marginBottom: '2rem',
    maxWidth: 540,
  },
  uptimeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: '0.4rem 1rem',
    marginBottom: '1.25rem',
    textDecoration: 'none',
    transition: 'background 0.2s',
    cursor: 'pointer',
  },
  uptimeDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
  },
  uptimeText: {
    color: '#ffffff',
    fontSize: '0.82rem',
    fontWeight: 600,
  },
  uptimePct: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: '0.78rem',
    fontWeight: 500,
  },
  heroCtas: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap' as const,
  },
  ctaPrimary: {
    background: '#ffffff',
    color: '#4f46e5',
    padding: '0.85rem 2rem',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: '1rem',
    textDecoration: 'none',
    transition: 'transform 0.15s',
  },
  ctaSecondary: {
    background: 'rgba(255,255,255,0.15)',
    color: '#ffffff',
    padding: '0.85rem 2rem',
    borderRadius: 10,
    fontWeight: 600,
    fontSize: '1rem',
    textDecoration: 'none',
    border: '1px solid rgba(255,255,255,0.3)',
  },
  heroTerminal: {
    flex: '1 1 420px',
    minWidth: 300,
  },

  /* TERMINAL */
  terminal: {
    background: '#1e1e2e',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
    fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
    fontSize: '0.82rem',
  },
  terminalBar: {
    background: '#2d2d3f',
    padding: '0.6rem 0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  terminalDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    display: 'inline-block',
  },
  terminalTitle: {
    marginLeft: '0.5rem',
    color: '#888',
    fontSize: '0.75rem',
  },
  terminalBody: {
    padding: '1rem 1.25rem',
    minHeight: 140,
  },
  terminalLine: {
    lineHeight: 1.8,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
  },
  terminalPrompt: {
    color: '#a78bfa',
  },
  terminalCmd: {
    color: '#e2e8f0',
  },
  terminalOutput: {
    color: '#86efac',
  },
  cursor: {
    color: '#a78bfa',
    animation: 'blink 1s step-end infinite',
  },

  /* SECTIONS */
  sectionLight: {
    background: 'var(--bg-secondary)',
    padding: '5rem 1.5rem',
    transition: 'background 0.2s',
  },
  sectionWhite: {
    background: 'var(--bg-card)',
    padding: '5rem 1.5rem',
    transition: 'background 0.2s',
  },
  sectionInner: {
    maxWidth: 1200,
    margin: '0 auto',
  },
  sectionTitle: {
    textAlign: 'center' as const,
    fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
    fontWeight: 800,
    marginBottom: '0.5rem',
    color: 'var(--text-heading)',
  },
  sectionSub: {
    textAlign: 'center' as const,
    color: 'var(--text-secondary)',
    fontSize: '1.05rem',
    marginBottom: '3rem',
    maxWidth: 600,
    marginLeft: 'auto',
    marginRight: 'auto',
  },

  /* HOW IT WORKS */
  stepsRow: {
    display: 'flex',
    gap: '2rem',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  stepCard: {
    flex: '1 1 260px',
    maxWidth: 340,
    background: 'var(--bg-card)',
    borderRadius: 16,
    padding: '2rem',
    boxShadow: '0 1px 4px var(--shadow-sm)',
    textAlign: 'center' as const,
    border: '1px solid var(--border-light)',
    transition: 'background 0.2s, border-color 0.2s',
  },
  stepNum: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff',
    fontSize: '1.25rem',
    fontWeight: 800,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  stepTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    marginBottom: '0.5rem',
    color: 'var(--text-heading)',
  },
  stepDesc: {
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    lineHeight: 1.6,
  },

  /* FEATURES GRID */
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.5rem',
  },
  featureCard: {
    background: 'var(--bg-secondary)',
    borderRadius: 14,
    padding: '1.75rem',
    border: '1px solid var(--border-default)',
    transition: 'box-shadow 0.2s, transform 0.2s, background 0.2s',
  },
  featureIcon: {
    marginBottom: '0.75rem',
  },
  featureTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
    marginBottom: '0.4rem',
    color: 'var(--text-heading)',
  },
  featureDesc: {
    color: 'var(--text-secondary)',
    fontSize: '0.93rem',
    lineHeight: 1.6,
  },

  /* COMPARISON TABLE */
  tableWrap: {
    overflowX: 'auto' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    background: 'var(--bg-card)',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 1px 4px var(--shadow-sm)',
    minWidth: 600,
    border: '1px solid var(--border-light)',
    transition: 'background 0.2s',
  },
  th: {
    padding: '1rem 1.25rem',
    textAlign: 'left' as const,
    fontSize: '0.8rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    background: 'var(--table-header-bg)',
    borderBottom: '2px solid var(--border-default)',
    fontWeight: 600,
  },
  thHighlight: {
    background: 'var(--accent-bg)',
    color: 'var(--accent-text)',
  },
  td: {
    padding: '0.85rem 1.25rem',
    borderBottom: '1px solid var(--table-border)',
    fontSize: '0.93rem',
    color: 'var(--text-primary)',
    textAlign: 'center' as const,
  },
  tdLabel: {
    padding: '0.85rem 1.25rem',
    borderBottom: '1px solid var(--table-border)',
    fontSize: '0.93rem',
    fontWeight: 600,
    color: 'var(--text-heading)',
    textAlign: 'left' as const,
  },
  tdHighlight: {
    background: 'var(--accent-bg)',
  },
  trEven: {
    background: 'var(--table-even-bg)',
  },

  /* USE CASES */
  useCasesRow: {
    display: 'flex',
    gap: '1.25rem',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  useCaseCard: {
    flex: '1 1 200px',
    maxWidth: 220,
    background: 'var(--bg-secondary)',
    borderRadius: 14,
    padding: '1.5rem 1.25rem',
    textAlign: 'center' as const,
    border: '1px solid var(--border-default)',
    transition: 'background 0.2s, border-color 0.2s',
  },
  useCaseEmoji: {
    fontSize: '2rem',
    marginBottom: '0.75rem',
  },
  useCaseTitle: {
    fontSize: '0.95rem',
    fontWeight: 700,
    marginBottom: '0.35rem',
    color: 'var(--text-heading)',
  },
  useCaseDesc: {
    color: 'var(--text-secondary)',
    fontSize: '0.85rem',
    lineHeight: 1.55,
  },

  /* BOTTOM CTA */
  ctaSection: {
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    padding: '4.5rem 1.5rem',
    textAlign: 'center' as const,
  },
  ctaSectionInner: {
    maxWidth: 600,
    margin: '0 auto',
  },
  ctaH2: {
    fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
    fontWeight: 800,
    color: '#ffffff',
    marginBottom: '0.75rem',
  },
  ctaSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: '1.1rem',
    marginBottom: '2rem',
  },
  ctaPrimaryLg: {
    display: 'inline-block',
    background: '#ffffff',
    color: '#4f46e5',
    padding: '1rem 2.5rem',
    borderRadius: 12,
    fontWeight: 700,
    fontSize: '1.1rem',
    textDecoration: 'none',
  },

  /* FOOTER */
  footer: {
    background: '#111827',
    color: '#9ca3af',
    padding: '3rem 1.5rem 1.5rem',
  },
  footerInner: {
    maxWidth: 1200,
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '2rem',
    flexWrap: 'wrap' as const,
    marginBottom: '2rem',
  },
  footerBrand: {
    maxWidth: 320,
  },
  footerLogo: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    marginBottom: '0.5rem',
  },
  footerTagline: {
    fontSize: '0.9rem',
    lineHeight: 1.6,
    color: '#9ca3af',
  },
  footerLinks: {
    display: 'flex',
    gap: '3rem',
    flexWrap: 'wrap' as const,
  },
  footerCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.4rem',
  },
  footerColTitle: {
    fontSize: '0.8rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#d1d5db',
    fontWeight: 600,
    marginBottom: '0.35rem',
  },
  footerLink: {
    color: '#9ca3af',
    textDecoration: 'none',
    fontSize: '0.9rem',
  },
  footerBottom: {
    maxWidth: 1200,
    margin: '0 auto',
    borderTop: '1px solid #1f2937',
    paddingTop: '1.25rem',
    fontSize: '0.82rem',
    color: '#6b7280',
    textAlign: 'center' as const,
  },
};

/* Note: Footer keeps dark colors intentionally — it's always dark regardless of theme */
