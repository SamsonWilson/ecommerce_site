import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api.js';
import { I } from './icons.jsx';
import { PageHead, Panel, Toolbar } from './ui.jsx';

export default function ProAccounts() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [filter, setFilter] = useState('');
  const [type, setType] = useState('WHOLESALE');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const STATUS_PILL = {
    APPROVED: ['status paid', t('admin.proAccounts.approved', 'Validé')],
    PENDING: ['status pending', t('admin.proAccounts.pending', 'En attente')],
    REJECTED: ['status new', t('admin.proAccounts.rejected', 'Refusé')],
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [customers, tRes] = await Promise.all([
        api.adminCustomers({ account_type: type || undefined, status: filter || undefined }),
        api.adminPriceTiers(),
      ]);
      setRows(customers.results || customers);
      setTiers(tRes.results || tRes);
    } catch (e) {
      setError(e.status === 403 ? t('admin.proAccounts.forbidden', "Accès refusé : ce compte n'est pas administrateur.")
        : t('admin.proAccounts.loadError', "Impossible de charger les comptes pro."));
    } finally {
      setLoading(false);
    }
  }, [filter, type, t]);

  useEffect(() => { load(); }, [load]);

  const replace = (updated) => setRows((list) => list.map((r) => (r.id === updated.id ? updated : r)));

  const act = async (id, fn) => {
    setBusyId(id);
    setError('');
    try {
      replace(await fn());
    } catch (e) {
      setError(e.data?.price_tier?.[0] || t('admin.proAccounts.operationFailed', "L'opération a échoué."));
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = rows.filter((r) => r.status === 'PENDING').length;

  return (
    <>
      <PageHead
        title={t('admin.proAccounts.title', 'Comptes clients & accès grossiste')}
        subtitle={`${rows.length} ${t('admin.proAccounts.subtitleCount', 'compte(s)')} — ${pendingCount} ${t('admin.proAccounts.subtitlePending', 'en attente')}`}
      >
        <button className="btn-admin ghost" onClick={load}>{I.check}{t('admin.proAccounts.refresh', 'Actualiser')}</button>
      </PageHead>

      <Panel>
        <Toolbar>
          <select className="admin-select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">{t('admin.proAccounts.allTypes', 'Tous les comptes')}</option>
            <option value="RETAIL">{t('admin.proAccounts.typeRetail', 'Détail (B2C)')}</option>
            <option value="WHOLESALE">{t('admin.proAccounts.typeWholesale', 'Grossistes (B2B)')}</option>
          </select>
          <select className="admin-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">{t('admin.proAccounts.allStatuses', 'Tous les statuts')}</option>
            <option value="PENDING">{t('admin.proAccounts.statusPending', 'En attente')}</option>
            <option value="APPROVED">{t('admin.proAccounts.statusApproved', 'Validés')}</option>
            <option value="REJECTED">{t('admin.proAccounts.statusRejected', 'Refusés')}</option>
          </select>
          <span className="admin-count">{rows.length} {t('admin.proAccounts.accountsCount', 'compte(s)')}</span>
        </Toolbar>

        {error && <p className="admin-login-error">{error}</p>}

        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.proAccounts.tableAccount', 'Compte')}</th>
              <th>{t('admin.proAccounts.tableType', 'Type')}</th>
              <th>{t('admin.proAccounts.tableCountry', 'Pays')}</th>
              <th>{t('admin.proAccounts.tableTier', 'Palier tarifaire')}</th>
              <th>{t('admin.proAccounts.tableStatus', 'Statut')}</th>
              <th>{t('admin.proAccounts.tableActions', 'Actions')}</th>
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
                    <option value="">— {t('admin.proAccounts.none', 'Aucun')} —</option>
                    {tiers.map((tRes) => (
                      <option key={tRes.id} value={tRes.id}>
                        {tRes.name} (-{parseFloat(tRes.discount_percent)} %)
                      </option>
                    ))}
                  </select>
                </td>
                <td><span className={STATUS_PILL[r.status]?.[0] || 'status pending'}>{STATUS_PILL[r.status]?.[1] || r.status}</span></td>
                <td>
                  <div className="row-actions">
                    {r.account_type === 'RETAIL' ? (
                      <button className="btn-admin primary" style={{ padding: '6px 12px', fontSize: 12 }}
                        disabled={busyId === r.id}
                        onClick={() => act(r.id, () => api.adminToWholesale(r.id, null))}>
                        {I.store}{t('admin.proAccounts.activateWholesale', 'Activer grossiste')}
                      </button>
                    ) : (
                      <>
                        {r.status !== 'APPROVED' && (
                          <span className="icon-btn approve" title={t('admin.proAccounts.approve', 'Valider')}
                            onClick={() => act(r.id, () => api.adminApprove(r.id))}>{I.check}</span>
                        )}
                        <button className="btn-admin ghost" style={{ padding: '6px 12px', fontSize: 12 }}
                          disabled={busyId === r.id}
                          onClick={() => act(r.id, () => api.adminToRetail(r.id))}>
                          {t('admin.proAccounts.backToRetail', 'Repasser en détail')}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && !error && (
              <tr><td colSpan="6" className="admin-empty">{t('admin.proAccounts.empty', 'Aucun compte professionnel pour ce filtre.')}</td></tr>
            )}
            {loading && <tr><td colSpan="6" className="admin-empty">{t('common.loading', 'Chargement…')}</td></tr>}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
