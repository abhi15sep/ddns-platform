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

          {/* Problem SVG */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', marginTop: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflowX: 'auto' }}>
            <svg viewBox="0 0 800 180" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', display: 'block' }}>
              {/* Monday */}
              <rect x="10" y="20" width="220" height="140" rx="12" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="2" />
              <text x="120" y="50" textAnchor="middle" fill="#065f46" fontSize="13" fontWeight="700" fontFamily="system-ui">Monday</text>
              <text x="120" y="85" textAnchor="middle" fontSize="28">🏠</text>
              <rect x="40" y="102" width="160" height="26" rx="6" fill="#d1fae5" />
              <text x="120" y="120" textAnchor="middle" fill="#047857" fontSize="12" fontWeight="600" fontFamily="monospace">IP: 98.51.100.42</text>
              <text x="120" y="148" textAnchor="middle" fill="#059669" fontSize="11" fontFamily="system-ui">✓ Everything works!</text>

              {/* Arrow 1 */}
              <text x="262" y="95" fill="#f59e0b" fontSize="24" fontWeight="700">→</text>
              <text x="257" y="115" fill="#b45309" fontSize="9" fontFamily="system-ui">ISP changes</text>
              <text x="257" y="126" fill="#b45309" fontSize="9" fontFamily="system-ui">your IP...</text>

              {/* Wednesday */}
              <rect x="300" y="20" width="220" height="140" rx="12" fill="#fffbeb" stroke="#fde68a" strokeWidth="2" />
              <text x="410" y="50" textAnchor="middle" fill="#92400e" fontSize="13" fontWeight="700" fontFamily="system-ui">Wednesday</text>
              <text x="410" y="85" textAnchor="middle" fontSize="28">🔄</text>
              <rect x="330" y="102" width="160" height="26" rx="6" fill="#fef3c7" />
              <text x="410" y="120" textAnchor="middle" fill="#b45309" fontSize="12" fontWeight="600" fontFamily="monospace">IP: 203.0.113.77</text>
              <text x="410" y="148" textAnchor="middle" fill="#d97706" fontSize="11" fontFamily="system-ui">⚠ IP has changed!</text>

              {/* Arrow 2 */}
              <text x="552" y="95" fill="#dc2626" fontSize="24" fontWeight="700">→</text>
              <text x="547" y="115" fill="#991b1b" fontSize="9" fontFamily="system-ui">You try the</text>
              <text x="547" y="126" fill="#991b1b" fontSize="9" fontFamily="system-ui">old IP...</text>

              {/* Result */}
              <rect x="590" y="20" width="200" height="140" rx="12" fill="#fef2f2" stroke="#fecaca" strokeWidth="2" />
              <text x="690" y="50" textAnchor="middle" fill="#991b1b" fontSize="13" fontWeight="700" fontFamily="system-ui">Result</text>
              <text x="690" y="90" textAnchor="middle" fontSize="36">❌</text>
              <text x="690" y="120" textAnchor="middle" fill="#dc2626" fontSize="12" fontWeight="600" fontFamily="system-ui">Connection failed!</text>
              <text x="690" y="140" textAnchor="middle" fill="#991b1b" fontSize="10" fontFamily="system-ui">Old IP no longer works</text>
            </svg>
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

        {/* Full Architecture SVG Diagram */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>The Full Picture</h2>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflowX: 'auto' }}>
            <svg viewBox="0 0 900 420" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'block' }}>
              <defs>
                <marker id="arrowBlue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#4f46e5" />
                </marker>
                <marker id="arrowGreen" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#059669" />
                </marker>
                <marker id="arrowOrange" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
                </marker>
                <filter id="shadow" x="-4%" y="-4%" width="108%" height="108%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
                </filter>
              </defs>

              {/* Home Network Box */}
              <rect x="20" y="30" width="200" height="200" rx="14" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" filter="url(#shadow)" />
              <rect x="20" y="30" width="200" height="36" rx="14" fill="#1e293b" />
              <rect x="20" y="52" width="200" height="14" fill="#1e293b" />
              <text x="120" y="54" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" fontFamily="system-ui">Your Home Network</text>
              {/* Devices */}
              <rect x="40" y="80" width="160" height="32" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" />
              <text x="55" y="100" fontSize="14">💻</text>
              <text x="75" y="101" fill="#475569" fontSize="12" fontFamily="system-ui">Computer</text>
              <rect x="40" y="120" width="160" height="32" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" />
              <text x="55" y="140" fontSize="14">🖥️</text>
              <text x="75" y="141" fill="#475569" fontSize="12" fontFamily="system-ui">NAS / Server</text>
              <rect x="40" y="160" width="160" height="32" rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" />
              <text x="55" y="180" fontSize="14">📷</text>
              <text x="75" y="181" fill="#475569" fontSize="12" fontFamily="system-ui">Security Camera</text>

              {/* Arrow: Home → Router */}
              <line x1="220" y1="130" x2="280" y2="130" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6,3" markerEnd="url(#arrowBlue)" />
              <text x="250" y="118" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="system-ui">LAN</text>

              {/* Router */}
              <rect x="290" y="70" width="140" height="120" rx="14" fill="#fffbeb" stroke="#f59e0b" strokeWidth="2.5" filter="url(#shadow)" />
              <text x="360" y="108" textAnchor="middle" fontSize="32">📡</text>
              <text x="360" y="132" textAnchor="middle" fill="#92400e" fontSize="13" fontWeight="700" fontFamily="system-ui">Your Router</text>
              <text x="360" y="150" textAnchor="middle" fill="#b45309" fontSize="10" fontFamily="monospace">IP: 98.51.100.42</text>
              <text x="360" y="166" textAnchor="middle" fill="#dc2626" fontSize="9" fontFamily="system-ui">⚠ Changes periodically</text>

              {/* Arrow: Router → DDNS Server */}
              <line x1="430" y1="115" x2="510" y2="115" stroke="#4f46e5" strokeWidth="2.5" markerEnd="url(#arrowBlue)" />
              <text x="470" y="105" textAnchor="middle" fill="#4f46e5" fontSize="9" fontWeight="600" fontFamily="system-ui">curl update</text>
              <text x="470" y="132" textAnchor="middle" fill="#4f46e5" fontSize="8" fontFamily="system-ui">every 5 min</text>

              {/* DDNS Server */}
              <rect x="520" y="50" width="160" height="140" rx="14" fill="#eef2ff" stroke="#4f46e5" strokeWidth="2.5" filter="url(#shadow)" />
              <text x="600" y="88" textAnchor="middle" fontSize="28">🌐</text>
              <text x="600" y="112" textAnchor="middle" fill="#312e81" fontSize="13" fontWeight="700" fontFamily="system-ui">DDNS Server</text>
              <text x="600" y="130" textAnchor="middle" fill="#4338ca" fontSize="10" fontFamily="system-ui">Receives IP updates</text>
              <text x="600" y="145" textAnchor="middle" fill="#4338ca" fontSize="10" fontFamily="system-ui">Updates DNS records</text>
              <text x="600" y="160" textAnchor="middle" fill="#4338ca" fontSize="10" fontFamily="system-ui">Keeps history</text>

              {/* Arrow: DDNS → DNS */}
              <line x1="680" y1="120" x2="750" y2="120" stroke="#059669" strokeWidth="2.5" markerEnd="url(#arrowGreen)" />
              <text x="715" y="108" textAnchor="middle" fill="#059669" fontSize="9" fontWeight="600" fontFamily="system-ui">updates</text>

              {/* DNS System */}
              <rect x="760" y="70" width="120" height="100" rx="14" fill="#ecfdf5" stroke="#059669" strokeWidth="2.5" filter="url(#shadow)" />
              <text x="820" y="102" textAnchor="middle" fontSize="24">📋</text>
              <text x="820" y="122" textAnchor="middle" fill="#064e3b" fontSize="12" fontWeight="700" fontFamily="system-ui">DNS System</text>
              <text x="820" y="140" textAnchor="middle" fill="#047857" fontSize="9" fontFamily="monospace">myhome → IP</text>
              <text x="820" y="155" textAnchor="middle" fill="#047857" fontSize="9" fontFamily="system-ui">Always current</text>

              {/* Remote User at bottom */}
              <rect x="520" y="280" width="160" height="100" rx="14" fill="#faf5ff" stroke="#7c3aed" strokeWidth="2.5" filter="url(#shadow)" />
              <text x="600" y="318" textAnchor="middle" fontSize="28">💻</text>
              <text x="600" y="342" textAnchor="middle" fill="#4c1d95" fontSize="13" fontWeight="700" fontFamily="system-ui">You (Remote)</text>
              <text x="600" y="358" textAnchor="middle" fill="#6d28d9" fontSize="10" fontFamily="system-ui">From work, cafe, phone</text>

              {/* Arrow: Remote → DNS */}
              <path d="M 680 310 Q 820 310 820 175" fill="none" stroke="#7c3aed" strokeWidth="2" strokeDasharray="6,3" markerEnd="url(#arrowGreen)" />
              <text x="770" y="268" fill="#7c3aed" fontSize="9" fontWeight="600" fontFamily="system-ui" transform="rotate(-40 770 268)">DNS lookup</text>

              {/* Arrow: DNS → Home (curved) */}
              <path d="M 760 145 Q 500 300 220 200" fill="none" stroke="#059669" strokeWidth="2.5" markerEnd="url(#arrowGreen)" />
              <text x="470" y="265" textAnchor="middle" fill="#059669" fontSize="10" fontWeight="600" fontFamily="system-ui">Resolves to your home IP</text>

              {/* Result banner */}
              <rect x="180" y="380" width="540" height="36" rx="18" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1.5" />
              <text x="450" y="403" textAnchor="middle" fill="#065f46" fontSize="12" fontWeight="600" fontFamily="system-ui">
                Result: myhome.dyn.devops-monk.com always reaches your home!
              </text>
            </svg>
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