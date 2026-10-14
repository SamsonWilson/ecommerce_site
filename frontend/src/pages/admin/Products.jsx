import { useCallback, useEffect, useRef, useState } from 'react';
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
  const formRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [query, setQuery] = useState('');
  const [channel, setChannel] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
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
  }, []);

  const openForm = (data) => {
    setForm(data);
    setError('');
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const nameInput = document.getElementById('p-name');
      if (nameInput) nameInput.focus();
    }, 50);
  };

  const closeForm = () => {
    setForm(null);
    setError('');
  };

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

  const save = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);

    const isRetailOnly = form.sales_channel === 'RETAIL';
    const isWholesaleOnly = form.sales_channel === 'WHOLESALE';

    const retailPrice = isWholesaleOnly
      ? (form.retail_price || form.wholesale_price)
      : form.retail_price;

    const wholesalePrice = isRetailOnly
      ? (form.wholesale_price || form.retail_price)
      : form.wholesale_price;

    const payload = {
      name: form.name,
      category: form.category || null,
      colors: form.colors || [],
      sales_channel: form.sales_channel,
      description: form.description,
      is_active: form.is_active,
      variants: [{
        ...(form.variantId ? { id: form.variantId } : {}),
        sku: form.sku || `ML-${(form.name || 'PROD').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}-${Math.floor(1000 + Math.random() * 9000)}`,
        retail_price: retailPrice,
        wholesale_price: wholesalePrice,
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

      setSuccessMsg(form.id ? 'Produit mis à jour avec succès.' : 'Nouveau produit créé avec succès.');
      setTimeout(() => setSuccessMsg(''), 4000);
      setForm({ ...EMPTY });
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
    try {
      await api.adminDeleteProduct(p.id);
      setSuccessMsg(`Produit « ${p.name} » supprimé.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      load();
    } catch {
      setError(t('admin.products.deleteError', 'Suppression impossible (produit lié à une commande ou un devis ?).'));
    }
  };


  const filteredRows = rows.filter((p) => {
    if (catFilter && String(p.category) !== String(catFilter)) return false;
    return true;
  });

  return (
    <>
      <PageHead
        title={t('admin.products.title', 'Gestion des produits')}
        subtitle={`${rows.length} ${t('admin.products.count', 'produit(s) au catalogue')}`}
      >
        <button className="btn-admin ghost" onClick={load}>
          {I.check}{t('admin.products.refresh', 'Actualiser')}
        </button>
        {!form && (
          <button className="btn-admin primary" onClick={() => openForm({ ...EMPTY })}>
            {I.plus}{t('admin.products.addProduct', 'Ajouter un produit')}
          </button>
        )}
        {form?.id && (
          <button className="btn-admin primary" onClick={() => openForm({ ...EMPTY })}>
            {I.plus} Nouveau produit
          </button>
        )}
      </PageHead>

      {/* Message de succès en haut de page */}
      {successMsg && (
        <div className="admin-success-banner">
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Message d'erreur global */}
      {error && !form && (
        <p className="admin-login-error" style={{ marginBottom: 20 }}>
          {error}
        </p>
      )}

      {/* LAYOUT CÔTE À CÔTE : Formulaire (gauche) & Catalogue (droite) */}
      <div className={`admin-products-layout ${!form ? 'full-width' : ''}`}>
        {form && (
          <div className="prod-form-column" ref={formRef}>
            <Panel
              title={form.id ? `Modifier : ${form.name}` : t('admin.products.newProduct', 'Nouveau produit')}
              action={
                form.id ? (
                  <button
                    type="button"
                    className="btn-admin ghost"
                    onClick={() => openForm({ ...EMPTY })}
                    style={{ padding: '5px 10px', fontSize: 12 }}
                    title="Nouveau produit"
                  >
                    + Nouveau
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-admin ghost"
                    onClick={closeForm}
                    style={{ padding: '5px 10px', fontSize: 12 }}
                    title="Masquer le formulaire"
                  >
                    ✕ Masquer
                  </button>
                )
              }
            >
              <form className="admin-form" onSubmit={save}>
                {error && <p className="admin-login-error" style={{ marginBottom: 16 }}>{error}</p>}

                {/* 1. INFORMATIONS GÉNÉRALES */}
                <div className="form-section">
                  <div className="form-section-title">
                    <span>📦</span> Informations Générales
                  </div>
                  <div className="prod-grid">
                    <div className="full">
                      <label htmlFor="p-name">{t('admin.products.name', 'Nom du produit')}</label>
                      <input
                        id="p-name"
                        required
                        value={form.name}
                        onChange={(e) => set('name', e.target.value)}
                        placeholder="Ex : Épingle Phénix Dorée"
                      />
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

                    <div className="full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 8, marginTop: 2 }}>
                      <label htmlFor="p-active" style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                        <input
                          type="checkbox"
                          id="p-active"
                          checked={form.is_active}
                          onChange={(e) => set('is_active', e.target.checked)}
                          style={{ width: 16, height: 16, accentColor: 'var(--red)', cursor: 'pointer' }}
                        />
                        <span>Visible sur la boutique</span>
                      </label>
                      <span className={`status ${form.is_active ? 'paid' : 'rejected'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                        {form.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. TARIFICATION & INVENTAIRE */}
                <div className="form-section">
                  <div className="form-section-title">
                    <span>💶</span> Tarification & Inventaire
                  </div>
                  <div className="prod-grid">
                    <div className={form.sales_channel === 'WHOLESALE' ? 'field-disabled' : undefined}>
                      <label htmlFor="p-retail">
                        {t('admin.products.retailPrice', 'Prix de détail (€)')}
                        {form.sales_channel === 'WHOLESALE' && (
                          <span style={{ marginLeft: 6, fontWeight: 400, fontSize: 11, color: 'var(--muted)' }}>
                            (gros uniq.)
                          </span>
                        )}
                      </label>
                      <input
                        id="p-retail"
                        type="number"
                        step="0.01"
                        min="0"
                        required={form.sales_channel !== 'WHOLESALE'}
                        disabled={form.sales_channel === 'WHOLESALE'}
                        value={form.sales_channel === 'WHOLESALE' ? '' : form.retail_price}
                        onChange={(e) => set('retail_price', e.target.value)}
                        placeholder={form.sales_channel === 'WHOLESALE' ? 'Gros uniq.' : '0.00'}
                      />
                    </div>

                    <div className={form.sales_channel === 'RETAIL' ? 'field-disabled' : undefined}>
                      <label htmlFor="p-whole">
                        {t('admin.products.wholesalePrice', 'Prix de gros (€)')}
                        {form.sales_channel === 'RETAIL' && (
                          <span style={{ marginLeft: 6, fontWeight: 400, fontSize: 11, color: 'var(--muted)' }}>
                            (détail uniq.)
                          </span>
                        )}
                      </label>
                      <input
                        id="p-whole"
                        type="number"
                        step="0.01"
                        min="0"
                        required={form.sales_channel !== 'RETAIL'}
                        disabled={form.sales_channel === 'RETAIL'}
                        value={form.sales_channel === 'RETAIL' ? '' : form.wholesale_price}
                        onChange={(e) => set('wholesale_price', e.target.value)}
                        placeholder={form.sales_channel === 'RETAIL' ? 'Détail uniq.' : '0.00'}
                      />
                    </div>

                    <div>
                      <label htmlFor="p-stock">{t('admin.products.stock', 'Stock disponible')}</label>
                      <input id="p-stock" type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
                    </div>

                    <div>
                      <label htmlFor="p-moq">{t('admin.products.moq', 'Quantité min. (MOQ)')}</label>
                      <input id="p-moq" type="number" min="1" value={form.moq} onChange={(e) => set('moq', e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* 3. VISUELS & GALERIE (MODERNE & ÉLÉGANTE) */}
                <div className="form-section">
                  <div className="form-section-title">
                    <span>📸</span> Visuels & Galerie
                  </div>

                  <div className="prod-dropzone-box">
                    <label className="prod-dropzone">
                      <div className="dropzone-icon-circle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="3" y="3" width="18" height="18" rx="3" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="m21 15-5-5L5 21" />
                        </svg>
                      </div>
                      <div className="dropzone-text">
                        <span className="dropzone-title">
                          Glisser des visuels ou <span className="dropzone-action">parcourir</span>
                        </span>
                        <span className="dropzone-hint">PNG, JPG, WebP ou MP4</span>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/gif,image/webp,image/avif,video/mp4,video/webm"
                        onChange={(e) => { addImages(e.target.files); e.target.value = ''; }}
                      />
                    </label>

                    {(form.media.length > 0 || previews.length > 0) && (
                      <div className="prod-media-grid">
                        {form.media.map((m) => (
                          <div className="prod-media-card" key={m.id}>
                            {m.media_type === 'VIDEO' ? (
                              <video src={m.file} muted playsInline preload="metadata" />
                            ) : (
                              <img src={m.file} alt={m.alt_text || form.name} />
                            )}
                            {m.media_type === 'VIDEO' && <span className="prod-media-badge video">Vidéo</span>}
                            {m.id === firstPhotoId && <span className="prod-media-badge primary">Vignette</span>}
                            <button
                              type="button"
                              className="prod-media-delete"
                              title={t('admin.products.deleteMedia', 'Supprimer ce média')}
                              onClick={() => dropMedia(m)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        {previews.map((p, i) => (
                          <div className="prod-media-card pending" key={p.url}>
                            {p.isVideo ? (
                              <video src={p.url} muted playsInline preload="metadata" />
                            ) : (
                              <img src={p.url} alt={`À envoyer ${i + 1}`} />
                            )}
                            <span className="prod-media-badge pending">À envoyer</span>
                            <button
                              type="button"
                              className="prod-media-delete"
                              title={t('admin.products.remove', 'Retirer')}
                              onClick={() => dropPending(i)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. DESCRIPTION */}
                <div className="form-section">
                  <div className="form-section-title">
                    <span>📝</span> Description du produit
                  </div>
                  <label htmlFor="p-desc" style={{ display: 'none' }}>Description</label>
                  <textarea
                    id="p-desc"
                    rows="2"
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Caractéristiques, matériaux, style..."
                  />
                </div>

                {/* ACTIONS DU FORMULAIRE */}
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button className="btn-admin primary" type="submit" disabled={busy} style={{ flex: 1 }}>
                    {busy
                      ? t('admin.products.saving', 'Enregistrement…')
                      : form.id
                      ? t('admin.products.save', 'Enregistrer les modifications')
                      : t('admin.products.createProduct', 'Créer le produit')}
                  </button>
                  {form.id ? (
                    <button className="btn-admin ghost" type="button" onClick={() => openForm({ ...EMPTY })}>
                      {t('admin.products.cancel', 'Annuler')}
                    </button>
                  ) : (
                    <button className="btn-admin ghost" type="button" onClick={closeForm}>
                      Masquer
                    </button>
                  )}
                </div>
              </form>
            </Panel>
          </div>
        )}

        {/* TABLEAU DES PRODUITS (CATALOGUE) */}
        <div className="prod-list-column">
          <Panel title="Catalogue des produits">
            <Toolbar>
              <div className="admin-field">
                {I.search}
                <input
                  placeholder={t('admin.products.searchPlaceholder', 'Rechercher un produit…')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <select className="admin-select" value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="">{t('admin.products.allChannels', 'Tous les canaux')}</option>
                {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <select className="admin-select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                <option value="">Toutes les catégories</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <span className="admin-count">{filteredRows.length} {t('admin.products.results', 'résultat(s)')}</span>
            </Toolbar>

            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.products.tableProduct', 'Produit')}</th>
                    <th>{t('admin.products.tableChannel', 'Canal')}</th>
                    <th>{t('admin.products.tableRetailPrice', 'Prix détail')}</th>
                    <th>{t('admin.products.tableWholesalePrice', 'Prix gros')}</th>
                    <th>{t('admin.products.tableMoq', 'MOQ')}</th>
                    <th>{t('admin.products.tableStock', 'Stock')}</th>
                    <th>{t('admin.products.tableActions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((p) => {
                    const v = p.variants?.[0] || {};
                    return (
                      <tr key={p.id} className={form?.id === p.id ? 'row-editing' : undefined}>
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
                        <td><span className={CHANNEL_PILL[p.sales_channel]}>{p.sales_channel_display}</span></td>
                        <td>{p.sales_channel === 'WHOLESALE' ? <span style={{ color: 'var(--muted)' }}>—</span> : v.retail_price ? `${parseFloat(v.retail_price)} €` : '—'}</td>
                        <td style={{ color: p.sales_channel === 'RETAIL' ? 'var(--muted)' : 'var(--red)', fontWeight: 600 }}>
                          {p.sales_channel === 'RETAIL' ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}>—</span> : v.wholesale_price ? `${parseFloat(v.wholesale_price)} €` : '—'}
                        </td>
                        <td className="cell-sub">{v.moq ?? '—'}</td>
                        <td>
                          <span className={(v.stock ?? 0) === 0 ? 'status rejected' : (v.stock ?? 0) <= 5 ? 'status pending' : 'status paid'}>
                            {v.stock ?? 0}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <span
                              className="icon-btn"
                              title={t('admin.products.edit', 'Modifier')}
                              onClick={() => openForm(toForm(p))}
                            >
                              {I.pencil}
                            </span>
                            <span
                              className="icon-btn reject"
                              title={t('admin.products.delete', 'Supprimer')}
                              onClick={() => remove(p)}
                            >
                              {I.trash}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {loading && <tr><td colSpan="7" className="admin-empty">{t('common.loading', 'Chargement…')}</td></tr>}
                  {!loading && filteredRows.length === 0 && !error && (
                    <tr><td colSpan="7" className="admin-empty">{t('admin.products.empty', 'Aucun produit correspondant.')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
