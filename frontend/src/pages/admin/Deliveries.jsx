import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I } from './icons.jsx';
import { PageHead, Panel, Toolbar } from './ui.jsx';

const RUNS = [
  { ref: 'CMD-2026-00042', client: 'Camille R.', addr: '14 rue Mercière, Lyon 2e', slot: 'Aujourd\'hui 14h–17h', status: ['pending', 'À enlever'] },
  { ref: 'CMD-2026-00040', client: 'Mei L.', addr: '8 quai Saint-Vincent, Lyon 1er', slot: 'Aujourd\'hui 17h–19h', status: ['shipped', 'En tournée'] },
  { ref: 'CMD-2026-00038', client: 'Atelier Rouge Cerise', addr: '22 cours Lafayette, Lyon 3e', slot: 'Demain 9h–12h', status: ['new', 'Planifiée'] },
];

export default function Deliveries() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('Toutes');
  const [query, setQuery] = useState('');

  const FILTERS = [
    { value: 'Toutes', label: t('admin.deliveries.filterAll', 'Toutes') },
    { value: 'Planifiée', label: t('admin.deliveries.filterScheduled', 'Planifiée') },
    { value: 'À enlever', label: t('admin.deliveries.filterPickup', 'À enlever') },
    { value: 'En tournée', label: t('admin.deliveries.filterOnRoute', 'En tournée') },
  ];

  const rows = RUNS.filter(
    (r) => (filter === 'Toutes' || r.status[1] === filter)
      && `${r.ref} ${r.client} ${r.addr}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <PageHead title={t('admin.deliveries.title', 'Livraisons')} subtitle={`${RUNS.length} ${t('admin.deliveries.subtitle', 'course(s) sur la tournée en cours')}`} />

      <Panel>
        <Toolbar>
          <div className="admin-field">
            {I.search}
            <input placeholder={t('admin.deliveries.searchPlaceholder', 'Commande, client ou adresse…')} value={query}
              onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="admin-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <span className="admin-count">{rows.length} {t('admin.deliveries.runsCount', 'course(s)')}</span>
        </Toolbar>

        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.deliveries.tableOrder', 'Commande')}</th>
              <th>{t('admin.deliveries.tableAddress', 'Adresse')}</th>
              <th>{t('admin.deliveries.tableSlot', 'Créneau')}</th>
              <th>{t('admin.deliveries.tableStatus', 'Statut')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ref}>
                <td>
                  <div className="cell-main">{r.ref}</div>
                  <div className="cell-sub">{r.client}</div>
                </td>
                <td className="cell-sub">{r.addr}</td>
                <td className="cell-sub">{r.slot}</td>
                <td><span className={`status ${r.status[0]}`}>{r.status[1]}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" title={t('admin.deliveries.markDelivered', 'Marquer comme livrée')}>{I.check}</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan="5" className="admin-empty">{t('admin.deliveries.empty', 'Aucune course pour ce filtre.')}</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
