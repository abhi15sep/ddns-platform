import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggleButton } from '../App';

export default function HowItWorksPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

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
            <Link to="/how-it-works" className="navbar-link active">
              How It Works
            </Link>
            <Link to="/downloads" className="navbar-link">
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
                  <span style={{...styles.deviceSub, color: 'var(--badge-never-text)'}}>New IP: 203.0.113.77</span>
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
                  <span style={{...styles.deviceSub, color: 'var(--badge-active-text)'}}>Connected!</span>
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

        {/* Port Forwarding Explained */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>One More Thing: Port Forwarding</h2>
          <p style={styles.sectionDesc}>
            DDNS solves <strong>half</strong> the problem — it gives your home a stable address.
            But there's a second piece: <strong>port forwarding</strong>. Here's why you need both:
          </p>

          {/* DDNS vs Port Forwarding SVG */}
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', marginTop: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflowX: 'auto' }}>
            <svg viewBox="0 0 800 260" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', display: 'block' }}>
              <defs>
                <marker id="pfArrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#4f46e5" />
                </marker>
                <marker id="pfArrowGreen" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#059669" />
                </marker>
              </defs>

              {/* Labels */}
              <text x="400" y="24" textAnchor="middle" fill="#1e293b" fontSize="14" fontWeight="700" fontFamily="system-ui">What each piece does</text>

              {/* DDNS Row */}
              <rect x="20" y="40" width="760" height="90" rx="10" fill="#eef2ff" stroke="#c7d2fe" strokeWidth="1.5" />
              <text x="40" y="62" fill="#4338ca" fontSize="11" fontWeight="700" fontFamily="system-ui">DDNS (what we provide)</text>
              <text x="40" y="80" fill="#4338ca" fontSize="11" fontFamily="system-ui">Translates a name into your current IP</text>

              <rect x="50" y="92" width="200" height="28" rx="6" fill="white" stroke="#c7d2fe" strokeWidth="1" />
              <text x="150" y="111" textAnchor="middle" fill="#4338ca" fontSize="11" fontWeight="600" fontFamily="monospace">myhome.dyn.devops-monk.com</text>

              <line x1="260" y1="106" x2="340" y2="106" stroke="#4f46e5" strokeWidth="2" markerEnd="url(#pfArrow)" />
              <text x="300" y="98" textAnchor="middle" fill="#4f46e5" fontSize="9" fontFamily="system-ui">resolves to</text>

              <rect x="350" y="92" width="160" height="28" rx="6" fill="white" stroke="#c7d2fe" strokeWidth="1" />
              <text x="430" y="111" textAnchor="middle" fill="#4338ca" fontSize="12" fontWeight="600" fontFamily="monospace">98.51.100.42</text>

              <text x="540" y="111" fill="#64748b" fontSize="11" fontFamily="system-ui">← Your router's public IP</text>

              {/* Port Forwarding Row */}
              <rect x="20" y="145" width="760" height="100" rx="10" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1.5" />
              <text x="40" y="167" fill="#047857" fontSize="11" fontWeight="700" fontFamily="system-ui">Port Forwarding (you set up on your router)</text>
              <text x="40" y="185" fill="#047857" fontSize="11" fontFamily="system-ui">Routes incoming traffic to the right device on your local network</text>

              <rect x="50" y="197" width="160" height="28" rx="6" fill="white" stroke="#a7f3d0" strokeWidth="1" />
              <text x="130" y="216" textAnchor="middle" fill="#047857" fontSize="11" fontWeight="600" fontFamily="system-ui">Incoming on port 443</text>

              <line x1="220" y1="211" x2="300" y2="211" stroke="#059669" strokeWidth="2" markerEnd="url(#pfArrowGreen)" />
              <text x="260" y="203" textAnchor="middle" fill="#059669" fontSize="9" fontFamily="system-ui">forward to</text>

              <rect x="310" y="197" width="200" height="28" rx="6" fill="white" stroke="#a7f3d0" strokeWidth="1" />
              <text x="410" y="216" textAnchor="middle" fill="#047857" fontSize="11" fontWeight="600" fontFamily="monospace">192.168.1.50:443</text>

              <text x="540" y="216" fill="#64748b" fontSize="11" fontFamily="system-ui">← Your server's local IP</text>
            </svg>
          </div>

          {/* Analogy */}
          <div style={{ ...styles.noteBox, marginTop: '1.5rem' }}>
            <h3 style={styles.noteTitle}>Think of it like a building</h3>
            <p style={styles.noteDesc}>
              <strong>DDNS</strong> is like giving your building a street address — people can find your building.
            </p>
            <p style={styles.noteDesc}>
              <strong>Port forwarding</strong> is like the lobby directory — it tells visitors which floor and room to go to
              once they're inside the building.
            </p>
            <p style={{ ...styles.noteDesc, marginBottom: 0 }}>
              Without DDNS, nobody can find your building. Without port forwarding, they find the building but can't get to the right room.
              <strong> You need both.</strong>
            </p>
          </div>

          {/* Common Ports Table */}
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '0.75rem' }}>Common ports to forward</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="domain-table" style={{ minWidth: '500px' }}>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Port</th>
                    <th>What it's for</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Web Server', '80 / 443', 'Hosting a website or web app from home'],
                    ['SSH', '22', 'Remote terminal access to a Linux machine'],
                    ['Minecraft', '25565', 'Hosting a Minecraft server for friends'],
                    ['Plex / Jellyfin', '32400 / 8096', 'Streaming your media library remotely'],
                    ['Home Assistant', '8123', 'Accessing smart home dashboard'],
                    ['WireGuard VPN', '51820 (UDP)', 'Connecting securely to your home network'],
                    ['Synology DSM', '5000 / 5001', 'Accessing your NAS admin panel'],
                  ].map(([service, port, desc]) => (
                    <tr key={service}>
                      <td><strong>{service}</strong></td>
                      <td><code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{port}</code></td>
                      <td>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* How to set up port forwarding */}
          <div style={{ marginTop: '1.5rem', background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>How to set up port forwarding</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
              Every router is different, but the general steps are:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { num: '1', text: 'Log into your router (usually 192.168.1.1 or 192.168.0.1 in your browser)' },
                { num: '2', text: 'Find the "Port Forwarding", "NAT", or "Virtual Servers" section' },
                { num: '3', text: 'Add a rule: external port → internal IP + internal port' },
                { num: '4', text: 'Save and test from outside your network (e.g. using mobile data)' },
              ].map((step) => (
                <div key={step.num} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>{step.num}</span>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.text}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '1rem' }}>
              Need help finding the port forwarding page on your specific router?{' '}
              <a href="https://portforward.com/router.htm" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-text)', fontWeight: 600 }}>
                portforward.com
              </a>{' '}
              has step-by-step guides with screenshots for <strong>hundreds of router models</strong> — just find your brand and model.
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
  sectionTitle: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.75rem' },
  sectionDesc: { fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '750px' },

  code: {
    background: 'var(--accent-bg)',
    color: 'var(--accent-text)',
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    fontSize: '0.85em',
  },

  // Flow diagram
  flowContainer: { display: 'flex', flexDirection: 'column' as const, gap: '0' },
  flowStep: {
    background: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1rem',
    boxShadow: '0 1px 3px var(--shadow-sm)',
    border: '1px solid var(--border-light)',
    borderLeft: '4px solid var(--accent)',
    transition: 'background 0.2s, border-color 0.2s',
  },
  flowNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--accent)',
    color: 'white',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.9rem',
    marginBottom: '0.75rem',
  },
  flowContent: { marginBottom: '1rem' },
  flowTitle: { fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '0.35rem' },
  flowDesc: { fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 },

  flowDiagram: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '1rem',
    background: 'var(--bg-secondary)',
    borderRadius: '8px',
    flexWrap: 'wrap' as const,
  },
  deviceBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.75rem 1rem',
    background: 'var(--bg-card)',
    borderRadius: '10px',
    border: '2px solid var(--border-default)',
    minWidth: '100px',
    transition: 'background 0.2s, border-color 0.2s',
  },
  serverBox: { borderColor: 'var(--accent)', background: 'var(--accent-bg)' },
  dnsBox: { borderColor: '#059669', background: 'var(--badge-active-bg)' },
  deviceIcon: { fontSize: '1.5rem' },
  deviceLabel: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-heading)' },
  deviceSub: { fontSize: '0.65rem', color: 'var(--text-secondary)', textAlign: 'center' as const },
  arrow: { fontSize: '1.5rem', color: 'var(--text-muted)', fontWeight: 700 },

  // Use cases
  useCaseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' },
  useCaseCard: {
    background: 'var(--bg-card)',
    borderRadius: '10px',
    padding: '1.25rem',
    boxShadow: '0 1px 3px var(--shadow-sm)',
    border: '1px solid var(--border-light)',
    transition: 'background 0.2s, border-color 0.2s',
  },
  useCaseIcon: { fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block' },
  useCaseTitle: { fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-heading)', marginBottom: '0.35rem' },
  useCaseDesc: { fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 },

  // Quick start
  quickSteps: { display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  quickStep: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    background: 'var(--bg-card)',
    padding: '1.25rem',
    borderRadius: '10px',
    boxShadow: '0 1px 3px var(--shadow-sm)',
    border: '1px solid var(--border-light)',
    transition: 'background 0.2s, border-color 0.2s',
  },
  quickStepNum: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'var(--accent)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    flexShrink: 0,
  },
  quickStepDesc: { fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.5 },

  // Note box
  noteBox: {
    background: 'var(--badge-stale-bg)',
    border: '1px solid var(--badge-stale-text)',
    borderLeft: '4px solid var(--badge-stale-text)',
    borderRadius: '8px',
    padding: '1.25rem 1.5rem',
  },
  noteTitle: { fontSize: '1rem', fontWeight: 600, color: 'var(--badge-stale-text)', marginBottom: '0.5rem' },
  noteDesc: { fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.5rem' },

  // CTA
  ctaSection: { textAlign: 'center' as const, padding: '2rem 0 3rem' },
  ctaTitle: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' },
  ctaDesc: { fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' },
};