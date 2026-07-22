import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { PageHead, Panel, Toolbar } from './ui.jsx';
import { I } from './icons.jsx';

export default function Customers() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.adminCustomers({ account_type: 'RETAIL' })
      .then((d) => { if (alive) setRows(d.results || d); })
      .catch((e) => {
        if (alive) setError(e.status === 403 ? 'Accès réservé aux administrateurs.' : 'Chargement impossible.');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = rows.filter((r) =>
    `${r.full_name} ${r.email}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <PageHead title="Clients particuliers" subtitle={`${rows.length} compte(s) de détail (B2C)`} />

      <Panel>
        <Toolbar>
          <div className="admin-field">
            {I.search}
            <input placeholder="Nom ou e-mail…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <span className="admin-count">{filtered.length} résultat(s)</span>
        </Toolbar>

        {error && <p className="admin-login-error">{error}</p>}

        <table className="admin-table">
          <thead><tr><th>Client</th><th>Pays</th><th>Inscrit le</th><th>Type</th></tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="cell-main">{r.full_name}</div>
                  <div className="cell-sub">{r.email}</div>
                </td>
                <td className="cell-sub">{r.country || '—'}</td>
                <td className="cell-sub">{new Date(r.created_at).toLocaleDateString('fr-FR')}</td>
                <td><span className="tag-pill tier-1">Particulier</span></td>
              </tr>
            ))}
            {loading && <tr><td colSpan="4" className="admin-empty">Chargement…</td></tr>}
            {!loading && filtered.length === 0 && !error && (
              <tr><td colSpan="4" className="admin-empty">Aucun client pour cette recherche.</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
