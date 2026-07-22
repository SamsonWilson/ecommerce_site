import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { I } from './icons.jsx';
import { PageHead, Panel } from './ui.jsx';

export default function PriceTiers() {
  const [tiers, setTiers] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', discount_percent: '', priority: '' });

  const load = () =>
    api.adminPriceTiers()
      .then((d) => setTiers(d.results || d))
      .catch((e) => setError(e.status === 403 ? 'Accès réservé aux administrateurs.' : 'Chargement impossible.'));

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
      setError(err.data?.discount_percent?.[0] || err.data?.name?.[0] || 'Création impossible.');
    }
  };

  const updateDiscount = async (id, value) => {
    setError('');
    try {
      await api.adminUpdateTier(id, { discount_percent: value });
      load();
    } catch (err) {
      setError(err.data?.discount_percent?.[0] || 'Mise à jour impossible.');
    }
  };

  return (
    <>
      <PageHead
        title="Paliers tarifaires"
        subtitle="Remises appliquées au tarif de gros, par niveau de partenaire"
      />

      <div className="admin-row cols-2-1">
        <Panel title="Paliers existants">
          {error && <p className="admin-login-error">{error}</p>}
          <table className="admin-table">
            <thead>
              <tr><th>Palier</th><th>Remise sur le tarif de gros</th><th>Priorité</th><th>Exemple</th></tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.id}>
                  <td className="cell-main">{t.name}</td>
                  <td>
                    <input
                      className="admin-select"
                      style={{ width: 90 }}
                      type="number" min="0" max="100" step="1"
                      defaultValue={parseFloat(t.discount_percent)}
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (parseFloat(v) !== parseFloat(t.discount_percent)) updateDiscount(t.id, v);
                      }}
                    /> %
                  </td>
                  <td className="cell-sub">{t.priority}</td>
                  <td className="cell-sub">
                    {/* Épingle Phénix : détail 128 € → gros 76,80 € */}
                    128 € → <strong>{(76.8 * (1 - parseFloat(t.discount_percent) / 100)).toFixed(2)} €</strong>
                  </td>
                </tr>
              ))}
              {tiers.length === 0 && (
                <tr><td colSpan="4" className="admin-empty">Aucun palier. Créez-en un ci-contre.</td></tr>
              )}
            </tbody>
          </table>
          <p className="cell-sub" style={{ marginTop: 12, lineHeight: 1.6 }}>
            Modifiez une remise directement dans le tableau : la valeur est enregistrée à la sortie du champ.
          </p>
        </Panel>

        <Panel title="Nouveau palier">
          <form className="admin-form" onSubmit={create}>
            <label htmlFor="t-name">Nom</label>
            <input id="t-name" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. Partenaire privilégié" />

            <label htmlFor="t-disc" style={{ marginTop: 12 }}>Remise (%)</label>
            <input id="t-disc" type="number" min="0" max="100" value={form.discount_percent}
              onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} placeholder="10" />

            <label htmlFor="t-prio" style={{ marginTop: 12 }}>Priorité</label>
            <input id="t-prio" type="number" value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })} placeholder="4" />

            <button className="btn-admin primary" type="submit" style={{ marginTop: 14 }}>
              {I.plus}Créer le palier
            </button>
          </form>
        </Panel>
      </div>
    </>
  );
}
