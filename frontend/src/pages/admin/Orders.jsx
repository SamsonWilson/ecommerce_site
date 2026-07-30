import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

export default function Orders() {
  const { t } = useTranslation();
  const [status, setStatus] = useState('Tous');
  const [query, setQuery] = useState('');

  const STATUSES = [
    { value: 'Tous', label: t('admin.orders.statusAll', 'Tous') },
    { value: 'Nouvelle', label: t('admin.orders.statusNew', 'Nouvelle') },
    { value: 'Payée', label: t('admin.orders.statusPaid', 'Payée') },
    { value: 'En préparation', label: t('admin.orders.statusPending', 'En préparation') },
    { value: 'Expédiée', label: t('admin.orders.statusShipped', 'Expédiée') },
  ];

  const rows = ORDERS.filter(
    (o) => (status === 'Tous' || o.status[1] === status)
      && (o.ref + o.client).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <PageHead title={t('admin.orders.title', 'Gestion des commandes')} subtitle={`${ORDERS.length} ${t('admin.orders.subtitle', 'commandes sur la période')}`}>
        <button className="btn-admin ghost">{I.pdf}{t('admin.orders.export', 'Exporter')}</button>
      </PageHead>

      <Panel>
        <Toolbar>
          <div className="admin-field">
            {I.search}
            <input placeholder={t('admin.orders.searchPlaceholder', 'Référence ou client…')} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <span className="admin-count">{rows.length} {t('admin.orders.results', 'résultat(s)')}</span>
        </Toolbar>

        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.orders.tableRef', 'Référence')}</th>
              <th>{t('admin.orders.tableClient', 'Client')}</th>
              <th>{t('admin.orders.tableType', 'Type')}</th>
              <th>{t('admin.orders.tableDate', 'Date')}</th>
              <th>{t('admin.orders.tableTotal', 'Total')}</th>
              <th>{t('admin.orders.tableStatus', 'Statut')}</th>
              <th>{t('admin.orders.tableActions', 'Actions')}</th>
            </tr>
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
                    <span className="icon-btn" title={t('admin.orders.viewDetail', 'Voir le détail')}>{I.eye}</span>
                    <span className="icon-btn" title={t('admin.orders.invoicePdf', 'Facture PDF')}>{I.pdf}</span>
                    <span className="icon-btn approve" title={t('admin.orders.markShipped', 'Marquer expédiée')}>{I.truck}</span>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan="7" className="admin-empty">{t('admin.orders.empty', 'Aucune commande pour ce filtre.')}</td></tr>
            )}
          </tbody>
        </table>
        <Pagination pages={4} current={1} />
      </Panel>
    </>
  );
}
