import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDomains, createDomain, deleteDomain } from '../api/client';
import { useAuth } from '../hooks/useAuth';

interface Domain {
  id: string;
  subdomain: string;
  current_ip: string | null;
  updated_at: string | null;
  token: string;
}

export default function DomainList() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newSub, setNewSub] = useState('');
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    getDomains().then((r) => setDomains(r.data));
  }, []);

  async function handleCreate() {
    setError('');
    try {
      const r = await createDomain(newSub);
      setDomains((prev) => [r.data, ...prev]);
      setNewSub('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create');
    }
  }

  async function handleDelete(subdomain: string) {
    if (!confirm(`Delete ${subdomain}? This cannot be undone.`)) return;
    await deleteDomain(subdomain);
    setDomains((prev) => prev.filter((d) => d.subdomain !== subdomain));
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="container">
      <header className="header">
        <h1>DDNS Dashboard</h1>
        <div className="header-right">
          <span>{user?.email}</span>
          <button onClick={handleLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </header>

      <section className="create-section">
        <h2>Add Domain</h2>
        <div className="create-row">
          <input
            value={newSub}
            onChange={(e) => setNewSub(e.target.value.toLowerCase())}
            placeholder="subdomain"
            pattern="[a-z0-9-]{3,63}"
          />
          <span className="domain-suffix">.dyn.devops-monk.com</span>
          <button onClick={handleCreate} className="btn btn-primary">
            Create
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
      </section>

      <section>
        <h2>My Domains ({domains.length})</h2>
        {domains.length === 0 ? (
          <p className="empty-state">No domains yet. Create one above.</p>
        ) : (
          <table className="domain-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Current IP</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.subdomain}>
                  <td>
                    <Link to={`/domain/${d.subdomain}`}>
                      {d.subdomain}.dyn.devops-monk.com
                    </Link>
                  </td>
                  <td>{d.current_ip || '---'}</td>
                  <td>
                    {d.updated_at
                      ? new Date(d.updated_at).toLocaleString()
                      : 'Never'}
                  </td>
                  <td>
                    <button
                      onClick={() => handleDelete(d.subdomain)}
                      className="btn btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}