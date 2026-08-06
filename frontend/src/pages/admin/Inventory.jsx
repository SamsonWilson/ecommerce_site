import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api.js';
import { useAuth } from '../../store/auth.js';
import { I } from './icons.jsx';
import { PageHead, Panel, Toolbar } from './ui.jsx';

export default function Inventory() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);

  const [variants, setVariants] = useState([]);
  const [counts, setCounts] = useState({}); // { [variantId]: physicalNumber }
  const [notes, setNotes] = useState({});  // { [variantId]: noteString }
  const [query, setQuery] = useState('');
  const [filterDiscrepancy, setFilterDiscrepancy] = useState('ALL'); // 'ALL' | 'DIFF' | 'MATCH'
  const [blindMode, setBlindMode] = useState(false); // Mode comptage à aveugle
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal de Sécurisation par PIN Responsable
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [auditRefNote, setAuditRefNote] = useState('');
  const [pinError, setPinError] = useState('');

  const loadVariants = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const vData = await api.adminStock({ search: query || undefined });
      const items = vData.results || vData;
      setVariants(items);
      const initialCounts = {};
      items.forEach((v) => {
        initialCounts[v.id] = v.stock ?? 0;
      });
      setCounts(initialCounts);
    } catch {
      setErrorMsg(t('admin.inventory.loadError', "Impossible de charger la liste d'inventaire."));
    } finally {
      setLoading(false);
    }
  }, [query, t]);

  useEffect(() => {
    loadVariants();
  }, [loadVariants]);

  const handleCountChange = (id, val) => {
    const num = val === '' ? '' : Math.max(0, parseInt(val, 10) || 0);
    setCounts((prev) => ({ ...prev, [id]: num }));
  };

  const handleNoteChange = (id, text) => {
    setNotes((prev) => ({ ...prev, [id]: text }));
  };

  const resetPhysicalToTheoretical = () => {
    const reset = {};
    variants.forEach((v) => {
      reset[v.id] = v.stock ?? 0;
    });
    setCounts(reset);
  };

  // Metrics
  let totalDiscrepancies = 0;
  let totalValueImpact = 0; // €

  const itemsWithMetrics = variants.map((v) => {
    const theoretical = v.stock ?? 0;
    const physical = counts[v.id] !== undefined && counts[v.id] !== '' ? Number(counts[v.id]) : theoretical;
    const delta = physical - theoretical;
    const price = parseFloat(v.retail_price || v.wholesale_price || 0);
    const impact = delta * price;

    if (delta !== 0) {
      totalDiscrepancies += 1;
      totalValueImpact += impact;
    }

    return { ...v, theoretical, physical, delta, impact };
  });

  const filteredItems = itemsWithMetrics.filter((item) => {
    if (filterDiscrepancy === 'DIFF') return item.delta !== 0;
    if (filterDiscrepancy === 'MATCH') return item.delta === 0;
    return true;
  });

  // Ouverture du modal de validation sécurisée
  const openSecurityValidation = () => {
    const diffs = itemsWithMetrics.filter((item) => item.delta !== 0);
    if (diffs.length === 0) {
      alert(t('admin.inventory.noDiffs', 'Aucun écart de stock constaté. Tout est déjà conforme !'));
      return;
    }
    setManagerPin('');
    setAuditRefNote(`Session Inventaire - Validé par ${user?.first_name || 'Admin'} le ${new Date().toLocaleDateString('fr-FR')}`);
    setPinError('');
    setSecurityModalOpen(true);
  };

  // Exécution sécurisée après contrôle PIN
  const handleSecureSubmit = async (e) => {
    e.preventDefault();
    // Le code PIN par défaut est 1234 ou 0000
    if (managerPin !== '1234' && managerPin !== '0000') {
      setPinError('Code PIN Responsable incorrect. (Code par défaut: 1234)');
      return;
    }

    const diffs = itemsWithMetrics.filter((item) => item.delta !== 0);
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    setSecurityModalOpen(false);

    try {
      for (const item of diffs) {
        await api.adminAdjustStock(item.id, {
          delta: item.delta,
          reason: 'CORRECTION',
          reference: notes[item.id]
            ? `[Secured Audit] ${notes[item.id]} (${auditRefNote})`
            : `[Secured Audit] Inventaire Physique (${auditRefNote})`,
        });
      }
      setSuccessMsg(
        t(
          'admin.inventory.successMsg',
          `Inventaire sécurisé validé avec succès ! ${diffs.length} stock(s) ajusté(s) (Signé par ${user?.first_name || 'Superviseur'}).`
        )
      );
      await loadVariants();
    } catch {
      setErrorMsg(t('admin.inventory.saveError', "Une erreur est survenue lors de la validation sécurisée de l'inventaire."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHead
        title={t('admin.inventory.title', 'Inventaire Physique & Contrôle Sécurisé')}
        subtitle={t('admin.inventory.subtitle', 'Protocole de comptage à aveugle, traçabilité et validation par code PIN')}
      >
        <button
          className="btn-admin ghost no-print"
          onClick={() => setBlindMode(!blindMode)}
          style={{
            borderRadius: 20,
            border: blindMode ? '1px solid var(--brand-red, #C0392B)' : undefined,
            color: blindMode ? 'var(--brand-red, #C0392B)' : undefined,
            fontWeight: 600,
          }}
        >
          {blindMode ? '👁️ Mode Normal' : '🙈 Mode Comptage à Aveugle'}
        </button>

        <button className="btn-admin ghost no-print" onClick={resetPhysicalToTheoretical} style={{ borderRadius: 20 }}>
          🔄 Réinitialiser
        </button>

        <button className="btn-admin ghost no-print" onClick={() => window.print()} style={{ borderRadius: 20 }}>
          🖨️ Imprimer la fiche
        </button>

        <button
          className="btn-admin primary no-print"
          onClick={openSecurityValidation}
          disabled={saving || totalDiscrepancies === 0}
          style={{
            borderRadius: 20,
            padding: '9px 22px',
            background: totalDiscrepancies > 0 ? 'var(--brand-red, #C0392B)' : '#A0AAB8',
            boxShadow: totalDiscrepancies > 0 ? '0 4px 12px rgba(192,57,43,0.3)' : undefined,
          }}
        >
          🔒 {saving ? 'Validation…' : `Valider la session (${totalDiscrepancies} écarts)`}
        </button>
      </PageHead>

      {/* MODAL DE SÉCURITÉ PIN DE VALIDATION */}
      {securityModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setSecurityModalOpen(false)}>
          <div
            className="admin-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 460, borderRadius: 18, padding: 28, background: '#fff', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 8 }}>
                🔒 Validation d'Inventaire Sécurisée
              </h3>
              <button onClick={() => setSecurityModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            </div>

            <div style={{ background: '#F8F7F4', borderRadius: 10, padding: 14, marginBottom: 18, border: '1px solid #EAEAE8' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                Régularisation globale en attente :
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                <span>Références à modifier : <strong style={{ color: '#C0392B' }}>{totalDiscrepancies} article(s)</strong></span>
                <span>Impact financier : <strong style={{ color: totalValueImpact < 0 ? '#C0392B' : '#27AE60' }}>{totalValueImpact.toFixed(2)} €</strong></span>
              </div>
            </div>

            <form onSubmit={handleSecureSubmit} className="admin-form">
              <div className="field">
                <label style={{ fontWeight: 700, color: 'var(--navy)' }}>Code PIN Responsable (Authentification)</label>
                <input
                  type="password"
                  maxLength="6"
                  placeholder="Saisissez le PIN (ex: 1234)"
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  style={{ fontSize: 20, letterSpacing: '0.3em', textAlign: 'center', borderRadius: 10, background: '#FAF9F6' }}
                  autoFocus
                  required
                />
                {pinError && (
                  <div style={{ fontSize: 11.5, color: '#C0392B', fontWeight: 600, marginTop: 6, textAlign: 'center' }}>
                    ⚠️ {pinError}
                  </div>
                )}
              </div>

              <div className="field" style={{ marginTop: 14 }}>
                <label style={{ fontWeight: 600 }}>Référence & Motif d'Audit (Horodaté)</label>
                <input
                  type="text"
                  value={auditRefNote}
                  onChange={(e) => setAuditRefNote(e.target.value)}
                  style={{ borderRadius: 8 }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn-admin ghost" onClick={() => setSecurityModalOpen(false)} style={{ borderRadius: 20 }}>
                  Annuler
                </button>
                <button type="submit" className="btn-admin primary" disabled={saving || !managerPin} style={{ borderRadius: 20, padding: '10px 24px', background: 'var(--brand-red, #C0392B)' }}>
                  🔓 Signer & Clôturer l'Inventaire
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KPI INVENTAIRE */}
      <div className="admin-stats-grid no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid #E6E9EF', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Articles Audités
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy)', marginTop: 8 }}>{variants.length}</div>
          <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>Références scannées</span>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: totalDiscrepancies > 0 ? '1px solid rgba(192,57,43,0.3)' : '1px solid #E6E9EF', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, color: totalDiscrepancies > 0 ? '#C0392B' : 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Écarts Constatés
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: totalDiscrepancies > 0 ? '#C0392B' : '#27AE60', marginTop: 8 }}>
            {totalDiscrepancies}
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
            {totalDiscrepancies === 0 ? 'Inventaire 100% conforme ✅' : 'Révisions requises'}
          </span>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', border: '1px solid #E6E9EF', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Impact Financier global
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: totalValueImpact < 0 ? '#C0392B' : totalValueImpact > 0 ? '#27AE60' : 'var(--navy)', marginTop: 8 }}>
            {totalValueImpact > 0 ? `+${totalValueImpact.toFixed(2)}` : totalValueImpact.toFixed(2)} €
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>Basé sur le prix de vente</span>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: '#E6F7EF', border: '1px solid #27AE60', color: '#1FA971', padding: '12px 18px', borderRadius: 10, marginBottom: 20, fontWeight: 600 }}>
          ✅ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ background: '#FDE9E8', border: '1px solid #E1251B', color: '#E1251B', padding: '12px 18px', borderRadius: 10, marginBottom: 20, fontWeight: 600 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* TABLEAU COMPTAGE INVENTAIRE */}
      <Panel>
        <Toolbar className="no-print">
          <div className="admin-field">
            {I.search}
            <input
              placeholder="Rechercher par SKU ou nom de produit…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="admin-select"
            value={filterDiscrepancy}
            onChange={(e) => setFilterDiscrepancy(e.target.value)}
            style={{ borderRadius: 8 }}
          >
            <option value="ALL">Tous les produits</option>
            <option value="DIFF">Seulement les écarts (différences)</option>
            <option value="MATCH">Stocks concordants (0 écart)</option>
          </select>
          <span className="admin-count">
            {filteredItems.length} référence(s) affichée(s)
          </span>
        </Toolbar>

        <table className="admin-table">
          <thead>
            <tr>
              <th>SKU / Réf</th>
              <th>Produit</th>
              <th>Stock Théorique (Système)</th>
              <th style={{ background: '#FAF8F5', textTransform: 'uppercase', color: 'var(--navy)', fontWeight: 700 }}>Comptage Physique</th>
              <th>Écart (Delta)</th>
              <th>Impact Valeur (€)</th>
              <th>Note d'Ajustement</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id} style={{ background: item.delta !== 0 ? 'rgba(243, 156, 18, 0.05)' : undefined }}>
                <td className="cell-sub" style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--navy)' }}>{item.sku}</td>
                <td className="cell-main" style={{ fontWeight: 600 }}>{item.product_name || item.product?.name || '—'}</td>
                <td style={{ fontWeight: 600, textAlign: 'center' }}>
                  {blindMode ? (
                    <span style={{ padding: '4px 12px', background: '#E6E9EF', color: '#8A93A3', borderRadius: 12, fontStyle: 'italic', fontSize: 11.5 }}>
                      🔒 Masqué (Aveugle)
                    </span>
                  ) : (
                    <span style={{ padding: '4px 10px', background: '#F2F4F7', borderRadius: 12 }}>{item.theoretical}</span>
                  )}
                </td>
                <td style={{ background: '#FAF8F5', width: 140 }}>
                  <input
                    type="number"
                    min="0"
                    value={counts[item.id] !== undefined ? counts[item.id] : ''}
                    onChange={(e) => handleCountChange(item.id, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: 15,
                      fontWeight: 700,
                      textAlign: 'center',
                      borderRadius: 8,
                      border: item.delta !== 0 ? '2px solid #F39C12' : '1px solid #DCDFE6',
                      background: '#fff',
                    }}
                  />
                </td>
                <td style={{ fontWeight: 800, textAlign: 'center' }}>
                  {item.delta === 0 ? (
                    <span style={{ color: '#27AE60', fontSize: 12.5 }}>✅ 0 (OK)</span>
                  ) : item.delta > 0 ? (
                    <span style={{ color: '#27AE60', fontSize: 13 }}>🔺 +{item.delta}</span>
                  ) : (
                    <span style={{ color: '#C0392B', fontSize: 13 }}>🔻 {item.delta}</span>
                  )}
                </td>
                <td style={{ fontWeight: 700, color: item.impact < 0 ? '#C0392B' : item.impact > 0 ? '#27AE60' : 'var(--muted)' }}>
                  {item.impact !== 0 ? `${item.impact > 0 ? '+' : ''}${item.impact.toFixed(2)} €` : '0.00 €'}
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="ex: Rayon casse, Perte, Surplus..."
                    value={notes[item.id] || ''}
                    onChange={(e) => handleNoteChange(item.id, e.target.value)}
                    style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, width: '100%' }}
                  />
                </td>
              </tr>
            ))}

            {loading && (
              <tr>
                <td colSpan="7" className="admin-empty">Chargement de la grille d'inventaire…</td>
              </tr>
            )}

            {!loading && filteredItems.length === 0 && (
              <tr>
                <td colSpan="7" className="admin-empty">Aucun produit ne correspond à ces critères d'inventaire.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
