import { useState } from 'react';
import { I } from './icons.jsx';
import { PageHead, Panel, Toolbar, Pagination } from './ui.jsx';

const ORDERS = [
  { ref: 'CMD-2026-00042', client: 'Camille R.', loc: 'Lyon, FR', type: 'B2C', date: '18 juil. 2026', total: '439 €', status: ['pending', 'En préparation'] },
  { ref: 'CMD-2026-00041', client: 'Boutique Ivoire', loc: 'Bruxelles, BE', type: 'B2B', date: '17 juil. 2026', total: '1 536 €', status: ['paid', 'Payée'] },
  { ref: 'CMD-2026-00040', client: 'Mei L.', loc: 'Vancouver, CA', type: 'B2C', date: '16 juil. 2026', total: '96 €', status: ['shipped', 'Expédiée'] },
  { ref: 'CMD-2026-00039', client: 'Anaïs D.', loc: 'Bordeaux, FR', type: 'B2C', date: '15 juil. 2026', total: '212 €', status: ['new', 'Nouvelle'] },
  { ref: 'CMD-2026-00038', client: 'Atelier Rouge Cerise', loc: 'Lyon, FR', type: 'B2B', date: '14 juil. 2026', total: '864 €', status: ['paid', 'Payée'] },
  { ref: 'CMD-2026-00037', client: 'Julia K.', loc: 'Berlin, DE', type: 'B2C', date: '12 juil. 2026', total: '72 €', status: ['shipped', 'Expédiée'] },
];

const STATUSES = ['Tous', 'Nouvelle', 'Payée', 'En préparation', 'Expédiée'];

export default function Orders() {
  const [status, setStatus] = useState('Tous');
  const [query, setQuery] = useState('');

  const rows = ORDERS.filter(
    (o) => (status === 'Tous' || o.status[1] === status)
      && (o.ref + o.client).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <PageHead title="Gestion des commandes" subtitle={`${ORDERS.length} commandes sur la période`}>
        <button className="btn-admin ghost">{I.pdf}Exporter</button>
      </PageHead>

      <Panel>
        <Toolbar>
          <div className="admin-field">
            {I.search}
            <input placeholder="Référence ou client…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <span className="admin-count">{rows.length} résultat(s)</span>
        </Toolbar>

        <table className="admin-table">
          <thead>
            <tr><th>Référence</th><th>Client</th><th>Type</th><th>Date</th><th>Total</th><th>Statut</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.ref}>
                <td className="cell-main">{o.ref}</td>
                <td>{o.client} <span className="cell-sub">— {o.loc}</span></td>
                <td><span className={`tag-pill ${o.type === 'B2B' ? 'tier-2' : 'tier-1'}`}>{o.type}</span></td>
                <td className="cell-sub">{o.date}</td>
                <td>{o.total}</td>
                <td><span className={`status ${o.status[0]}`}>{o.status[1]}</span></td>
                <td>
                  <div className="row-actions">
                    <span className="icon-btn" title="Voir le détail">{I.eye}</span>
                    <span className="icon-btn" title="Facture PDF">{I.pdf}</span>
                    <span className="icon-btn approve" title="Marquer expédiée">{I.truck}</span>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan="7" className="admin-empty">Aucune commande pour ce filtre.</td></tr>
            )}
          </tbody>
        </table>
        <Pagination pages={4} current={1} />
      </Panel>
    </>
  );
}
