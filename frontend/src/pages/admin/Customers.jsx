import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api.js';
import { PageHead, Panel, Toolbar } from './ui.jsx';
import { I } from './icons.jsx';

export default function Customers() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.adminCustomers({ account_type: 'RETAIL' })
      .then((d) => { if (alive) setRows(d.results || d); })
      .catch((e) => {
        if (alive) setError(e.status === 403 ? t('admin.customers.forbidden', 'Accès réservé aux administrateurs.') : t('admin.customers.loadError', 'Chargement impossible.'));
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [t]);

  const filtered = rows.filter((r) =>
    `${r.full_name} ${r.email}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <PageHead title={t('admin.customers.title', 'Clients particuliers')} subtitle={`${rows.length} ${t('admin.customers.subtitle', 'compte(s) de détail (B2C)')}`} />

      <Panel>
        <Toolbar>
          <div className="admin-field">
            {I.search}
            <input placeholder={t('admin.customers.searchPlaceholder', 'Nom ou e-mail…')} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <span className="admin-count">{filtered.length} {t('admin.customers.results', 'résultat(s)')}</span>
        </Toolbar>

        {error && <p className="admin-login-error">{error}</p>}

        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.customers.tableCustomer', 'Client')}</th>
              <th>{t('admin.customers.tableCountry', 'Pays')}</th>
              <th>{t('admin.customers.tableRegistered', 'Inscrit le')}</th>
              <th>{t('admin.customers.tableType', 'Type')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="cell-main">{r.full_name}</div>
                  <div className="cell-sub">{r.email}</div>
                </td>
                <td className="cell-sub">{r.country || '—'}</td>
                <td className="cell-sub">{new Date(r.created_at).toLocaleDateString()}</td>
                <td><span className="tag-pill tier-1">{t('admin.customers.retail', 'Particulier')}</span></td>
              </tr>
            ))}
            {loading && <tr><td colSpan="4" className="admin-empty">{t('common.loading', 'Chargement…')}</td></tr>}
            {!loading && filtered.length === 0 && !error && (
              <tr><td colSpan="4" className="admin-empty">{t('admin.customers.empty', 'Aucun client pour cette recherche.')}</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
