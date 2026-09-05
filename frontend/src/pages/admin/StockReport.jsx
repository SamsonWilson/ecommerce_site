import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api.js';
import { I } from './icons.jsx';
import { PageHead, Panel, Toolbar } from './ui.jsx';

const numberFmt = (value) =>
  Number(value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function StockReport() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [movements, setMovements] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [productsResponse, movementsResponse] = await Promise.all([
        api.adminProducts({ search: query || undefined }),
        api.adminStockMovements(),
      ]);

      const products = Array.isArray(productsResponse) ? productsResponse : (productsResponse?.results || []);
      const movementList = Array.isArray(movementsResponse) ? movementsResponse : (movementsResponse?.results || []);
      setMovements(movementList);

      const report = products
        .map((product) => {
          const variants = Array.isArray(product.variants) ? product.variants : [];
          const totalStock = variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
          const stockStatus = totalStock === 0 ? 'OUT' : totalStock <= 5 ? 'LOW' : 'OK';
          const skus = variants.map((variant) => variant.sku).filter(Boolean);
          const minPrice = variants.length
            ? Math.min(...variants.map((variant) => Number(variant.retail_price || 0)))
            : 0;
          const maxPrice = variants.length
            ? Math.max(...variants.map((variant) => Number(variant.retail_price || 0)))
            : 0;

          return {
            id: product.id,
            name: product.name || 'Produit sans nom',
            category: product.category_name || 'Sans catégorie',
            totalStock,
            variantCount: variants.length,
            skus,
            status: stockStatus,
            minPrice,
            maxPrice,
          };
        })
        .filter((row) => {
          if (!query) return true;
          const haystack = `${row.name} ${row.category} ${row.skus.join(' ')}`.toLowerCase();
          return haystack.includes(query.toLowerCase());
        })
        .sort((a, b) => {
          if (b.totalStock !== a.totalStock) return b.totalStock - a.totalStock;
          return a.name.localeCompare(b.name);
        });

      setRows(report);
    } catch {
      setError(t('admin.stockReport.loadError', 'Le rapport de stock est indisponible pour le moment.'));
    } finally {
      setLoading(false);
    }
  }, [query, t]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const filteredRows = useMemo(() => {
    if (statusFilter === 'OUT') return rows.filter((row) => row.status === 'OUT');
    if (statusFilter === 'LOW') return rows.filter((row) => row.status === 'LOW');
    if (statusFilter === 'OK') return rows.filter((row) => row.status === 'OK');
    return rows;
  }, [rows, statusFilter]);

  const totalProducts = rows.length;
  const totalUnits = rows.reduce((sum, row) => sum + row.totalStock, 0);
  const outOfStockProducts = rows.filter((row) => row.status === 'OUT').length;
  const lowStockProducts = rows.filter((row) => row.status === 'LOW').length;

  const selectedProduct = rows.find((row) => row.id === selectedProductId) || null;

  const selectedProductHistory = useMemo(() => {
    if (!selectedProduct) return [];
    return movements
      .filter((movement) => {
        const movementName = (movement.product_name || '').toLowerCase();
        const selectedName = (selectedProduct.name || '').toLowerCase();
        return movementName === selectedName;
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [movements, selectedProduct]);

  const selectedProductRenewal = selectedProductHistory.find((movement) => Number(movement.quantity_delta || 0) > 0) || null;

  const exportCsv = () => {
    const headers = ['Produit', 'Catégorie', 'Variantes', 'SKU', 'Stock total', 'Statut', 'Prix min', 'Prix max'];
    const csvRows = filteredRows.map((row) => [
      row.name,
      row.category,
      row.variantCount,
      row.skus.join(' / '),
      row.totalStock,
      row.status === 'OUT' ? 'Rupture' : row.status === 'LOW' ? 'Faible' : 'OK',
      numberFmt(row.minPrice),
      numberFmt(row.maxPrice),
    ]);

    const content = [headers, ...csvRows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const uri = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = uri;
    link.download = `rapport_stock_maison_lian_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(uri);
  };

  return (
    <>
      <PageHead
        title={t('admin.stockReport.title', 'Rapport de stock par produit')}
        subtitle={t('admin.stockReport.subtitle', 'Vue synthétique du stock par produit, par famille et par degré d’urgence.')}
      >
        <button type="button" className="btn-admin ghost no-print" onClick={loadReport} style={{ borderRadius: 20, padding: '9px 18px' }}>
          {I.check} {t('admin.stockReport.refresh', 'Actualiser')}
        </button>
        <button type="button" className="btn-admin ghost no-print" onClick={() => window.print()} style={{ borderRadius: 20, padding: '9px 18px' }}>
          🖨️ Imprimer
        </button>
        <button type="button" className="btn-admin primary no-print" onClick={exportCsv} style={{ borderRadius: 20, padding: '9px 20px' }}>
          {I.pdf} {t('admin.stockReport.export', 'Exporter CSV')}
        </button>
      </PageHead>

      <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 26 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid #E6E9EF', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {t('admin.stockReport.totalProducts', 'Produits suivis')}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--navy)', marginTop: 8 }}>{totalProducts}</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid rgba(39,174,96,0.25)', boxShadow: '0 4px 16px rgba(39,174,96,0.06)' }}>
          <div style={{ fontSize: 12, color: '#27AE60', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {t('admin.stockReport.totalUnits', 'Unités en stock')}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#27AE60', marginTop: 8 }}>{totalUnits}</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid rgba(192,57,43,0.25)', boxShadow: '0 4px 16px rgba(192,57,43,0.06)' }}>
          <div style={{ fontSize: 12, color: '#C0392B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {t('admin.stockReport.outOfStock', 'Ruptures')}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#C0392B', marginTop: 8 }}>{outOfStockProducts}</div>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid rgba(212,175,55,0.35)', boxShadow: '0 4px 16px rgba(212,175,55,0.06)' }}>
          <div style={{ fontSize: 12, color: '#B8972A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {t('admin.stockReport.lowStock', 'Stock faible')}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: '#B8972A', marginTop: 8 }}>{lowStockProducts}</div>
        </div>
      </div>

      <Panel>
        {selectedProduct && (
          <div className="stock-report-detail" style={{ marginBottom: 18, background: '#F8F7F4', border: '1px solid #EDEAE2', borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Produit sélectionné
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', marginTop: 4 }}>{selectedProduct.name}</div>
              </div>
              <button type="button" className="btn-admin ghost" onClick={() => setSelectedProductId(null)} style={{ borderRadius: 20 }}>
                Réinitialiser
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 16 }}>
              <div style={{ background: '#fff', borderRadius: 10, padding: 12, border: '1px solid #ECEBE7' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Stock actuel</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--navy)', marginTop: 6 }}>{selectedProduct.totalStock}</div>
              </div>

              <div style={{ background: '#fff', borderRadius: 10, padding: 12, border: '1px solid #ECEBE7' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Dernier renouvellement</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#27AE60', marginTop: 6 }}>
                  {selectedProductRenewal ? new Date(selectedProductRenewal.created_at).toLocaleString('fr-FR') : 'Aucun renouvellement connu'}
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 10, padding: 12, border: '1px solid #ECEBE7' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Quantité ajoutée</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', marginTop: 6 }}>
                  {selectedProductRenewal ? `+${selectedProductRenewal.quantity_delta} unités` : '—'}
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 10, padding: 12, border: '1px solid #ECEBE7' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700 }}>Référence</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', marginTop: 6 }}>
                  {selectedProductRenewal?.reference || '—'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 22 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
                Historique complet du produit
              </div>
              {selectedProductHistory.length === 0 ? (
                <div style={{ background: '#fff', border: '1px solid #ECEBE7', borderRadius: 10, padding: 14, color: 'var(--muted)' }}>
                  Aucun mouvement enregistré pour ce produit.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #ECEBE7', borderRadius: 12, background: '#fff' }}>
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Quantité</th>
                        <th>Raison</th>
                        <th>Référence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProductHistory.map((movement) => {
                        const delta = Number(movement.quantity_delta || 0);
                        const isPositive = delta > 0;
                        const type = isPositive ? 'Ajout' : 'Retrait';
                        const reason = movement.reason || 'CORRECTION';
                        return (
                          <tr key={movement.id}>
                            <td>{new Date(movement.created_at).toLocaleString('fr-FR')}</td>
                            <td>
                              <span style={{
                                display: 'inline-flex',
                                padding: '6px 10px',
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 700,
                                color: isPositive ? '#27AE60' : '#C0392B',
                                background: isPositive ? '#E6F7EF' : '#FDE9E8',
                              }}>
                                {type}
                              </span>
                            </td>
                            <td style={{ color: isPositive ? '#27AE60' : '#C0392B', fontWeight: 700 }}>
                              {isPositive ? '+' : ''}{delta}
                            </td>
                            <td>{reason}</td>
                            <td>{movement.reference || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        <Toolbar>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('admin.stockReport.searchPlaceholder', 'Chercher un produit, SKU ou catégorie…')}
              style={{ minWidth: 280, borderRadius: 8 }}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ borderRadius: 8 }}>
              <option value="ALL">{t('admin.stockReport.filterAll', 'Tous les stocks')}</option>
              <option value="OUT">{t('admin.stockReport.filterOut', 'Ruptures')}</option>
              <option value="LOW">{t('admin.stockReport.filterLow', 'Faible')}</option>
              <option value="OK">{t('admin.stockReport.filterOk', 'Satisfaisant')}</option>
            </select>
          </div>

          <span className="admin-count">
            {filteredRows.length} {t('admin.stockReport.result', 'produit(s)')}
          </span>
        </Toolbar>

        {error && <div className="admin-alert danger">{error}</div>}

        {loading ? (
          <div className="admin-empty" style={{ padding: '28px 0' }}>{t('common.loading', 'Chargement…')}</div>
        ) : filteredRows.length === 0 ? (
          <div className="admin-empty" style={{ padding: '28px 0' }}>
            {t('admin.stockReport.empty', 'Aucun produit ne correspond à ce filtre.')}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.stockReport.colProduct', 'Produit')}</th>
                  <th>{t('admin.stockReport.colCategory', 'Catégorie')}</th>
                  <th>{t('admin.stockReport.colVariations', 'Déclinaisons')}</th>
                  <th>{t('admin.stockReport.colSkus', 'SKU')}</th>
                  <th>{t('admin.stockReport.colStock', 'Stock total')}</th>
                  <th>{t('admin.stockReport.colStatus', 'État')}</th>
                  <th>{t('admin.stockReport.colPrice', 'Prix détail')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedProductId((prev) => prev === row.id ? null : row.id)}
                    style={{ cursor: 'pointer', background: selectedProductId === row.id ? '#F6F8FF' : undefined }}
                  >
                    <td>
                      <strong>{row.name}</strong>
                    </td>
                    <td>{row.category}</td>
                    <td>{row.variantCount}</td>
                    <td>{row.skus.length ? row.skus.join(' / ') : '—'}</td>
                    <td>
                      <strong style={{ color: row.totalStock === 0 ? '#C0392B' : row.totalStock <= 5 ? '#B8972A' : '#27AE60' }}>
                        {row.totalStock}
                      </strong>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          padding: '6px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          color: row.status === 'OUT' ? '#C0392B' : row.status === 'LOW' ? '#B8972A' : '#27AE60',
                          background: row.status === 'OUT' ? '#FDE9E8' : row.status === 'LOW' ? '#FFF5D6' : '#E6F7EF',
                        }}
                      >
                        {row.status === 'OUT' ? t('admin.stockReport.statusOut', 'Rupture') : row.status === 'LOW' ? t('admin.stockReport.statusLow', 'Faible') : t('admin.stockReport.statusOk', 'OK')}
                      </span>
                    </td>
                    <td>{formatCurrency(row.minPrice)}{row.variantCount > 1 ? ` - ${formatCurrency(row.maxPrice)}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
