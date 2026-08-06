import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api.js';
import { I } from './icons.jsx';
import { PageHead, Panel, Toolbar } from './ui.jsx';

export default function StockManagement() {
  const { t } = useTranslation();
  const [variants, setVariants] = useState([]);
  const [movements, setMovements] = useState([]);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'movements'
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'OUT' | 'LOW' | 'OK'
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Formulaire d'ajustement rapide
  const [adjustModal, setAdjustModal] = useState(null); // variant object
  const [adjustDelta, setAdjustDelta] = useState(0);
  const [adjustReason, setAdjustReason] = useState('RESTOCK');
  const [adjustRef, setAdjustRef] = useState('');
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [vData, mData] = await Promise.all([
        api.adminStock({ search: query || undefined }),
        api.adminStockMovements(),
      ]);
      setVariants(vData.results || vData);
      setMovements(mData.results || mData);
    } catch {
      setError(t('admin.stock.loadError', 'Chargement des stocks impossible.'));
    } finally {
      setLoading(false);
    }
  }, [query, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Statistiques globales
  const totalSkus = variants.length;
  const outOfStockCount = variants.filter((v) => (v.stock ?? 0) === 0).length;
  const lowStockCount = variants.filter((v) => (v.stock ?? 0) > 0 && (v.stock ?? 0) <= 5).length;
  const totalUnits = variants.reduce((acc, v) => acc + (v.stock ?? 0), 0);

  // Filtrage des variantes
  const filteredVariants = variants.filter((v) => {
    const stock = v.stock ?? 0;
    if (filterStatus === 'OUT') return stock === 0;
    if (filterStatus === 'LOW') return stock > 0 && stock <= 5;
    if (filterStatus === 'OK') return stock > 5;
    return true;
  });

  const openAdjust = (v) => {
    setAdjustModal(v);
    setAdjustDelta(0);
    setAdjustReason('RESTOCK');
    setAdjustRef('');
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustModal || adjustDelta === 0) return;
    setBusy(true);
    try {
      await api.adminAdjustStock(adjustModal.id, {
        delta: adjustDelta,
        reason: adjustReason,
        reference: adjustRef,
      });
      setAdjustModal(null);
      loadData();
    } catch {
      setError(t('admin.stock.adjustError', "L'ajustement du stock a échoué."));
    } finally {
      setBusy(false);
    }
  };

  const REASON_LABELS = {
    SALE: t('admin.stock.reasonSale', 'Vente (Commande)'),
    RESTOCK: t('admin.stock.reasonRestock', 'Réapprovisionnement'),
    RETURN: t('admin.stock.reasonReturn', 'Retour / Annulation'),
    CORRECTION: t('admin.stock.reasonCorrection', 'Correction Inventaire'),
  };

  return (
    <>
      <PageHead
        title={t('admin.stock.title', 'Gestion & Contrôle des Stocks')}
        subtitle={t('admin.stock.subtitle', 'Supervision du niveau de réserve, inventaires et réapprovisionnements en temps réel')}
      >
        <button className="btn-admin ghost" onClick={loadData} style={{ borderRadius: 20, padding: '9px 18px' }}>
          {I.check} {t('admin.stock.refresh', 'Actualiser les stocks')}
        </button>
      </PageHead>

      {/* CARTES KPI HAUT DE GAMME */}
      <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 26 }}>
        <div className="stat-card" style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid #E6E9EF', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="stat-label" style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {t('admin.stock.totalSkus', 'Références (SKU)')}
            </div>
            <span style={{ fontSize: 18, padding: '6px 10px', background: 'rgba(30,58,95,0.08)', borderRadius: 8, color: 'var(--navy)' }}>📦</span>
          </div>
          <div className="stat-value" style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)', marginTop: 8 }}>{totalSkus}</div>
          <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>Variantes enregistrées</span>
        </div>

        <div className="stat-card" style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid rgba(192,57,43,0.25)', boxShadow: '0 4px 16px rgba(192,57,43,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="stat-label" style={{ fontSize: 12, color: '#C0392B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {t('admin.stock.outOfStock', 'Ruptures de Stock')}
            </div>
            <span style={{ fontSize: 18, padding: '6px 10px', background: 'rgba(192,57,43,0.1)', borderRadius: 8, color: '#C0392B' }}>⚠️</span>
          </div>
          <div className="stat-value" style={{ fontSize: 28, fontWeight: 800, color: '#C0392B', marginTop: 8 }}>
            {outOfStockCount}
          </div>
          <span style={{ fontSize: 11, color: outOfStockCount > 0 ? '#C0392B' : 'var(--muted)', fontWeight: 600, marginTop: 4, display: 'block' }}>
            {outOfStockCount > 0 ? 'Réapprovisionnement urgent requis' : 'Aucune rupture'}
          </span>
        </div>

        <div className="stat-card" style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid rgba(212,175,55,0.35)', boxShadow: '0 4px 16px rgba(212,175,55,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="stat-label" style={{ fontSize: 12, color: '#B8972A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {t('admin.stock.lowStock', 'Stock Faible (≤ 5)')}
            </div>
            <span style={{ fontSize: 18, padding: '6px 10px', background: 'rgba(212,175,55,0.12)', borderRadius: 8, color: '#B8972A' }}>⏳</span>
          </div>
          <div className="stat-value" style={{ fontSize: 28, fontWeight: 800, color: '#B8972A', marginTop: 8 }}>
            {lowStockCount}
          </div>
          <span style={{ fontSize: 11, color: '#B8972A', fontWeight: 600, marginTop: 4, display: 'block' }}>
            Seuil critique atteint
          </span>
        </div>

        <div className="stat-card" style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid rgba(39,174,96,0.25)', boxShadow: '0 4px 16px rgba(39,174,96,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="stat-label" style={{ fontSize: 12, color: '#27AE60', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {t('admin.stock.totalUnits', 'Volume Total')}
            </div>
            <span style={{ fontSize: 18, padding: '6px 10px', background: 'rgba(39,174,96,0.1)', borderRadius: 8, color: '#27AE60' }}>📊</span>
          </div>
          <div className="stat-value" style={{ fontSize: 28, fontWeight: 800, color: '#27AE60', marginTop: 8 }}>{totalUnits}</div>
          <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>Unités physiques disponibles</span>
        </div>
      </div>

      {/* MODAL D'AJUSTEMENT DE LUXE */}
      {adjustModal && (
        <div className="admin-modal-backdrop" onClick={() => setAdjustModal(null)}>
          <div className="admin-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, borderRadius: 18, padding: 28, background: '#fff', boxShadow: '0 20px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: 'var(--navy)' }}>⚡ {t('admin.stock.adjustTitle', 'Ajustement du Stock')}</h3>
              <button onClick={() => setAdjustModal(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            </div>

            <div style={{ background: '#F8F7F4', borderRadius: 10, padding: 14, marginBottom: 18, border: '1px solid #EAEAE8' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--navy)' }}>
                {adjustModal.product_name || adjustModal.sku}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span>SKU: {adjustModal.sku}</span>
                <span>Stock Actuel: <strong style={{ color: 'var(--navy)' }}>{adjustModal.stock} pièce(s)</strong></span>
              </div>
            </div>

            <form onSubmit={handleAdjustSubmit} className="admin-form">
              <div className="field">
                <label>{t('admin.stock.adjustType', 'Variation (+ ou -)')}</label>
                <input
                  type="number"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(Number(e.target.value))}
                  placeholder="ex: +10 ou -2"
                  style={{ fontSize: 16, fontWeight: 700, textAlign: 'center', background: '#FAF9F6', borderRadius: 10 }}
                  required
                />
                <div style={{ marginTop: 8, padding: '8px 12px', background: adjustDelta > 0 ? '#E6F7EF' : adjustDelta < 0 ? '#FDE9E8' : '#F2F4F7', borderRadius: 8, fontSize: 12, color: adjustDelta > 0 ? '#1FA971' : adjustDelta < 0 ? '#E1251B' : 'var(--muted)', textAlign: 'center', fontWeight: 600 }}>
                  Nouveau stock estimé : {Math.max(0, (adjustModal.stock || 0) + (adjustDelta || 0))} pièce(s)
                </div>
              </div>

              <div className="field" style={{ marginTop: 14 }}>
                <label>{t('admin.stock.reason', 'Raison du mouvement')}</label>
                <select value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} style={{ borderRadius: 8 }}>
                  <option value="RESTOCK">{REASON_LABELS.RESTOCK}</option>
                  <option value="CORRECTION">{REASON_LABELS.CORRECTION}</option>
                  <option value="RETURN">{REASON_LABELS.RETURN}</option>
                  <option value="SALE">{REASON_LABELS.SALE}</option>
                </select>
              </div>

              <div className="field" style={{ marginTop: 14 }}>
                <label>{t('admin.stock.reference', 'Note / Référence du bon')}</label>
                <input
                  type="text"
                  placeholder="ex: BL-2026-09 ou Inventaire de printemps"
                  value={adjustRef}
                  onChange={(e) => setAdjustRef(e.target.value)}
                  style={{ borderRadius: 8 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn-admin ghost" onClick={() => setAdjustModal(null)} style={{ borderRadius: 20 }}>
                  {t('common.cancel', 'Annuler')}
                </button>
                <button type="submit" className="btn-admin primary" disabled={busy || adjustDelta === 0} style={{ borderRadius: 20, padding: '10px 24px' }}>
                  {busy ? t('common.saving', 'Enregistrement…') : t('common.confirm', 'Valider le mouvement')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BARRE D'ONGLETS PULL-TAB */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, borderBottom: '2px solid #EAEAE8', paddingBottom: 2 }}>
        <button
          onClick={() => setActiveTab('inventory')}
          style={{
            padding: '10px 22px', fontSize: 13.5, fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer',
            color: activeTab === 'inventory' ? 'var(--brand-red, #C0392B)' : 'var(--muted)',
            borderBottom: activeTab === 'inventory' ? '3px solid var(--brand-red, #C0392B)' : '3px solid transparent',
            marginBottom: -2, transition: 'all .2s ease'
          }}
        >
          📦 {t('admin.stock.tabInventory', 'Inventaire des Variantes')}
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          style={{
            padding: '10px 22px', fontSize: 13.5, fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer',
            color: activeTab === 'movements' ? 'var(--brand-red, #C0392B)' : 'var(--muted)',
            borderBottom: activeTab === 'movements' ? '3px solid var(--brand-red, #C0392B)' : '3px solid transparent',
            marginBottom: -2, transition: 'all .2s ease'
          }}
        >
          📜 {t('admin.stock.tabMovements', 'Historique des Mouvements')}
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <Panel>
          <Toolbar>
            <div className="admin-field">
              {I.search}
              <input
                placeholder={t('admin.stock.searchPlaceholder', 'Filtrer par SKU ou produit…')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="admin-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">{t('admin.stock.filterAll', 'Tous les niveaux de stock')}</option>
              <option value="OUT">{t('admin.stock.filterOut', 'Ruptures de stock (0)')}</option>
              <option value="LOW">{t('admin.stock.filterLow', 'Stock faible (1 à 5)')}</option>
              <option value="OK">{t('admin.stock.filterOk', 'Stock suffisant (> 5)')}</option>
            </select>
            <span className="admin-count">
              {filteredVariants.length} {t('admin.stock.results', 'référence(s)')}
            </span>
          </Toolbar>

          {error && <p className="admin-login-error">{error}</p>}

          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.stock.colSku', 'SKU / Référence')}</th>
                <th>{t('admin.stock.colProduct', 'Produit')}</th>
                <th>{t('admin.stock.colRetailPrice', 'Prix Détail')}</th>
                <th>{t('admin.stock.colWholesalePrice', 'Prix Gros')}</th>
                <th>{t('admin.stock.colStock', 'Stock Disponible')}</th>
                <th>{t('admin.stock.colAction', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredVariants.map((v) => {
                const stock = v.stock ?? 0;
                return (
                  <tr key={v.id}>
                    <td className="cell-sub" style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--navy)' }}>{v.sku}</td>
                    <td className="cell-main" style={{ fontWeight: 600 }}>{v.product_name || v.product?.name || '—'}</td>
                    <td style={{ fontWeight: 500 }}>{v.retail_price ? `${parseFloat(v.retail_price).toFixed(2)} €` : '—'}</td>
                    <td style={{ color: 'var(--navy)', fontWeight: 700 }}>
                      {v.wholesale_price ? `${parseFloat(v.wholesale_price).toFixed(2)} €` : '—'}
                    </td>
                    <td>
                      <span className={stock === 0 ? 'status rejected' : stock <= 5 ? 'status pending' : 'status paid'} style={{ fontWeight: 700, padding: '5px 12px', borderRadius: 20 }}>
                        {stock === 0 ? '🔴 0 (Rupture)' : stock <= 5 ? `🟡 ${stock} (Stock Faible)` : `🟢 ${stock} pièces`}
                      </span>
                    </td>
                    <td>
                      <button className="btn-admin ghost" style={{ padding: '6px 14px', fontSize: 12, borderRadius: 20, border: '1px solid rgba(192,57,43,0.3)', color: 'var(--brand-red, #C0392B)', fontWeight: 600 }} onClick={() => openAdjust(v)}>
                        {I.pencil} {t('admin.stock.adjustBtn', 'Ajuster')}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {loading && (
                <tr>
                  <td colSpan="6" className="admin-empty">
                    {t('common.loading', 'Chargement…')}
                  </td>
                </tr>
              )}
              {!loading && filteredVariants.length === 0 && !error && (
                <tr>
                  <td colSpan="6" className="admin-empty">
                    {t('admin.stock.emptyInventory', 'Aucun produit ne correspond à vos critères.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>
      ) : (
        <Panel>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.stock.colDate', 'Date & Heure')}</th>
                <th>{t('admin.stock.colSku', 'SKU / Référence')}</th>
                <th>{t('admin.stock.colProduct', 'Produit')}</th>
                <th>{t('admin.stock.colDelta', 'Mouvement')}</th>
                <th>{t('admin.stock.colReason', 'Raison')}</th>
                <th>{t('admin.stock.colRef', 'Référence / Note')}</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="cell-sub">{new Date(m.created_at).toLocaleString('fr-FR')}</td>
                  <td style={{ fontWeight: 600 }}>{m.variant_sku}</td>
                  <td>{m.product_name}</td>
                  <td>
                    <span
                      style={{
                        fontWeight: 700,
                        color: m.quantity_delta > 0 ? '#2e7d32' : '#c62828',
                      }}
                    >
                      {m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta}
                    </span>
                  </td>
                  <td>
                    <span className="tag-pill">
                      {REASON_LABELS[m.reason] || m.reason_display}
                    </span>
                  </td>
                  <td className="cell-sub">{m.reference || '—'}</td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan="6" className="admin-empty">
                    {t('common.loading', 'Chargement…')}
                  </td>
                </tr>
              )}
              {!loading && movements.length === 0 && !error && (
                <tr>
                  <td colSpan="6" className="admin-empty">
                    {t('admin.stock.emptyMovements', 'Aucun mouvement de stock enregistré pour le moment.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}
