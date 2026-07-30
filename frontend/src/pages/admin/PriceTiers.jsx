import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api.js';
import { I } from './icons.jsx';
import { PageHead, Panel } from './ui.jsx';

export default function PriceTiers() {
  const { t } = useTranslation();
  const [tiers, setTiers] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', discount_percent: '', priority: '' });

  const load = () =>
    api.adminPriceTiers()
      .then((d) => setTiers(d.results || d))
      .catch((e) => setError(e.status === 403 ? t('admin.priceTiers.forbidden', 'Accès réservé aux administrateurs.') : t('admin.priceTiers.loadError', 'Chargement impossible.')));

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.adminCreateTier({
        name: form.name,
        discount_percent: form.discount_percent || 0,
        priority: form.priority || 0,
      });
      setForm({ name: '', discount_percent: '', priority: '' });
      load();
    } catch (err) {
      setError(err.data?.discount_percent?.[0] || err.data?.name?.[0] || t('admin.priceTiers.createError', 'Création impossible.'));
    }
  };

  const updateDiscount = async (id, value) => {
    setError('');
    try {
      await api.adminUpdateTier(id, { discount_percent: value });
      load();
    } catch (err) {
      setError(err.data?.discount_percent?.[0] || t('admin.priceTiers.updateError', 'Mise à jour impossible.'));
    }
  };

  return (
    <>
      <PageHead
        title={t('admin.priceTiers.title', 'Paliers tarifaires')}
        subtitle={t('admin.priceTiers.subtitle', 'Remises appliquées au tarif de gros, par niveau de partenaire')}
      />

      <div className="admin-row cols-2-1">
        <Panel title={t('admin.priceTiers.existingTiers', 'Paliers existants')}>
          {error && <p className="admin-login-error">{error}</p>}
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.priceTiers.tableTier', 'Palier')}</th>
                <th>{t('admin.priceTiers.tableDiscount', 'Remise sur le tarif de gros')}</th>
                <th>{t('admin.priceTiers.tablePriority', 'Priorité')}</th>
                <th>{t('admin.priceTiers.tableExample', 'Exemple')}</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => (
                <tr key={tier.id}>
                  <td className="cell-main">{tier.name}</td>
                  <td>
                    <input
                      className="admin-select"
                      style={{ width: 90 }}
                      type="number" min="0" max="100" step="1"
                      defaultValue={parseFloat(tier.discount_percent)}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (parseFloat(v) !== parseFloat(tier.discount_percent)) updateDiscount(tier.id, v);
                      }}
                    /> %
                  </td>
                  <td className="cell-sub">{tier.priority}</td>
                  <td className="cell-sub">
                    128 € → <strong>{(76.8 * (1 - parseFloat(tier.discount_percent) / 100)).toFixed(2)} €</strong>
                  </td>
                </tr>
              ))}
              {tiers.length === 0 && (
                <tr><td colSpan="4" className="admin-empty">{t('admin.priceTiers.empty', 'Aucun palier. Créez-en un ci-contre.')}</td></tr>
              )}
            </tbody>
          </table>
        </Panel>

        <Panel title={t('admin.priceTiers.newTier', 'Nouveau palier')}>
          <form className="admin-form" onSubmit={create}>
            <label htmlFor="t-name">{t('admin.priceTiers.name', 'Nom')}</label>
            <input id="t-name" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. Partenaire privilégié" />

            <label htmlFor="t-disc" style={{ marginTop: 12 }}>{t('admin.priceTiers.discount', 'Remise (%)')}</label>
            <input id="t-disc" type="number" min="0" max="100" value={form.discount_percent}
              onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} placeholder="10" />

            <label htmlFor="t-prio" style={{ marginTop: 12 }}>{t('admin.priceTiers.priority', 'Priorité')}</label>
            <input id="t-prio" type="number" value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })} placeholder="4" />

            <button className="btn-admin primary" type="submit" style={{ marginTop: 14 }}>
              {I.plus}{t('admin.priceTiers.createTier', 'Créer le palier')}
            </button>
          </form>
        </Panel>
      </div>
    </>
  );
}
