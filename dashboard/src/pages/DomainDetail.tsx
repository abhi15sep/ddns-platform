import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getDomains,
  getDomainHistory,
  regenerateToken,
} from '../api/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

interface Domain {
  id: string;
  subdomain: string;
  current_ip: string | null;
  updated_at: string | null;
  token: string;
}

interface HistoryEntry {
  ip: string;
  source_ip: string;
  user_agent: string;
  updated_at: string;
}

export default function DomainDetail() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const [domain, setDomain] = useState<Domain | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (!subdomain) return;
    getDomains().then((r) =>
      setDomain(r.data.find((d: Domain) => d.subdomain === subdomain) || null)
    );
    getDomainHistory(subdomain).then((r) =>
      setHistory([...r.data].reverse())
    );
  }, [subdomain]);

  async function handleRegenerate() {
    if (!subdomain) return;
    if (!confirm('Regenerate token? Your existing update scripts will stop working.'))
      return;
    const r = await regenerateToken(subdomain);
    setDomain(r.data);
  }

  function copyUpdateURL() {
    if (!domain) return;
    const url = `https://api.devops-monk.com/update?domain=${subdomain}&token=${domain.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!domain) return <div className="container"><p>Loading...</p></div>;

  const updateURL = `https://api.devops-monk.com/update?domain=${subdomain}&token=${domain.token}`;
  const maskedToken = domain.token.slice(0, 8) + '...' + domain.token.slice(-4);

  // Assign numeric index to each unique IP for charting
  const uniqueIPs = [...new Set(history.map((h) => h.ip))];
  const chartData = history.map((h) => ({
    ...h,
    ipIndex: uniqueIPs.indexOf(h.ip),
    label: h.ip,
    time: new Date(h.updated_at).toLocaleString(),
  }));

  return (
    <div className="container">
      <Link to="/dashboard" className="back-link">Back to domains</Link>

      <h1>{subdomain}.dyn.devops-monk.com</h1>

      <div className="info-grid">
        <div className="info-card">
          <h3>Current IP</h3>
          <p className="info-value">{domain.current_ip || 'Not yet updated'}</p>
        </div>
        <div className="info-card">
          <h3>Last Updated</h3>
          <p className="info-value">
            {domain.updated_at
              ? new Date(domain.updated_at).toLocaleString()
              : 'Never'}
          </p>
        </div>
        <div className="info-card">
          <h3>Token</h3>
          <p className="info-value">
            <code>{showToken ? domain.token : maskedToken}</code>
            <button
              onClick={() => setShowToken(!showToken)}
              className="btn btn-sm btn-secondary"
            >
              {showToken ? 'Hide' : 'Show'}
            </button>
          </p>
          <button onClick={handleRegenerate} className="btn btn-sm btn-danger">
            Regenerate Token
          </button>
        </div>
      </div>

      <section className="update-url-section">
        <h2>Update URL</h2>
        <div className="code-block">
          <code>{updateURL}</code>
          <button onClick={copyUpdateURL} className="btn btn-sm btn-primary">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <h3>cURL Example</h3>
        <pre className="code-block">{`curl "${updateURL}"`}</pre>

        <h3>Cron Job (every 5 min)</h3>
        <pre className="code-block">{`*/5 * * * * curl -s "${updateURL}" > /dev/null`}</pre>

        <h3>Desktop App</h3>
        <p>
          Download the DDNS Desktop Client for automatic IP updates without any
          terminal knowledge. Paste the token above into the app setup wizard.
        </p>
      </section>

      <section>
        <h2>IP History ({history.length} updates)</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="updated_at"
                tickFormatter={(v) => new Date(v).toLocaleDateString()}
              />
              <YAxis hide />
              <Tooltip
                labelFormatter={(v) => new Date(v as string).toLocaleString()}
                formatter={(value: number) => [uniqueIPs[value], 'IP']}
              />
              <Line type="stepAfter" dataKey="ipIndex" dot stroke="#4f46e5" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="empty-state">No updates yet.</p>
        )}

        {history.length > 0 && (
          <table className="domain-table">
            <thead>
              <tr>
                <th>IP</th>
                <th>Source</th>
                <th>Client</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((h, i) => (
                <tr key={i}>
                  <td>{h.ip}</td>
                  <td>{h.source_ip || '---'}</td>
                  <td>{h.user_agent || '---'}</td>
                  <td>{new Date(h.updated_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
