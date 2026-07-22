import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { I } from './icons.jsx';
import { PageHead, Panel, Toolbar } from './ui.jsx';

const CHANNELS = [
  { value: 'BOTH', label: 'Détail et gros' },
  { value: 'RETAIL', label: 'Détail uniquement' },
  { value: 'WHOLESALE', label: 'Gros uniquement' },
];
const CHANNEL_PILL = { BOTH: 'tag-pill', RETAIL: 'tag-pill tier-1', WHOLESALE: 'tag-pill tier-2' };

const EMPTY = {
  name: '', category: '', sales_channel: 'BOTH', description: '', is_active: true,
  sku: '', retail_price: '', wholesale_price: '', moq: 1, stock: 0,
};

// Aplatit un produit de l'API vers le formulaire (1 déclinaison principale).
const toForm = (p) => {
  const v = p.variants?.[0] || {};
  return {
    id: p.id, variantId: v.id,
    name: p.name, category: p.category || '', sales_channel: p.sales_channel,
    description: p.description || '', is_active: p.is_active,
    sku: v.sku || '', retail_price: v.retail_price || '', wholesale_price: v.wholesale_price || '',
    moq: v.moq ?? 1, stock: v.stock ?? 0,
  };
};

export default function Products() {
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [query, setQuery] = useState('');
  const [channel, setChannel] = useState('');
  const [form, setForm] = useState(null);       // null = formulaire fermé
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await api.adminProducts({ sales_channel: channel || undefined, search: query || undefined });
      setRows(d.results || d);
    } catch (e) {
      setError(e.status === 403 ? 'Accès réservé aux administrateurs.' : 'Chargement impossible.');
    } finally { setLoading(false); }
  }, [channel, query]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.categories().then((d) => setCats(d.results || d)).catch(() => {}); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    // Le produit et sa déclinaison sont envoyés d'un bloc.
    const payload = {
      name: form.name,
      category: form.category || null,
      sales_channel: form.sales_channel,
      description: form.description,
      is_active: form.is_active,
      variants: [{
        ...(form.variantId ? { id: form.variantId } : {}),
        sku: form.sku,
        retail_price: form.retail_price,
        wholesale_price: form.wholesale_price,
        moq: Number(form.moq) || 1,
        stock: Number(form.stock) || 0,
      }],
    };
    try {
      if (form.id) await api.adminUpdateProduct(form.id, payload);
      else await api.adminCreateProduct(payload);
      setForm(null);
      load();
    } catch (err) {
      const d = err.data || {};
      setError(
        d.variants?.[0]?.wholesale_price?.[0] || d.variants?.[0]?.sku?.[0] ||
        d.variants?.[0] || d.name?.[0] || "L'enregistrement a échoué."
      );
    } finally { setBusy(false); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Supprimer « ${p.name} » ? Cette action est définitive.`)) return;
    try { await api.adminDeleteProduct(p.id); load(); }
    catch { setError('Suppression impossible (produit lié à une commande ou un devis ?).'); }
  };

  return (
    <>
      <PageHead title="Gestion des produits" subtitle={`${rows.length} référence(s) au catalogue`}>
        <button className="btn-admin ghost" onClick={load}>{I.check}Actualiser</button>
        <button className="btn-admin primary" onClick={() => setForm({ ...EMPTY })}>{I.plus}Ajouter un produit</button>
      </PageHead>

      {form && (
        <Panel title={form.id ? 'Modifier le produit' : 'Nouveau produit'}>
          <form className="admin-form" onSubmit={save}>
            <div className="prod-grid">
              <div className="full">
                <label htmlFor="p-name">Nom du produit</label>
                <input id="p-name" required value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>

              <div>
                <label htmlFor="p-cat">Catégorie</label>
                <select id="p-cat" value={form.category} onChange={(e) => set('category', e.target.value)}>
                  <option value="">— Aucune —</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="p-chan">Canal de vente</label>
                <select id="p-chan" value={form.sales_channel} onChange={(e) => set('sales_channel', e.target.value)}>
                  {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div className="full prod-hint">
                {form.sales_channel === 'BOTH' && 'Visible par les clients au détail et par les grossistes validés.'}
                {form.sales_channel === 'RETAIL' && 'Visible uniquement par les clients au détail — masqué aux grossistes.'}
                {form.sales_channel === 'WHOLESALE' && 'Réservé aux grossistes validés — invisible dans la boutique publique.'}
              </div>

              <div>
                <label htmlFor="p-sku">Référence (SKU)</label>
                <input id="p-sku" required value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="ML-XXXX-01" />
              </div>
              <div>
                <label htmlFor="p-stock">Stock</label>
                <input id="p-stock" type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
              </div>

              <div>
                <label htmlFor="p-retail">Prix de détail (€)</label>
                <input id="p-retail" type="number" step="0.01" min="0" required
                  value={form.retail_price} onChange={(e) => set('retail_price', e.target.value)} />
              </div>
              <div>
                <label htmlFor="p-whole">Prix de gros (€)</label>
                <input id="p-whole" type="number" step="0.01" min="0" required
                  value={form.wholesale_price} onChange={(e) => set('wholesale_price', e.target.value)} />
              </div>

              <div>
                <label htmlFor="p-moq">Quantité minimale (MOQ)</label>
                <input id="p-moq" type="number" min="1" value={form.moq} onChange={(e) => set('moq', e.target.value)} />
              </div>
              <div>
                <label htmlFor="p-active">Statut</label>
                <select id="p-active" value={form.is_active ? '1' : '0'} onChange={(e) => set('is_active', e.target.value === '1')}>
                  <option value="1">Actif (en vente)</option>
                  <option value="0">Inactif (masqué)</option>
                </select>
              </div>

              <div className="full">
                <label htmlFor="p-desc">Description</label>
                <textarea id="p-desc" rows="3" value={form.description} onChange={(e) => set('description', e.target.value)} />
              </div>
            </div>

            {error && <p className="admin-login-error" style={{ marginTop: 14 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn-admin primary" type="submit" disabled={busy}>
                {busy ? 'Enregistrement…' : form.id ? 'Enregistrer' : 'Créer le produit'}
              </button>
              <button className="btn-admin ghost" type="button" onClick={() => { setForm(null); setError(''); }}>
                Annuler
              </button>
            </div>
          </form>
        </Panel>
      )}

      <Panel>
        <Toolbar>
          <div className="admin-field">
            {I.search}
            <input placeholder="Rechercher (nom, SKU…)" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="admin-select" value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="">Tous les canaux</option>
            {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <span className="admin-count">{rows.length} résultat(s)</span>
        </Toolbar>

        {error && !form && <p className="admin-login-error">{error}</p>}

        <table className="admin-table">
          <thead>
            <tr>
              <th>Produit</th><th>Référence</th><th>Canal</th>
              <th>Prix détail</th><th>Prix gros</th><th>MOQ</th><th>Stock</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const v = p.variants?.[0] || {};
              return (
                <tr key={p.id}>
                  <td>
                    <div className="cell-main">{p.name}</div>
                    <div className="cell-sub">{p.category_name || '—'}{!p.is_active && ' · inactif'}</div>
                  </td>
                  <td className="cell-sub">{v.sku || '—'}</td>
                  <td><span className={CHANNEL_PILL[p.sales_channel]}>{p.sales_channel_display}</span></td>
                  <td>{v.retail_price ? `${parseFloat(v.retail_price)} €` : '—'}</td>
                  <td style={{ color: 'var(--red)', fontWeight: 600 }}>
                    {v.wholesale_price ? `${parseFloat(v.wholesale_price)} €` : '—'}
                  </td>
                  <td className="cell-sub">{v.moq ?? '—'}</td>
                  <td>
                    <span className={(v.stock ?? 0) > 10 ? 'status paid' : 'status pending'}>{v.stock ?? 0}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <span className="icon-btn" title="Modifier" onClick={() => { setForm(toForm(p)); setError(''); }}>{I.pencil}</span>
                      <span className="icon-btn reject" title="Supprimer" onClick={() => remove(p)}>{I.trash}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {loading && <tr><td colSpan="8" className="admin-empty">Chargement…</td></tr>}
            {!loading && rows.length === 0 && !error && (
              <tr><td colSpan="8" className="admin-empty">Aucun produit. Cliquez sur « Ajouter un produit ».</td></tr>
            )}
          </tbody>
        </table>

        <p className="cell-sub" style={{ marginTop: 14, lineHeight: 1.6 }}>
          Le <strong>prix de gros</strong> n'est visible que dans ce back-office. Côté boutique,
          chaque client ne reçoit que le prix qui le concerne, calculé par le serveur.
        </p>
      </Panel>
    </>
  );
}
