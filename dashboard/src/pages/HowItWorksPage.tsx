import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function HowItWorksPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
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
            <Link to="/how-it-works" className="navbar-link active">
              How It Works
            </Link>
            <Link to="/downloads" className="navbar-link">
              Downloads
            </Link>
          </div>
          <div className="navbar-right">
            {user ? (
              <>
                <span className="navbar-email">{user.email}</span>
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
      <header style={styles.hero}>
        <h1 style={styles.heroTitle}>How Dynamic DNS Works</h1>
        <p style={styles.heroSub}>
          A simple guide to understanding why you need DDNS and how it keeps your home network reachable
        </p>
      </header>

      <div className="container">

        {/* The Problem */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>The Problem</h2>
          <p style={styles.sectionDesc}>
            Every time you connect to the internet, your ISP (Internet Service Provider) gives your home router a <strong>public IP address</strong>.
            But this IP address <strong>changes regularly</strong> — sometimes daily, sometimes weekly. This makes it impossible to reliably connect
            to your home devices from outside.
          </p>

          <div style={styles.problemGrid}>
            <div style={styles.problemCard}>
              <div style={styles.problemIcon}>🏠</div>
              <h3 style={styles.problemTitle}>Monday</h3>
              <p style={styles.problemDesc}>Your home IP is <code style={styles.code}>98.51.100.42</code></p>
            </div>
            <div style={styles.problemCard}>
              <div style={styles.problemIcon}>🔄</div>
              <h3 style={styles.problemTitle}>Wednesday</h3>
              <p style={styles.problemDesc}>ISP changes it to <code style={styles.code}>203.0.113.77</code></p>
            </div>
            <div style={styles.problemCard}>
              <div style={styles.problemIcon}>❌</div>
              <h3 style={styles.problemTitle}>Result</h3>
              <p style={styles.problemDesc}>Your bookmarked IP no longer works!</p>
            </div>
          </div>
        </section>

        {/* The Solution */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>The Solution: Dynamic DNS</h2>
          <p style={styles.sectionDesc}>
            Instead of remembering an IP address that changes, you use a <strong>domain name</strong> like{' '}
            <code style={styles.code}>myhome.dyn.devops-monk.com</code>. A small script on your home network
            tells our server whenever your IP changes, and we update the DNS record automatically.
          </p>
        </section>

        {/* Flow Diagram */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>How It Works — Step by Step</h2>

          {/* Visual Flow */}
          <div style={styles.flowContainer}>
            {/* Row 1: Setup */}
            <div style={styles.flowStep}>
              <div style={styles.flowNumber}>1</div>
              <div style={styles.flowContent}>
                <h3 style={styles.flowTitle}>You sign up & create a subdomain</h3>
                <p style={styles.flowDesc}>Go to ddns.devops-monk.com, create an account, and register a subdomain like <code style={styles.code}>myhome</code></p>
              </div>
              <div style={styles.flowDiagram}>
                <div style={styles.deviceBox}>
                  <span style={styles.deviceIcon}>👤</span>
                  <span style={styles.deviceLabel}>You</span>
                </div>
                <div style={styles.arrow}>→</div>
                <div style={{...styles.deviceBox, ...styles.serverBox}}>
                  <span style={styles.deviceIcon}>🌐</span>
                  <span style={styles.deviceLabel}>DDNS Server</span>
                </div>
              </div>
            </div>

            {/* Row 2: Update Script */}
            <div style={styles.flowStep}>
              <div style={styles.flowNumber}>2</div>
              <div style={styles.flowContent}>
                <h3 style={styles.flowTitle}>A script on your home network reports your IP</h3>
                <p style={styles.flowDesc}>
                  A cron job, the desktop app, or your router sends a request to our server every 5 minutes:
                </p>
                <div className="code-block" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  <code>curl "https://api.devops-monk.com/update?domain=myhome&token=YOUR_TOKEN"</code>
                </div>
              </div>
              <div style={styles.flowDiagram}>
                <div style={styles.deviceBox}>
                  <span style={styles.deviceIcon}>🏠</span>
                  <span style={styles.deviceLabel}>Home Device</span>
                </div>
                <div style={styles.arrow}>→</div>
                <div style={styles.deviceBox}>
                  <span style={styles.deviceIcon}>📡</span>
                  <span style={styles.deviceLabel}>Router</span>
                  <span style={styles.deviceSub}>IP: 98.51.100.42</span>
                </div>
                <div style={styles.arrow}>→</div>
                <div style={{...styles.deviceBox, ...styles.serverBox}}>
                  <span style={styles.deviceIcon}>🌐</span>
                  <span style={styles.deviceLabel}>DDNS Server</span>
                  <span style={styles.deviceSub}>Saves your IP</span>
                </div>
              </div>
            </div>

            {/* Row 3: DNS Update */}
            <div style={styles.flowStep}>
              <div style={styles.flowNumber}>3</div>
              <div style={styles.flowContent}>
                <h3 style={styles.flowTitle}>Our server updates the DNS record</h3>
                <p style={styles.flowDesc}>
                  We tell the DNS system: <code style={styles.code}>myhome.dyn.devops-monk.com</code> now points to <code style={styles.code}>98.51.100.42</code>
                </p>
              </div>
              <div style={styles.flowDiagram}>
                <div style={{...styles.deviceBox, ...styles.serverBox}}>
                  <span style={styles.deviceIcon}>🌐</span>
                  <span style={styles.deviceLabel}>DDNS Server</span>
                </div>
                <div style={styles.arrow}>→</div>
                <div style={{...styles.deviceBox, ...styles.dnsBox}}>
                  <span style={styles.deviceIcon}>📋</span>
                  <span style={styles.deviceLabel}>DNS System</span>
                  <span style={styles.deviceSub}>myhome → 98.51.100.42</span>
                </div>
              </div>
            </div>

            {/* Row 4: IP Change */}
            <div style={styles.flowStep}>
              <div style={styles.flowNumber}>4</div>
              <div style={styles.flowContent}>
                <h3 style={styles.flowTitle}>When your IP changes, it auto-updates</h3>
                <p style={styles.flowDesc}>
                  Your ISP assigns you a new IP? No problem — the script detects the change and sends the new IP.
                  The DNS record is updated within seconds.
                </p>
              </div>
              <div style={styles.flowDiagram}>
                <div style={styles.deviceBox}>
                  <span style={styles.deviceIcon}>📡</span>
                  <span style={styles.deviceLabel}>Router</span>
                  <span style={{...styles.deviceSub, color: '#dc2626'}}>New IP: 203.0.113.77</span>
                </div>
                <div style={styles.arrow}>→</div>
                <div style={{...styles.deviceBox, ...styles.serverBox}}>
                  <span style={styles.deviceIcon}>🌐</span>
                  <span style={styles.deviceLabel}>DDNS Server</span>
                </div>
                <div style={styles.arrow}>→</div>
                <div style={{...styles.deviceBox, ...styles.dnsBox}}>
                  <span style={styles.deviceIcon}>📋</span>
                  <span style={styles.deviceLabel}>DNS Updated</span>
                  <span style={styles.deviceSub}>myhome → 203.0.113.77</span>
                </div>
              </div>
            </div>

            {/* Row 5: Access */}
            <div style={styles.flowStep}>
              <div style={styles.flowNumber}>5</div>
              <div style={styles.flowContent}>
                <h3 style={styles.flowTitle}>Access your home from anywhere</h3>
                <p style={styles.flowDesc}>
                  From work, a coffee shop, or your phone — just use <code style={styles.code}>myhome.dyn.devops-monk.com</code> and
                  it always reaches your home, no matter what your current IP is.
                </p>
              </div>
              <div style={styles.flowDiagram}>
                <div style={styles.deviceBox}>
                  <span style={styles.deviceIcon}>💻</span>
                  <span style={styles.deviceLabel}>You (anywhere)</span>
                </div>
                <div style={styles.arrow}>→</div>
                <div style={{...styles.deviceBox, ...styles.dnsBox}}>
                  <span style={styles.deviceIcon}>📋</span>
                  <span style={styles.deviceLabel}>DNS Lookup</span>
                  <span style={styles.deviceSub}>myhome → ?</span>
                </div>
                <div style={styles.arrow}>→</div>
                <div style={styles.deviceBox}>
                  <span style={styles.deviceIcon}>🏠</span>
                  <span style={styles.deviceLabel}>Your Home</span>
                  <span style={{...styles.deviceSub, color: '#059669'}}>Connected!</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Full Picture Diagram */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>The Full Picture</h2>
          <div style={styles.fullDiagram}>
            <div style={styles.fullRow}>
              <div style={styles.fullBox}>
                <div style={styles.fullBoxIcon}>🏠</div>
                <div style={styles.fullBoxTitle}>Your Home Network</div>
                <div style={styles.fullBoxItems}>
                  <span style={styles.fullItem}>💻 Computer</span>
                  <span style={styles.fullItem}>📱 Phone</span>
                  <span style={styles.fullItem}>🖥️ NAS / Server</span>
                  <span style={styles.fullItem}>📷 Security Camera</span>
                </div>
              </div>

              <div style={styles.fullArrowContainer}>
                <div style={styles.fullArrowLine} />
                <span style={styles.fullArrowLabel}>All share one public IP</span>
                <div style={styles.fullArrowHead}>▶</div>
              </div>

              <div style={{...styles.fullBox, borderColor: '#f59e0b'}}>
                <div style={styles.fullBoxIcon}>📡</div>
                <div style={styles.fullBoxTitle}>Your Router</div>
                <div style={styles.fullBoxItems}>
                  <span style={styles.fullItem}>Public IP: 98.51.100.42</span>
                  <span style={{...styles.fullItem, color: '#dc2626'}}>⚠️ Changes periodically</span>
                </div>
              </div>

              <div style={styles.fullArrowContainer}>
                <div style={styles.fullArrowLine} />
                <span style={styles.fullArrowLabel}>Sends IP every 5 min</span>
                <div style={styles.fullArrowHead}>▶</div>
              </div>

              <div style={{...styles.fullBox, borderColor: '#4f46e5'}}>
                <div style={styles.fullBoxIcon}>🌐</div>
                <div style={styles.fullBoxTitle}>DDNS Server</div>
                <div style={styles.fullBoxItems}>
                  <span style={styles.fullItem}>Receives IP updates</span>
                  <span style={styles.fullItem}>Updates DNS records</span>
                  <span style={styles.fullItem}>Keeps history</span>
                </div>
              </div>
            </div>

            <div style={styles.fullResultRow}>
              <div style={styles.fullResultBox}>
                <strong>Result:</strong> <code style={styles.code}>myhome.dyn.devops-monk.com</code> always points to your home —
                even when the IP changes!
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>What Can You Do With It?</h2>
          <div style={styles.useCaseGrid}>
            {[
              { icon: '🖥️', title: 'Access your home server', desc: 'Run a web server, game server, or file server at home and reach it from anywhere.' },
              { icon: '📷', title: 'View security cameras', desc: 'Check your home cameras from work or while traveling.' },
              { icon: '🗄️', title: 'Remote NAS access', desc: 'Access your Synology, QNAP, or TrueNAS files without paying for cloud storage.' },
              { icon: '🎮', title: 'Host game servers', desc: 'Run Minecraft, Valheim, or other game servers and share a stable address with friends.' },
              { icon: '🔒', title: 'Home VPN', desc: 'Connect to your home VPN (WireGuard, OpenVPN) even when your IP changes.' },
              { icon: '🏡', title: 'Smart home access', desc: 'Control Home Assistant, openHAB, or other home automation from outside your network.' },
            ].map((uc) => (
              <div key={uc.title} style={styles.useCaseCard}>
                <span style={styles.useCaseIcon}>{uc.icon}</span>
                <h3 style={styles.useCaseTitle}>{uc.title}</h3>
                <p style={styles.useCaseDesc}>{uc.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Start */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Get Started in 3 Minutes</h2>
          <div style={styles.quickSteps}>
            <div style={styles.quickStep}>
              <div style={styles.quickStepNum}>1</div>
              <div>
                <strong>Create an account</strong>
                <p style={styles.quickStepDesc}>Sign up with Google, GitHub, or email</p>
              </div>
            </div>
            <div style={styles.quickStep}>
              <div style={styles.quickStepNum}>2</div>
              <div>
                <strong>Add a subdomain</strong>
                <p style={styles.quickStepDesc}>Pick a name like "myhome" — you'll get myhome.dyn.devops-monk.com</p>
              </div>
            </div>
            <div style={styles.quickStep}>
              <div style={styles.quickStepNum}>3</div>
              <div>
                <strong>Run the update command</strong>
                <p style={styles.quickStepDesc}>Copy the curl command from your dashboard and set it up as a cron job, or use our desktop app</p>
              </div>
            </div>
          </div>
        </section>

        {/* Important Note */}
        <section style={styles.section}>
          <div style={styles.noteBox}>
            <h3 style={styles.noteTitle}>Important: Port Forwarding</h3>
            <p style={styles.noteDesc}>
              DDNS makes your home <strong>findable</strong> by giving it a stable domain name. But to make specific services
              <strong> reachable</strong>, you also need to set up <strong>port forwarding</strong> on your router.
            </p>
            <p style={styles.noteDesc}>
              For example, to access a web server at home, you'd forward port 80/443 on your router to your server's local IP.
              DDNS handles the "what address to use" part — port forwarding handles the "how to get through the router" part.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section style={styles.ctaSection}>
          {user ? (
            <>
              <h2 style={styles.ctaTitle}>Go to your dashboard</h2>
              <p style={styles.ctaDesc}>Manage your domains and set up IP updates.</p>
              <Link to="/dashboard" className="btn btn-primary btn-lg">Dashboard</Link>
            </>
          ) : (
            <>
              <h2 style={styles.ctaTitle}>Ready to try it?</h2>
              <p style={styles.ctaDesc}>It's free, takes 3 minutes, and you don't need to install anything.</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <Link to="/register" className="btn btn-primary btn-lg">Create Free Account</Link>
                <Link to="/downloads" className="btn btn-secondary btn-lg">Download App</Link>
              </div>
            </>
          )}
        </section>

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    textAlign: 'center',
    padding: '3rem 1rem 2rem',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    color: 'white',
  },
  heroTitle: { fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 800 },
  heroSub: { fontSize: '1.1rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto' },

  section: { marginBottom: '3rem' },
  sectionTitle: { fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' },
  sectionDesc: { fontSize: '1rem', color: '#475569', lineHeight: 1.7, maxWidth: '750px' },

  code: {
    background: '#eef2ff',
    color: '#4f46e5',
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    fontSize: '0.85em',
  },

  // Problem cards
  problemGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.5rem' },
  problemCard: { background: 'white', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' as const, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' },
  problemIcon: { fontSize: '2rem', marginBottom: '0.5rem' },
  problemTitle: { fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.35rem' },
  problemDesc: { fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 },

  // Flow diagram
  flowContainer: { display: 'flex', flexDirection: 'column' as const, gap: '0' },
  flowStep: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    border: '1px solid #f1f5f9',
    borderLeft: '4px solid #4f46e5',
  },
  flowNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#4f46e5',
    color: 'white',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.9rem',
    marginBottom: '0.75rem',
  },
  flowContent: { marginBottom: '1rem' },
  flowTitle: { fontSize: '1.05rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.35rem' },
  flowDesc: { fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6 },

  flowDiagram: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '1rem',
    background: '#f8fafc',
    borderRadius: '8px',
    flexWrap: 'wrap' as const,
  },
  deviceBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.75rem 1rem',
    background: 'white',
    borderRadius: '10px',
    border: '2px solid #e2e8f0',
    minWidth: '100px',
  },
  serverBox: { borderColor: '#4f46e5', background: '#eef2ff' },
  dnsBox: { borderColor: '#059669', background: '#ecfdf5' },
  deviceIcon: { fontSize: '1.5rem' },
  deviceLabel: { fontSize: '0.75rem', fontWeight: 600, color: '#1e293b' },
  deviceSub: { fontSize: '0.65rem', color: '#64748b', textAlign: 'center' as const },
  arrow: { fontSize: '1.5rem', color: '#94a3b8', fontWeight: 700 },

  // Full diagram
  fullDiagram: {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    border: '1px solid #f1f5f9',
    overflowX: 'auto' as const,
  },
  fullRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
    marginBottom: '1.5rem',
  },
  fullBox: {
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.25rem',
    textAlign: 'center' as const,
    minWidth: '160px',
    background: '#fafbfc',
  },
  fullBoxIcon: { fontSize: '2rem', marginBottom: '0.5rem' },
  fullBoxTitle: { fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' },
  fullBoxItems: { display: 'flex', flexDirection: 'column' as const, gap: '0.25rem' },
  fullItem: { fontSize: '0.75rem', color: '#64748b' },
  fullArrowContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    flexDirection: 'column' as const,
    padding: '0 0.25rem',
  },
  fullArrowLine: { width: '40px', height: '2px', background: '#cbd5e1' },
  fullArrowLabel: { fontSize: '0.6rem', color: '#94a3b8', textAlign: 'center' as const, maxWidth: '80px' },
  fullArrowHead: { color: '#cbd5e1', fontSize: '0.7rem', marginTop: '-0.25rem' },
  fullResultRow: { textAlign: 'center' as const },
  fullResultBox: {
    display: 'inline-block',
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '8px',
    padding: '1rem 1.5rem',
    fontSize: '0.9rem',
    color: '#065f46',
  },

  // Use cases
  useCaseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' },
  useCaseCard: {
    background: 'white',
    borderRadius: '10px',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    border: '1px solid #f1f5f9',
  },
  useCaseIcon: { fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' },
  useCaseTitle: { fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.35rem' },
  useCaseDesc: { fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 },

  // Quick start
  quickSteps: { display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  quickStep: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    background: 'white',
    padding: '1.25rem',
    borderRadius: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    border: '1px solid #f1f5f9',
  },
  quickStepNum: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#4f46e5',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    flexShrink: 0,
  },
  quickStepDesc: { fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem', lineHeight: 1.5 },

  // Note box
  noteBox: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderLeft: '4px solid #f59e0b',
    borderRadius: '8px',
    padding: '1.25rem 1.5rem',
  },
  noteTitle: { fontSize: '1rem', fontWeight: 600, color: '#92400e', marginBottom: '0.5rem' },
  noteDesc: { fontSize: '0.9rem', color: '#78350f', lineHeight: 1.6, marginBottom: '0.5rem' },

  // CTA
  ctaSection: { textAlign: 'center' as const, padding: '2rem 0 3rem' },
  ctaTitle: { fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' },
  ctaDesc: { fontSize: '1rem', color: '#64748b', marginBottom: '1.25rem' },
};