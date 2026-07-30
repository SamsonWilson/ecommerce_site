import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I } from './icons.jsx';
import { PageHead, Panel, Toolbar } from './ui.jsx';

const PROMOS = [
  { id: 1, code: 'PRINTEMPS20', label: 'Collection printemps', type: '%', value: '20', scope: 'Catalogue entier', start: '01/07/2026', end: '31/07/2026', uses: 142, status: ['paid', 'Active'] },
  { id: 2, code: 'BIENVENUE10', label: 'Première commande', type: '%', value: '10', scope: 'Nouveaux clients', start: '01/01/2026', end: '31/12/2026', uses: 618, status: ['paid', 'Active'] },
  { id: 3, code: 'GROS30', label: 'Programme grossiste', type: '%', value: '30', scope: 'Comptes pro validés', start: '01/06/2026', end: '31/08/2026', uses: 27, status: ['paid', 'Active'] },
  { id: 4, code: 'PORT0', label: 'Livraison offerte', type: '€', value: '6,90', scope: 'Dès 150 €', start: '15/07/2026', end: '15/09/2026', uses: 89, status: ['pending', 'Planifiée'] },
  { id: 5, code: 'NOEL25', label: 'Fêtes de fin d\'année', type: '%', value: '25', scope: 'Catalogue entier', start: '01/12/2025', end: '05/01/2026', uses: 431, status: ['new', 'Expirée'] },
];

export default function Promotions() {
  const { t } = useTranslation();
  const [promos, setPromos] = useState(PROMOS);
  const [filter, setFilter] = useState('Toutes');

  const FILTERS = [
    { value: 'Toutes', label: t('admin.promotions.filterAll', 'Toutes') },
    { value: 'Active', label: t('admin.promotions.filterActive', 'Active') },
    { value: 'Planifiée', label: t('admin.promotions.filterScheduled', 'Planifiée') },
    { value: 'Expirée', label: t('admin.promotions.filterExpired', 'Expirée') },
  ];

  const rows = promos.filter((p) => filter === 'Toutes' || p.status[1] === filter);
  const remove = (id) => setPromos((l) => l.filter((p) => p.id !== id));

  return (
    <>
      <PageHead title={t('admin.promotions.title', 'Gestion des promotions')} subtitle={`${promos.filter((p) => p.status[1] === 'Active').length} ${t('admin.promotions.activePromos', 'promotions actives')}`}>
        <button className="btn-admin primary">{I.plus}{t('admin.promotions.createPromo', 'Créer une promotion')}</button>
      </PageHead>

      <Panel>
        <Toolbar>
          <select className="admin-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <span className="admin-count">{rows.length} {t('admin.promotions.promosCount', 'promotion(s)')}</span>
        </Toolbar>

        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.promotions.tableCode', 'Code')}</th>
              <th>{t('admin.promotions.tableDiscount', 'Remise')}</th>
              <th>{t('admin.promotions.tableScope', 'Portée')}</th>
              <th>{t('admin.promotions.tablePeriod', 'Période')}</th>
              <th>{t('admin.promotions.tableUses', 'Utilisations')}</th>
              <th>{t('admin.promotions.tableStatus', 'Statut')}</th>
              <th>{t('admin.promotions.tableActions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="cell-main">{p.code}</div>
                  <div className="cell-sub">{p.label}</div>
                </td>
                <td>
                  <span className="tag-pill tier-2">
                    {p.type === '%' ? `-${p.value} %` : `-${p.value} €`}
                  </span>
                </td>
                <td className="cell-sub">{p.scope}</td>
                <td className="cell-sub">{p.start} → {p.end}</td>
                <td>{p.uses}</td>
                <td><span className={`status ${p.status[0]}`}>{p.status[1]}</span></td>
                <td>
                  <div className="row-actions">
                    <span className="icon-btn" title={t('admin.promotions.edit', 'Modifier')}>{I.pencil}</span>
                    <span className="icon-btn reject" title={t('admin.promotions.delete', 'Supprimer')} onClick={() => remove(p.id)}>{I.trash}</span>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan="7" className="admin-empty">{t('admin.promotions.empty', 'Aucune promotion pour ce filtre.')}</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
