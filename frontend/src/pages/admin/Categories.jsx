import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api.js';
import { I } from './icons.jsx';
import { PageHead, Panel } from './ui.jsx';

const EMPTY_CAT = { name: '', slug: '' };
const EMPTY_COLOR = { name: '', slug: '', hex_code: '#B08A34' };

export default function Categories() {
  const { t } = useTranslation();
  const [cats, setCats] = useState([]);
  const [colors, setColors] = useState([]);
  const [catForm, setCatForm] = useState({ ...EMPTY_CAT });
  const [colorForm, setColorForm] = useState({ ...EMPTY_COLOR });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [c, k] = await Promise.all([api.adminCategories(), api.adminColors()]);
      setCats(c.results || c);
      setColors(k.results || k);
    } catch (e) {
      setError(e.status === 403 ? t('admin.categories.forbidden', 'Accès réservé aux administrateurs.') : t('admin.categories.loadError', 'Chargement impossible.'));
    } finally { setLoading(false); }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const readErr = (e, fallback) => {
    const d = e.data || {};
    return d.name?.[0] || d.slug?.[0] || d.hex_code?.[0] || d.detail || fallback;
  };

  const saveCat = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const body = { name: catForm.name, slug: catForm.slug };
      if (catForm.id) await api.adminUpdateCategory(catForm.id, body);
      else await api.adminCreateCategory(body);
      setCatForm({ ...EMPTY_CAT });
      load();
    } catch (err) {
      setError(readErr(err, t('admin.categories.saveCatError', "L'enregistrement de la catégorie a échoué.")));
    } finally { setBusy(false); }
  };

  const deleteCat = async (c) => {
    const warn = c.product_count
      ? `« ${c.name} » contient ${c.product_count} produit(s).\nIls ne seront pas supprimés mais se retrouveront sans catégorie.\n\nContinuer ?`
      : `Supprimer la catégorie « ${c.name} » ?`;
    if (!window.confirm(warn)) return;
    setError('');
    try {
      await api.adminDeleteCategory(c.id);
      if (catForm.id === c.id) setCatForm({ ...EMPTY_CAT });
      load();
    } catch (err) { setError(readErr(err, t('admin.categories.deleteError', 'Suppression impossible.'))); }
  };

  const saveColor = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const body = { name: colorForm.name, slug: colorForm.slug, hex_code: colorForm.hex_code };
      if (colorForm.id) await api.adminUpdateColor(colorForm.id, body);
      else await api.adminCreateColor(body);
      setColorForm({ ...EMPTY_COLOR });
      load();
    } catch (err) {
      setError(readErr(err, t('admin.categories.saveColorError', "L'enregistrement du coloris a échoué.")));
    } finally { setBusy(false); }
  };

  const deleteColor = async (c) => {
    if (!window.confirm(`Supprimer le coloris « ${c.name} » ?`)) return;
    setError('');
    try {
      await api.adminDeleteColor(c.id);
      if (colorForm.id === c.id) setColorForm({ ...EMPTY_COLOR });
      load();
    } catch (err) { setError(readErr(err, t('admin.categories.deleteError', 'Suppression impossible.'))); }
  };

  return (
    <>
      <PageHead
        title={t('admin.categories.title', 'Gestion des catégories')}
        subtitle={`${cats.length} ${t('admin.categories.categories', 'catégorie(s)')} · ${colors.length} ${t('admin.categories.colors', 'coloris')}`}
      >
        <button className="btn-admin ghost" onClick={load}>{I.check}{t('admin.categories.refresh', 'Actualiser')}</button>
      </PageHead>

      {error && <p className="admin-login-error">{error}</p>}

      <div className="admin-row cols-2-1">
        <Panel title={t('admin.categories.categories', 'Catégories')}>
          <table className="admin-table">
            <thead><tr><th>{t('admin.categories.tableName', 'Nom')}</th><th>{t('admin.categories.tableSlug', 'Slug (URL)')}</th><th>{t('admin.categories.tableProducts', 'Produits')}</th><th>{t('admin.categories.tableActions', 'Actions')}</th></tr></thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id} className={catForm.id === c.id ? 'row-editing' : undefined}>
                  <td className="cell-main">{c.name}</td>
                  <td className="cell-sub">/{c.slug}</td>
                  <td>
                    <span className={c.product_count ? 'status paid' : 'status pending'}>
                      {c.product_count}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <span className="icon-btn" title={t('admin.categories.edit', 'Modifier')}
                        onClick={() => { setCatForm({ id: c.id, name: c.name, slug: c.slug }); setError(''); }}>
                        {I.pencil}
                      </span>
                      <span className="icon-btn reject" title={t('admin.categories.delete', 'Supprimer')} onClick={() => deleteCat(c)}>
                        {I.trash}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {loading && <tr><td colSpan="4" className="admin-empty">{t('common.loading', 'Chargement…')}</td></tr>}
              {!loading && cats.length === 0 && (
                <tr><td colSpan="4" className="admin-empty">{t('admin.categories.emptyCat', 'Aucune catégorie. Créez-en une ci-contre.')}</td></tr>
              )}
            </tbody>
          </table>
        </Panel>

        <Panel title={catForm.id ? t('admin.categories.editCat', 'Modifier la catégorie') : t('admin.categories.newCat', 'Nouvelle catégorie')}>
          <form className="admin-form" onSubmit={saveCat}>
            <label htmlFor="c-name">{t('admin.categories.tableName', 'Nom')}</label>
            <input id="c-name" required value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              placeholder="Ex. Colliers" />

            <label htmlFor="c-slug" style={{ marginTop: 12 }}>{t('admin.categories.slugOptional', 'Slug (facultatif)')}</label>
            <input id="c-slug" value={catForm.slug}
              onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
              placeholder="généré depuis le nom" />
            <p className="cell-sub" style={{ marginTop: 6, lineHeight: 1.5 }}>
              {t('admin.categories.slugHint', "Le slug apparaît dans l'URL. Le modifier change l'adresse de la page.")}
            </p>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="btn-admin primary" type="submit" disabled={busy}>
                {catForm.id ? I.check : I.plus}{catForm.id ? t('admin.categories.save', 'Enregistrer') : t('admin.categories.add', 'Ajouter')}
              </button>
              {catForm.id && (
                <button className="btn-admin ghost" type="button" onClick={() => setCatForm({ ...EMPTY_CAT })}>
                  {t('admin.categories.cancel', 'Annuler')}
                </button>
              )}
            </div>
          </form>
        </Panel>
      </div>

      <div className="admin-row cols-2-1">
        <Panel title={t('admin.categories.colors', 'Coloris')}>
          <table className="admin-table">
            <thead><tr><th>{t('admin.categories.tableColor', 'Coloris')}</th><th>{t('admin.categories.tableCode', 'Code')}</th><th>{t('admin.categories.tableProducts', 'Produits')}</th><th>{t('admin.categories.tableActions', 'Actions')}</th></tr></thead>
            <tbody>
              {colors.map((c) => (
                <tr key={c.id} className={colorForm.id === c.id ? 'row-editing' : undefined}>
                  <td>
                    <div className="cell-flex">
                      <span className="color-dot" style={{ background: c.hex_code }} />
                      <span className="cell-main">{c.name}</span>
                    </div>
                  </td>
                  <td className="cell-sub">{c.hex_code}</td>
                  <td>
                    <span className={c.product_count ? 'status paid' : 'status pending'}>
                      {c.product_count}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <span className="icon-btn" title={t('admin.categories.edit', 'Modifier')}
                        onClick={() => { setColorForm({ id: c.id, name: c.name, slug: c.slug, hex_code: c.hex_code }); setError(''); }}>
                        {I.pencil}
                      </span>
                      <span className="icon-btn reject" title={t('admin.categories.delete', 'Supprimer')} onClick={() => deleteColor(c)}>
                        {I.trash}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && colors.length === 0 && (
                <tr><td colSpan="4" className="admin-empty">{t('admin.categories.emptyColor', 'Aucun coloris.')}</td></tr>
              )}
            </tbody>
          </table>
        </Panel>

        <Panel title={colorForm.id ? t('admin.categories.editColor', 'Modifier le coloris') : t('admin.categories.newColor', 'Nouveau coloris')}>
          <form className="admin-form" onSubmit={saveColor}>
            <label htmlFor="k-name">{t('admin.categories.tableName', 'Nom')}</label>
            <input id="k-name" required value={colorForm.name}
              onChange={(e) => setColorForm({ ...colorForm, name: e.target.value })}
              placeholder="Ex. Rouge cinabre" />

            <label htmlFor="k-hex" style={{ marginTop: 12 }}>{t('admin.categories.colorHex', 'Couleur')}</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input id="k-hex" type="color" style={{ width: 52, height: 38, padding: 2 }}
                value={colorForm.hex_code}
                onChange={(e) => setColorForm({ ...colorForm, hex_code: e.target.value })} />
              <input value={colorForm.hex_code}
                onChange={(e) => setColorForm({ ...colorForm, hex_code: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="btn-admin primary" type="submit" disabled={busy}>
                {colorForm.id ? I.check : I.plus}{colorForm.id ? t('admin.categories.save', 'Enregistrer') : t('admin.categories.add', 'Ajouter')}
              </button>
              {colorForm.id && (
                <button className="btn-admin ghost" type="button" onClick={() => setColorForm({ ...EMPTY_COLOR })}>
                  {t('admin.categories.cancel', 'Annuler')}
                </button>
              )}
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
}
