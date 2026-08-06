import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api.js';
import { I } from './icons.jsx';
import { PageHead, Panel, Toolbar } from './ui.jsx';

const CHANNEL_PILL = { BOTH: 'tag-pill', RETAIL: 'tag-pill tier-1', WHOLESALE: 'tag-pill tier-2' };

const EMPTY = {
  name: '', category: '', colors: [], sales_channel: 'BOTH', description: '', is_active: true,
  sku: '', retail_price: '', wholesale_price: '', moq: 1, stock: 0,
  media: [], newImages: [],
};

const toForm = (p) => {
  const v = p.variants?.[0] || {};
  return {
    id: p.id, variantId: v.id,
    name: p.name, category: p.category || '', colors: p.colors || [],
    media: p.media || [], newImages: [],
    sales_channel: p.sales_channel,
    description: p.description || '', is_active: p.is_active,
    sku: v.sku || '', retail_price: v.retail_price || '', wholesale_price: v.wholesale_price || '',
    moq: v.moq ?? 1, stock: v.stock ?? 0,
  };
};

export default function Products() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [colors, setColors] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [query, setQuery] = useState('');
  const [channel, setChannel] = useState('');
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const CHANNELS = [
    { value: 'BOTH', label: t('admin.products.channelBoth', 'Détail et gros') },
    { value: 'RETAIL', label: t('admin.products.channelRetail', 'Détail uniquement') },
    { value: 'WHOLESALE', label: t('admin.products.channelWholesale', 'Gros uniquement') },
  ];

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await api.adminProducts({ sales_channel: channel || undefined, search: query || undefined });
      setRows(d.results || d);
    } catch (e) {
      setError(e.status === 403 ? t('admin.products.forbidden', 'Accès réservé aux administrateurs.') : t('admin.products.loadError', 'Chargement impossible.'));
    } finally { setLoading(false); }
  }, [channel, query, t]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.categories().then((d) => setCats(d.results || d)).catch(() => {});
    api.colors().then((d) => setColors(d.results || d)).catch(() => {});
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const firstPhotoId = form?.media?.find((m) => m.media_type !== 'VIDEO')?.id;

  const pending = form?.newImages;
  useEffect(() => {
    if (!pending?.length) { setPreviews([]); return undefined; }
    const made = pending.map((f) => ({
      url: URL.createObjectURL(f),
      isVideo: f.type.startsWith('video/'),
    }));
    setPreviews(made);
    return () => made.forEach((m) => URL.revokeObjectURL(m.url));
  }, [pending]);

  const addImages = (fileList) => {
    const picked = Array.from(fileList);
    if (!picked.length) return;
    setForm((f) => ({ ...f, newImages: [...f.newImages, ...picked] }));
  };

  const dropPending = (index) =>
    setForm((f) => ({ ...f, newImages: f.newImages.filter((_, i) => i !== index) }));

  const dropMedia = async (media) => {
    try {
      await api.adminDeleteProductImage(form.id, media.id);
      setForm((f) => ({ ...f, media: f.media.filter((m) => m.id !== media.id) }));
    } catch { setError(t('admin.products.deletePhotoError', 'Suppression de la photo impossible.')); }
  };

  const toggleColor = (id) =>
    setForm((f) => ({
      ...f,
      colors: f.colors.includes(id) ? f.colors.filter((x) => x !== id) : [...f.colors, id],
    }));

  const save = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    const payload = {
      name: form.name,
      category: form.category || null,
      colors: form.colors,
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
      const saved = form.id
        ? await api.adminUpdateProduct(form.id, payload)
        : await api.adminCreateProduct(payload);

      const failed = [];
      for (const file of form.newImages) {
        try {
          await api.adminUploadProductImage(saved.id, file);
        } catch (up) {
          failed.push(`${file.name} : ${up.data?.file?.[0] || 'envoi impossible'}`);
        }
      }
      if (failed.length) {
        const fresh = await api.adminProducts({ search: saved.slug });
        const row = (fresh.results || fresh).find((r) => r.id === saved.id);
        setForm({ ...toForm(row || saved), newImages: [] });
        setError(`Produit enregistré, mais ${failed.length} photo(s) refusée(s) — ${failed.join(' ; ')}`);
        load();
        return;
      }
      setForm(null);
      load();
    } catch (err) {
      const d = err.data || {};
      setError(
        d.file?.[0] ||
        d.variants?.[0]?.wholesale_price?.[0] || d.variants?.[0]?.sku?.[0] ||
        d.variants?.[0] || d.name?.[0] || t('admin.products.saveError', "L'enregistrement a échoué.")
      );
    } finally { setBusy(false); }
  };

  const remove = async (p) => {
    if (!window.confirm(t('admin.products.confirmDelete', `Supprimer « ${p.name} » ? Cette action est définitive.`))) return;
    try { await api.adminDeleteProduct(p.id); load(); }
    catch { setError(t('admin.products.deleteError', 'Suppression impossible (produit lié à une commande ou un devis ?).')); }
  };

  return (
    <>
      <PageHead title={t('admin.products.title', 'Gestion des produits')} subtitle={`${rows.length} ${t('admin.products.references', 'référence(s) au catalogue')}`}>
        <button className="btn-admin ghost" onClick={load}>{I.check}{t('admin.products.refresh', 'Actualiser')}</button>
        <button className="btn-admin primary" onClick={() => setForm({ ...EMPTY })}>{I.plus}{t('admin.products.addProduct', 'Ajouter un produit')}</button>
      </PageHead>

      {form && (
        <Panel title={form.id ? t('admin.products.editProduct', 'Modifier le produit') : t('admin.products.newProduct', 'Nouveau produit')}>
          <form className="admin-form" onSubmit={save}>
            <div className="prod-grid">
              <div className="full">
                <label htmlFor="p-name">{t('admin.products.name', 'Nom du produit')}</label>
                <input id="p-name" required value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>

              <div>
                <label htmlFor="p-cat">{t('admin.products.category', 'Catégorie')}</label>
                <select id="p-cat" value={form.category} onChange={(e) => set('category', e.target.value)}>
                  <option value="">— {t('admin.products.none', 'Aucune')} —</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="p-chan">{t('admin.products.channel', 'Canal de vente')}</label>
                <select id="p-chan" value={form.sales_channel} onChange={(e) => set('sales_channel', e.target.value)}>
                  {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div className="full">
                <span className="admin-label">{t('admin.products.colors', 'Coloris')}</span>
                {colors.length === 0 ? (
                  <p className="prod-hint" style={{ marginTop: 6 }}>
                    {t('admin.products.noColors', "Aucun coloris enregistré — créez-en depuis l'écran Catégories.")}
                  </p>
                ) : (
                  <div className="color-picker">
                    {colors.map((c) => {
                      const on = form.colors.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={on ? 'sel' : undefined}
                          style={{ background: c.hex_code }}
                          aria-pressed={on}
                          title={c.name}
                          onClick={() => toggleColor(c.id)}
                        />
                      );
                    })}
                  </div>
                )}
                <p className="prod-hint" style={{ marginTop: 6 }}>
                  {form.colors.length
                    ? colors.filter((c) => form.colors.includes(c.id)).map((c) => c.name).join(', ')
                    : t('admin.products.colorsHint', "Aucun coloris — le produit n'apparaîtra pas dans les filtres par couleur.")}
                </p>
              </div>

              <div className="full prod-hint">
                {form.sales_channel === 'BOTH' && t('admin.products.hintBoth', 'Visible par les clients au détail et par les grossistes validés.')}
                {form.sales_channel === 'RETAIL' && t('admin.products.hintRetail', 'Visible uniquement par les clients au détail — masqué aux grossistes.')}
                {form.sales_channel === 'WHOLESALE' && t('admin.products.hintWholesale', 'Réservé aux grossistes validés — invisible dans la boutique publique.')}
              </div>

              <div>
                <label htmlFor="p-sku">{t('admin.products.sku', 'Référence (SKU)')}</label>
                <input id="p-sku" required value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="ML-XXXX-01" />
              </div>
              <div>
                <label htmlFor="p-stock">{t('admin.products.stock', 'Stock')}</label>
                <input id="p-stock" type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
              </div>

              <div>
                <label htmlFor="p-retail">{t('admin.products.retailPrice', 'Prix de détail (€)')}</label>
                <input id="p-retail" type="number" step="0.01" min="0" required
                  value={form.retail_price} onChange={(e) => set('retail_price', e.target.value)} />
              </div>
              <div>
                <label htmlFor="p-whole">{t('admin.products.wholesalePrice', 'Prix de gros (€)')}</label>
                <input id="p-whole" type="number" step="0.01" min="0" required
                  value={form.wholesale_price} onChange={(e) => set('wholesale_price', e.target.value)} />
              </div>

              <div>
                <label htmlFor="p-moq">{t('admin.products.moq', 'Quantité minimale (MOQ)')}</label>
                <input id="p-moq" type="number" min="1" value={form.moq} onChange={(e) => set('moq', e.target.value)} />
              </div>
              <div>
                <label htmlFor="p-active">{t('admin.products.status', 'Statut')}</label>
                <select id="p-active" value={form.is_active ? '1' : '0'} onChange={(e) => set('is_active', e.target.value === '1')}>
                  <option value="1">{t('admin.products.active', 'Actif (en vente)')}</option>
                  <option value="0">{t('admin.products.inactive', 'Inactif (masqué)')}</option>
                </select>
              </div>

              <div className="full">
                <span className="admin-label">{t('admin.products.media', 'Photos et vidéo')}</span>
                <div className="photo-grid">
                  {form.media.map((m) => (
                    <figure className="photo-item" key={m.id}>
                      {m.media_type === 'VIDEO'
                        ? <video src={m.file} muted playsInline preload="metadata" />
                        : <img src={m.file} alt={m.alt_text || form.name} />}
                      {m.media_type === 'VIDEO' && <figcaption>{t('admin.products.video', 'Vidéo')}</figcaption>}
                      {m.id === firstPhotoId && <figcaption>{t('admin.products.thumbnail', 'Vignette')}</figcaption>}
                      <button type="button" className="photo-drop" title={t('admin.products.deleteMedia', 'Supprimer ce média')}
                        onClick={() => dropMedia(m)}>×</button>
                    </figure>
                  ))}
                  {previews.map((p, i) => (
                    <figure className="photo-item pending" key={p.url}>
                      {p.isVideo
                        ? <video src={p.url} muted playsInline preload="metadata" />
                        : <img src={p.url} alt={`À envoyer ${i + 1}`} />}
                      <figcaption>{t('admin.products.pendingSend', 'À envoyer')}</figcaption>
                      <button type="button" className="photo-drop" title={t('admin.products.remove', 'Retirer')}
                        onClick={() => dropPending(i)}>×</button>
                    </figure>
                  ))}
                  <label className="photo-add">
                    {I.plus}
                    <span>{t('admin.products.addMedia', 'Ajouter')}</span>
                    <input
                      type="file" multiple
                      accept="image/png,image/jpeg,image/gif,image/webp,image/avif,video/mp4,video/webm"
                      onChange={(e) => { addImages(e.target.files); e.target.value = ''; }} />
                  </label>
                </div>
              </div>

              <div className="full">
                <label htmlFor="p-desc">{t('admin.products.description', 'Description')}</label>
                <textarea id="p-desc" rows="3" value={form.description} onChange={(e) => set('description', e.target.value)} />
              </div>
            </div>

            {error && <p className="admin-login-error" style={{ marginTop: 14 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn-admin primary" type="submit" disabled={busy}>
                {busy ? t('admin.products.saving', 'Enregistrement…') : form.id ? t('admin.products.save', 'Enregistrer') : t('admin.products.createProduct', 'Créer le produit')}
              </button>
              <button className="btn-admin ghost" type="button" onClick={() => { setForm(null); setError(''); }}>
                {t('admin.products.cancel', 'Annuler')}
              </button>
            </div>
          </form>
        </Panel>
      )}

      <Panel>
        <Toolbar>
          <div className="admin-field">
            {I.search}
            <input placeholder={t('admin.products.searchPlaceholder', 'Rechercher (nom, SKU…)')} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="admin-select" value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="">{t('admin.products.allChannels', 'Tous les canaux')}</option>
            {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <span className="admin-count">{rows.length} {t('admin.products.results', 'résultat(s)')}</span>
        </Toolbar>

        {error && !form && <p className="admin-login-error">{error}</p>}

        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.products.tableProduct', 'Produit')}</th><th>{t('admin.products.tableSku', 'Référence')}</th><th>{t('admin.products.tableChannel', 'Canal')}</th>
              <th>{t('admin.products.tableRetailPrice', 'Prix détail')}</th><th>{t('admin.products.tableWholesalePrice', 'Prix gros')}</th><th>{t('admin.products.tableMoq', 'MOQ')}</th><th>{t('admin.products.tableStock', 'Stock')}</th><th>{t('admin.products.tableActions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const v = p.variants?.[0] || {};
              return (
                <tr key={p.id}>
                  <td>
                    <div className="cell-flex">
                      <span className="cell-thumb">
                        {p.media?.[0]
                          ? <img src={p.media[0].file} alt="" />
                          : I.tag}
                      </span>
                      <div>
                        <div className="cell-main">{p.name}</div>
                        <div className="cell-sub">{p.category_name || '—'}{!p.is_active && ` · ${t('admin.products.inactive', 'inactif')}`}</div>
                      </div>
                    </div>
                  </td>
                  <td className="cell-sub">{v.sku || '—'}</td>
                  <td><span className={CHANNEL_PILL[p.sales_channel]}>{p.sales_channel_display}</span></td>
                  <td>{v.retail_price ? `${parseFloat(v.retail_price)} €` : '—'}</td>
                  <td style={{ color: 'var(--red)', fontWeight: 600 }}>
                    {v.wholesale_price ? `${parseFloat(v.wholesale_price)} €` : '—'}
                  </td>
                  <td className="cell-sub">{v.moq ?? '—'}</td>
                  <td>
                    <span className={(v.stock ?? 0) === 0 ? 'status rejected' : (v.stock ?? 0) <= 5 ? 'status pending' : 'status paid'}>{v.stock ?? 0}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <span className="icon-btn" title={t('admin.products.edit', 'Modifier')} onClick={() => { setForm(toForm(p)); setError(''); }}>{I.pencil}</span>
                      <span className="icon-btn reject" title={t('admin.products.delete', 'Supprimer')} onClick={() => remove(p)}>{I.trash}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {loading && <tr><td colSpan="8" className="admin-empty">{t('common.loading', 'Chargement…')}</td></tr>}
            {!loading && rows.length === 0 && !error && (
              <tr><td colSpan="8" className="admin-empty">{t('admin.products.empty', 'Aucun produit. Cliquez sur « Ajouter un produit ».')}</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
