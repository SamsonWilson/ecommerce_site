import { Fragment, useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { I } from './icons.jsx';
import { PageHead, Panel, Toolbar } from './ui.jsx';

const STATUS_PILL = {
  NEW: ['status new', 'Nouveau'],
  IN_REVIEW: ['status pending', 'En étude'],
  QUOTED: ['status shipped', 'Chiffré'],
  ACCEPTED: ['status paid', 'Accepté'],
  DECLINED: ['status new', 'Refusé'],
};
const FLOW = ['NEW', 'IN_REVIEW', 'QUOTED', 'ACCEPTED', 'DECLINED'];

export default function Quotes() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null); // devis déplié

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await api.adminQuotes({ status: filter || undefined });
      setRows(d.results || d);
    } catch (e) {
      setError(e.status === 403 ? 'Accès réservé aux administrateurs.' : 'Chargement impossible.');
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const patch = async (id, body) => {
    setError('');
    try {
      const updated = await api.adminUpdateQuote(id, body);
      setRows((list) => list.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      setError(e.data?.quoted_total?.[0] || "La mise à jour a échoué.");
    }
  };

  const pending = rows.filter((r) => ['NEW', 'IN_REVIEW'].includes(r.status)).length;

  return (
    <>
      <PageHead title="Devis B2B" subtitle={`${rows.length} demande(s) — ${pending} à traiter · objectif de réponse 24h`}>
        <button className="btn-admin ghost" onClick={load}>{I.check}Actualiser</button>
      </PageHead>

      <Panel>
        <Toolbar>
          <select className="admin-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Tous les statuts</option>
            {FLOW.map((s) => <option key={s} value={s}>{STATUS_PILL[s][1]}</option>)}
          </select>
          <span className="admin-count">{rows.length} devis</span>
        </Toolbar>

        {error && <p className="admin-login-error">{error}</p>}

        <table className="admin-table">
          <thead>
            <tr>
              <th>Référence</th><th>Société</th><th>Lignes</th>
              <th>Montant chiffré</th><th>Validité</th><th>Statut</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((q) => (
              <Fragment key={q.id}>
                <tr>
                  <td>
                    <div className="cell-main">{q.reference}</div>
                    <div className="cell-sub">{new Date(q.created_at).toLocaleDateString('fr-FR')}</div>
                  </td>
                  <td>
                    <div className="cell-main">{q.company || '—'}</div>
                    <div className="cell-sub">{q.contact_email}{q.country ? ` · ${q.country}` : ''}</div>
                  </td>
                  <td>{q.items_count}</td>
                  <td>
                    <input
                      className="admin-select" style={{ width: 110 }}
                      type="number" step="0.01" min="0"
                      defaultValue={q.quoted_total || ''}
                      placeholder="—"
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v && v !== q.quoted_total) patch(q.id, { quoted_total: v });
                      }}
                    /> €
                  </td>
                  <td>
                    <input
                      className="admin-select" style={{ width: 140 }}
                      type="date"
                      defaultValue={q.valid_until || ''}
                      onBlur={(e) => { if (e.target.value !== q.valid_until) patch(q.id, { valid_until: e.target.value }); }}
                    />
                  </td>
                  <td>
                    <select
                      className="admin-select"
                      value={q.status}
                      onChange={(e) => patch(q.id, { status: e.target.value })}
                    >
                      {FLOW.map((s) => <option key={s} value={s}>{STATUS_PILL[s][1]}</option>)}
                    </select>
                  </td>
                  <td>
                    <div className="row-actions">
                      <span className="icon-btn" title="Voir le détail"
                        onClick={() => setOpen(open === q.id ? null : q.id)}>{I.eye}</span>
                      <span className="icon-btn" title="PDF (à venir)">{I.pdf}</span>
                    </div>
                  </td>
                </tr>
                {open === q.id && (
                  <tr>
                    <td colSpan="7" style={{ background: '#FAFBFC' }}>
                      <strong style={{ fontSize: 12.5 }}>Lignes demandées</strong>
                      {q.items.length === 0 ? (
                        <p className="cell-sub" style={{ marginTop: 6 }}>Demande libre, sans référence précise.</p>
                      ) : (
                        <ul style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {q.items.map((it) => (
                            <li key={it.id} className="cell-sub">
                              <strong>{it.product_name}</strong> — {it.sku} × <strong>{it.quantity}</strong>
                              {it.proposed_unit_price ? ` → ${it.proposed_unit_price} €/u` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                      {q.message && (
                        <p className="cell-sub" style={{ marginTop: 10, fontStyle: 'italic' }}>« {q.message} »</p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {loading && <tr><td colSpan="7" className="admin-empty">Chargement…</td></tr>}
            {!loading && rows.length === 0 && !error && (
              <tr><td colSpan="7" className="admin-empty">Aucun devis pour ce filtre.</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
