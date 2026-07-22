import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { I } from './icons.jsx';
import { PageHead, Panel, Toolbar } from './ui.jsx';

const STATUS_PILL = {
  APPROVED: ['status paid', 'Validé'],
  PENDING: ['status pending', 'En attente'],
  REJECTED: ['status new', 'Refusé'],
};

export default function ProAccounts() {
  const [rows, setRows] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [filter, setFilter] = useState('');
  const [type, setType] = useState('WHOLESALE');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [customers, t] = await Promise.all([
        api.adminCustomers({ account_type: type || undefined, status: filter || undefined }),
        api.adminPriceTiers(),
      ]);
      setRows(customers.results || customers);
      setTiers(t.results || t);
    } catch (e) {
      setError(e.status === 403 ? "Accès refusé : ce compte n'est pas administrateur."
        : "Impossible de charger les comptes pro (le backend est-il démarré ?)");
    } finally {
      setLoading(false);
    }
  }, [filter, type]);

  useEffect(() => { load(); }, [load]);

  // Remplace la ligne par la version renvoyée par le serveur (source de vérité).
  const replace = (updated) => setRows((list) => list.map((r) => (r.id === updated.id ? updated : r)));

  const act = async (id, fn) => {
    setBusyId(id);
    setError('');
    try {
      replace(await fn());
    } catch (e) {
      setError(e.data?.price_tier?.[0] || "L'opération a échoué.");
    } finally {
      setBusyId(null);
    }
  };

  const pending = rows.filter((r) => r.status === 'PENDING').length;

  return (
    <>
      <PageHead
        title="Comptes clients & accès grossiste"
        subtitle={`${rows.length} compte(s) — ${pending} en attente`}
      >
        <button className="btn-admin ghost" onClick={load}>{I.check}Actualiser</button>
      </PageHead>

      <Panel>
        <Toolbar>
          <select className="admin-select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Tous les comptes</option>
            <option value="RETAIL">Détail (B2C)</option>
            <option value="WHOLESALE">Grossistes (B2B)</option>
          </select>
          <select className="admin-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="PENDING">En attente</option>
            <option value="APPROVED">Validés</option>
            <option value="REJECTED">Refusés</option>
          </select>
          <span className="admin-count">{rows.length} compte(s)</span>
        </Toolbar>

        {error && <p className="admin-login-error">{error}</p>}

        <table className="admin-table">
          <thead>
            <tr>
              <th>Compte</th><th>Type</th><th>Pays</th>
              <th>Palier tarifaire</th><th>Statut</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={busyId === r.id ? { opacity: 0.5 } : undefined}>
                <td>
                  <div className="cell-main">{r.company_name || r.full_name}</div>
                  <div className="cell-sub">{r.email}</div>
                </td>
                <td>
                  <span className={`tag-pill ${r.account_type === 'WHOLESALE' ? 'tier-2' : 'tier-1'}`}>
                    {r.account_type_display}
                  </span>
                </td>
                <td className="cell-sub">{r.country || '—'}</td>
                <td>
                  <select
                    className="admin-select"
                    value={r.price_tier || ''}
                    disabled={busyId === r.id || r.account_type !== 'WHOLESALE'}
                    onChange={(e) => act(r.id, () => api.adminSetTier(r.id, e.target.value || null))}
                  >
                    <option value="">— Aucun —</option>
                    {tiers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (-{parseFloat(t.discount_percent)} %)
                      </option>
                    ))}
                  </select>
                </td>
                <td><span className={STATUS_PILL[r.status][0]}>{STATUS_PILL[r.status][1]}</span></td>
                <td>
                  <div className="row-actions">
                    {r.account_type === 'RETAIL' ? (
                      <button className="btn-admin primary" style={{ padding: '6px 12px', fontSize: 12 }}
                        disabled={busyId === r.id}
                        onClick={() => act(r.id, () => api.adminToWholesale(r.id, null))}>
                        {I.store}Activer grossiste
                      </button>
                    ) : (
                      <>
                        {r.status !== 'APPROVED' && (
                          <span className="icon-btn approve" title="Valider"
                            onClick={() => act(r.id, () => api.adminApprove(r.id))}>{I.check}</span>
                        )}
                        <button className="btn-admin ghost" style={{ padding: '6px 12px', fontSize: 12 }}
                          disabled={busyId === r.id}
                          onClick={() => act(r.id, () => api.adminToRetail(r.id))}>
                          Repasser en détail
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && !error && (
              <tr><td colSpan="6" className="admin-empty">Aucun compte professionnel pour ce filtre.</td></tr>
            )}
            {loading && <tr><td colSpan="6" className="admin-empty">Chargement…</td></tr>}
          </tbody>
        </table>

        <p className="cell-sub" style={{ marginTop: 14, lineHeight: 1.6 }}>
          Tout compte est créé en <strong>détail</strong>. « Activer grossiste » est le seul chemin
          vers le tarif de gros — un client ne peut jamais se l'attribuer lui-même.
          Le palier applique une remise supplémentaire sur ce tarif.
        </p>
      </Panel>
    </>
  );
}
