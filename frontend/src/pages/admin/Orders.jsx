import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I } from './icons.jsx';
import { PageHead, Panel, Toolbar, Pagination } from './ui.jsx';
import { api } from '../../lib/api.js';
import { eur } from '../../data/cart.jsx';
import { figureBySlug, defaultFigure } from '../../data/products.jsx';
import QRCode from 'react-qr-code';

export default function Orders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [quickDriverId, setQuickDriverId] = useState('');
  const [quickShippingCost, setQuickShippingCost] = useState('');

  const STATUSES = [
    { value: '', label: t('admin.orders.statusAll', 'Tous les statuts') },
    { value: 'PENDING', label: t('admin.orders.statusPendingPayment', 'En attente de paiement') },
    { value: 'PAID', label: t('admin.orders.statusPaid', 'Payée') },
    { value: 'PREPARING', label: t('admin.orders.statusPreparing', 'En préparation') },
    { value: 'SHIPPED', label: t('admin.orders.statusShipped', 'Expédiée') },
    { value: 'DELIVERED', label: t('admin.orders.statusDelivered', 'Livrée') },
    { value: 'CANCELLED', label: t('admin.orders.statusCancelled', 'Annulée') },
  ];

  const loadOrders = (silent = false) => {
    if (!silent) setLoading(true);
    api.adminOrders({ status: statusFilter, q: query })
      .then((data) => {
        const list = data.results || data;
        setOrders(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        console.warn('Erreur lors du chargement des commandes admin:', err);
        if (!silent) setOrders([]);
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    loadOrders();
    // Actualisation automatique toutes les 15 secondes
    const interval = setInterval(() => loadOrders(true), 15000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  useEffect(() => {
    api.adminStaff({ role: 'DELIVERY' })
      .then((data) => {
        setDrivers(Array.isArray(data) ? data : (data.results || []));
      })
      .catch((err) => console.warn('Erreur chargement livreurs:', err));
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadOrders();
  };

  const handleUpdateDriver = (orderId, driverId) => {
    setUpdating(true);
    api.adminUpdateOrder(orderId, { delivery_driver: driverId || null })
      .then((updated) => {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));
        if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.reference === updated.reference)) {
          setSelectedOrder((prev) => ({ ...prev, ...updated }));
        }
      })
      .catch((err) => console.warn('Erreur affectation livreur:', err))
      .finally(() => setUpdating(false));
  };

  const handleDispatch = (orderId) => {
    if (!quickDriverId) {
      alert("Veuillez sélectionner un livreur avant d'expédier la commande.");
      return;
    }
    setUpdating(true);
    const payload = { status: 'SHIPPED', delivery_driver: quickDriverId };
    if (quickShippingCost !== '') payload.shipping_cost = parseFloat(quickShippingCost);

    api.adminUpdateOrder(orderId, payload)
      .then((updated) => {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev) => ({ ...prev, ...updated }));
        }
        setQuickDriverId('');
        setQuickShippingCost('');
        // Imprimer automatiquement après l'expédition
        setTimeout(() => window.print(), 500);
      })
      .catch((err) => console.warn('Erreur expédition:', err))
      .finally(() => setUpdating(false));
  };

  const handleUpdateStatus = (orderId, newStatus) => {
    setUpdating(true);
    api.adminUpdateOrder(orderId, { status: newStatus })
      .then((updated) => {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));
        if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.reference === updated.reference)) {
          setSelectedOrder((prev) => ({ ...prev, ...updated }));
        }
      })
      .catch(() => {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
        }
      })
      .finally(() => setUpdating(false));
  };

  const getStatusBadge = (s, method, label) => {
    switch (s) {
      case 'PAID':
        return <span className="status paid">✓ {label || 'Payée'}</span>;
      case 'PREPARING':
        return <span className="status pending">⚡ {label || 'En préparation'}</span>;
      case 'SHIPPED':
        return method === 'pickup' 
          ? <span className="status shipped" style={{ background: '#E0E7FF', color: '#4338CA' }}>🛍️ Prête au retrait</span>
          : <span className="status shipped">📦 {label || 'Expédiée'}</span>;
      case 'DELIVERED':
        return method === 'pickup'
          ? <span className="status shipped" style={{ background: '#DCFCE7', color: '#166534' }}>🎉 Retirée en boutique</span>
          : <span className="status shipped" style={{ background: '#DCFCE7', color: '#166534' }}>🎉 {label || 'Livrée'}</span>;
      case 'CANCELLED':
        return <span className="status rejected">✕ {label || 'Annulée'}</span>;
      default:
        return <span className="status pending">⏳ {label || 'En attente'}</span>;
    }
  };

  const getNextAction = (o) => {
    const isPickup = o.shipping_address?.method === 'pickup';
    switch (o.status) {
      case 'PENDING':
        return { label: 'Valider le paiement', nextStatus: 'PAID', btnClass: 'btn-admin primary', icon: '✓' };
      case 'PAID':
        return { label: 'Lancer la préparation', nextStatus: 'PREPARING', btnClass: 'btn-admin primary', icon: '⚡' };
      case 'PREPARING':
        return isPickup 
          ? { label: 'Marquer comme prête au retrait', nextStatus: 'SHIPPED', btnClass: 'btn-admin primary', icon: '🛍️' }
          : { label: 'Marquer comme expédiée', nextStatus: 'SHIPPED', btnClass: 'btn-admin primary', icon: '📦' };
      case 'SHIPPED':
        return isPickup
          ? { label: 'Marquer comme retirée', nextStatus: 'DELIVERED', btnClass: 'btn-admin primary', icon: '🎉' }
          : { label: 'Marquer comme livrée', nextStatus: 'DELIVERED', btnClass: 'btn-admin primary', icon: '🎉' };
      default:
        return null;
    }
  };

  return (
    <>
      <PageHead
        title={t('admin.orders.title', 'Validation & Gestion des commandes')}
        subtitle={`${orders.length} ${t('admin.orders.subtitle', 'commande(s) répertoriée(s)')}`}
      >
        <button className="btn-admin ghost">{I.pdf} {t('admin.orders.export', 'Exporter CSV')}</button>
      </PageHead>

      <Panel>
        <Toolbar>
          <form className="admin-field" onSubmit={handleSearchSubmit}>
            {I.search}
            <input
              placeholder={t('admin.orders.searchPlaceholder', 'Référence, e-mail ou client…')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>

          <select className="admin-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <span className="admin-count">{orders.length} {t('admin.orders.results', 'résultat(s)')}</span>
        </Toolbar>

        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.orders.tableRef', 'Référence')}</th>
              <th>{t('admin.orders.tableClient', 'Client')}</th>
              <th>{t('admin.orders.tableType', 'Type')}</th>
              <th>{t('admin.orders.tableDate', 'Date')}</th>
              <th>{t('admin.orders.tableTotal', 'Total')}</th>
              <th>{t('admin.orders.tableStatus', 'Statut')}</th>
              <th style={{ textAlign: 'right' }}>Actions & Validation</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const nextAct = getNextAction(o);

              return (
                <tr key={o.id || o.reference}>
                  <td className="cell-main">
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 14 }}>#{o.reference}</span>
                  </td>
                  <td>
                    <strong>{o.customer_name || o.email}</strong>
                    <div className="cell-sub">
                      {o.shipping_address?.method === 'pickup' ? (
                        <span style={{ color: '#2563EB', fontWeight: 600 }}>📍 Retrait en boutique</span>
                      ) : (
                        <span>{o.shipping_address?.city || 'France'}, {o.shipping_address?.country || 'FR'}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`tag-pill ${o.order_type === 'WHOLESALE' ? 'tier-2' : 'tier-1'}`}>
                      {o.order_type === 'WHOLESALE' ? 'B2B Grossiste' : 'B2C Client'}
                    </span>
                  </td>
                  <td className="cell-sub">{new Date(o.created_at || Date.now()).toLocaleDateString('fr-FR')}</td>
                  <td style={{ fontWeight: 700, color: 'var(--navy,#0F172A)' }}>
                    {eur(o.total_amount || 0)}
                  </td>
                  <td>
                    {getStatusBadge(o.status, o.shipping_address?.method, o.status_display)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      {/* BOUTON D'ACTION RAPIDE SI APPLICABLE */}
                      {nextAct && (
                        <button
                          type="button"
                          disabled={updating}
                          onClick={() => handleUpdateStatus(o.id, nextAct.nextStatus)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            background: '#1E293B',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <span>{nextAct.icon}</span> {nextAct.label}
                        </button>
                      )}

                      <button
                        type="button"
                        className="icon-btn"
                        title={t('admin.orders.viewDetail', 'Voir et valider la commande')}
                        onClick={() => setSelectedOrder(o)}
                        style={{ padding: 6, borderRadius: 6, border: '1px solid #CBD5E1', cursor: 'pointer' }}
                      >
                        {I.eye}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan="7" className="admin-empty" style={{ padding: 40, textAlign: 'center' }}>
                  {t('admin.orders.empty', 'Aucune commande ne correspond aux critères.')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination pages={1} current={1} />
      </Panel>

      {/* MODAL & TIROIR DE VALIDATION DE COMMANDE */}
      {selectedOrder && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedOrder(null)}>
          <div
            className="admin-modal"
            style={{ maxWidth: 900, borderRadius: 16, overflow: 'hidden', padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* EN-TÊTE MODAL */}
            <div style={{ background: '#0F172A', color: '#fff', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 20, color: '#fff', fontWeight: 800 }}>Commande #{selectedOrder.reference}</h2>
                  {getStatusBadge(selectedOrder.status, selectedOrder.shipping_address?.method, selectedOrder.status_display)}
                </div>
                <span style={{ fontSize: 13, color: '#94A3B8', marginTop: 4, display: 'block' }}>
                  Passée le {new Date(selectedOrder.created_at || Date.now()).toLocaleString('fr-FR')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18, fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '80vh', overflowY: 'auto' }}>
              {/* BANNIÈRE D'ACTION RAPIDE DE VALIDATION */}
              {getNextAction(selectedOrder) && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ color: '#1E40AF', fontSize: 14 }}>Action requise pour cette commande :</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#3B82F6' }}>
                        Passez la commande à l'étape suivante pour informer le client.
                      </p>
                    </div>
                    {/* Bouton standard si ce n'est pas l'étape Expédition avec livraison */}
                    {!(selectedOrder.status === 'PREPARING' && selectedOrder.shipping_address?.method !== 'pickup') && (
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => handleUpdateStatus(selectedOrder.id, getNextAction(selectedOrder).nextStatus)}
                        style={{
                          padding: '10px 20px',
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 700,
                          background: '#2563EB',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                        }}
                      >
                        <span>{getNextAction(selectedOrder).icon}</span> {getNextAction(selectedOrder).label}
                      </button>
                    )}
                  </div>

                  {/* Formulaire spécial pour l'expédition avec chauffeur */}
                  {selectedOrder.status === 'PREPARING' && selectedOrder.shipping_address?.method !== 'pickup' && (
                    <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #BFDBFE', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1E40AF', marginBottom: 4 }}>Frais de Livraison (€)</label>
                        <input 
                          type="number" 
                          min="0"
                          step="0.01"
                          placeholder={selectedOrder.shipping_cost || "0.00"}
                          value={quickShippingCost}
                          onChange={(e) => setQuickShippingCost(e.target.value)}
                          className="admin-input" 
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div style={{ flex: 2, minWidth: 250 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#1E40AF', marginBottom: 4 }}>Affecter un Livreur</label>
                        <select
                          className="admin-select"
                          value={quickDriverId}
                          onChange={(e) => setQuickDriverId(e.target.value)}
                          style={{ width: '100%' }}
                        >
                          <option value="">-- Choisir un livreur --</option>
                          {drivers.map(d => (
                            <option key={d.user?.id || d.id} value={d.user?.id || d.id}>
                              {d.user?.first_name || d.user?.email || d.email}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ marginTop: 18 }}>
                        <button
                          type="button"
                          disabled={updating || !quickDriverId}
                          onClick={() => handleDispatch(selectedOrder.id)}
                          style={{
                            padding: '10px 20px',
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 700,
                            background: '#2563EB',
                            color: '#fff',
                            border: 'none',
                            cursor: quickDriverId ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            opacity: quickDriverId ? 1 : 0.6
                          }}
                        >
                          <span>📦</span> Expédier & Assigner
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* DETAILS CLIENT & EXPEDITION */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13 }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 14, color: '#0F172A', fontWeight: 700 }}>Informations Client</h4>
                  <div><strong>Nom :</strong> {selectedOrder.customer_name || 'Client anonyme'}</div>
                  <div style={{ marginTop: 4 }}><strong>E-mail :</strong> <a href={`mailto:${selectedOrder.email}`} style={{ color: '#2563EB' }}>{selectedOrder.email}</a></div>
                  <div style={{ marginTop: 4 }}><strong>Type de compte :</strong> {selectedOrder.order_type === 'WHOLESALE' ? ' Grossiste B2B' : ' Client B2C'}</div>
                  <div style={{ marginTop: 4 }}>
                    <strong>Règlement :</strong>{' '}
                    {(selectedOrder.payment_method || selectedOrder.shipping_address?.payment_method) === 'cod'
                      ? '💵 Paiement à la livraison / au retrait'
                      : (selectedOrder.payment_method || selectedOrder.shipping_address?.payment_method) === 'paypal'
                      ? '🅿️ PayPal'
                      : '💳 Carte Bancaire'}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13 }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 14, color: '#0F172A', fontWeight: 700 }}>Mode de livraison / Retrait</h4>
                  {selectedOrder.shipping_address?.method === 'pickup' ? (
                    <div style={{ color: '#1E40AF', fontWeight: 700 }}>
                      📍 Retrait en boutique Click & Collect<br />
                      <span style={{ fontWeight: 400, fontSize: 12, color: '#64748B' }}>Atelier Maison Lián — 12 Rue de la Paix, Paris</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div><strong>Destinataire :</strong> {selectedOrder.shipping_address?.full_name || selectedOrder.customer_name || 'Non spécifié'}</div>
                      <div><strong>Adresse :</strong> {selectedOrder.shipping_address?.address || 'Non spécifiée'}</div>
                      <div><strong>Lieu :</strong> {selectedOrder.shipping_address?.postal_code} {selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.country}</div>
                      {selectedOrder.shipping_address?.phone && <div><strong>Tél :</strong> {selectedOrder.shipping_address.phone}</div>}
                    </div>
                  )}
                </div>
              </div>

              {/* CHANGER LE STATUT MANUELLEMENT */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F1F5F9', padding: '12px 16px', borderRadius: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Changer le statut manuellement :</span>
                <select
                  className="admin-select"
                  disabled={updating}
                  value={selectedOrder.status}
                  onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                  style={{ background: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600 }}
                >
                  <option value="PENDING">⏳ En attente de paiement</option>
                  <option value="PAID">✓ Payée</option>
                  <option value="PREPARING">⚡ En préparation</option>
                  <option value="SHIPPED">📦 Expédiée</option>
                  <option value="DELIVERED">🎉 Livrée</option>
                  <option value="CANCELLED">✕ Annulée</option>
                </select>
              </div>

              {/* AFFECTATION LIVREUR (si ce n'est pas un retrait boutique) */}
              {selectedOrder.shipping_address?.method !== 'pickup' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', padding: '12px 16px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Affectation Livreur :</span>
                  <select
                    className="admin-select"
                    disabled={updating}
                    value={selectedOrder.delivery_driver || ''}
                    onChange={(e) => handleUpdateDriver(selectedOrder.id, e.target.value)}
                    style={{ background: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600, minWidth: 200 }}
                  >
                    <option value="">-- Non affecté --</option>
                    {drivers.map(d => (
                      <option key={d.user?.id || d.id} value={d.user?.id || d.id}>
                        {d.user?.first_name || d.user?.email || d.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* LISTE DES ARTICLES */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#0F172A', fontWeight: 700 }}>
                  Articles commandés ({selectedOrder.items?.length || 0})
                </h4>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                  <table className="admin-table" style={{ margin: 0, background: '#fff' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        <th>Produit</th>
                        <th>SKU</th>
                        <th>Prix Unitaire</th>
                        <th>Quantité</th>
                        <th style={{ textAlign: 'right' }}>Sous-total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder.items || []).map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="cell-main" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', background: '#F1F5F9', flexShrink: 0 }}>
                              {figureBySlug[item.sku] || defaultFigure}
                            </div>
                            <span>{item.product_name}</span>
                          </td>
                          <td className="cell-sub"><code style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>{item.sku}</code></td>
                          <td>{eur(item.unit_price || 0)}</td>
                          <td><strong>{item.quantity}</strong></td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            {eur(item.line_total || (Number(item.unit_price) * item.quantity))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TOTAL FINAL & PAIEMENT */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, borderTop: '2px solid #E2E8F0', paddingTop: 16 }}>
                <div>
                  <span style={{ fontSize: 13, color: '#64748B', display: 'block', marginBottom: 4 }}>Mode de règlement :</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', background: '#F1F5F9', padding: '4px 10px', borderRadius: 6 }}>
                    {selectedOrder.payment_method === 'cod' ? '💵 À la livraison' : (selectedOrder.payment_method === 'paypal' ? 'Paypal' : '💳 Carte Bancaire')}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 14, color: '#64748B' }}>Montant Total TTC :</span>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--brand-red,#E1251B)' }}>
                    {eur(selectedOrder.total_amount || 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* CHANGEMENT MANUEL DE STATUT */}
            <div className="no-print" style={{ padding: '16px 24px', background: '#fff' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Forcer le statut</h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { val: 'PENDING', label: 'En attente' },
                  { val: 'PAID', label: 'Payée' },
                  { val: 'PREPARING', label: 'En préparation' },
                  { val: 'SHIPPED', label: selectedOrder.shipping_address?.method === 'pickup' ? 'Prête au retrait' : 'Expédiée' },
                  { val: 'DELIVERED', label: selectedOrder.shipping_address?.method === 'pickup' ? 'Retirée' : 'Livrée' },
                  { val: 'CANCELLED', label: 'Annulée' },
                ].map(st => (
                  <button
                    key={st.val}
                    type="button"
                    disabled={updating || selectedOrder.status === st.val}
                    onClick={() => handleUpdateStatus(selectedOrder.id, st.val)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      border: '1px solid #CBD5E1',
                      background: selectedOrder.status === st.val ? '#1E293B' : '#fff',
                      color: selectedOrder.status === st.val ? '#fff' : '#475569',
                      cursor: selectedOrder.status === st.val ? 'default' : 'pointer'
                    }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PIED DE MODAL */}
            <div className="no-print" style={{ background: '#F8FAFC', padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                className="btn-admin ghost"
                onClick={() => window.print()}
              >
                🖨️ Imprimer le bon de préparation
              </button>
              <button
                type="button"
                className="btn-admin primary"
                onClick={() => setSelectedOrder(null)}
              >
                Fermer
              </button>
            </div>

            {/* ETIQUETTE D'IMPRESSION (Uniquement visible à l'impression) */}
            <div className="print-only">
              <div style={{ textAlign: 'center', marginBottom: 30 }}>
                <h1 style={{ fontSize: 24, margin: 0, textTransform: 'uppercase' }}>Bon de Préparation & Livraison</h1>
                <h2 style={{ fontSize: 48, fontWeight: 900, margin: '10px 0', fontFamily: 'monospace', letterSpacing: 2 }}>{selectedOrder.reference}</h2>
                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <QRCode 
                    value={`${window.location.origin}/compte/commandes?confirm_ref=${selectedOrder.reference}&pin=${selectedOrder.delivery_pin || ''}`} 
                    size={160} 
                  />
                  <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>Scanner pour confirmer</div>
                </div>
                {selectedOrder.delivery_pin && (
                  <div style={{ marginTop: 20, padding: 10, border: '4px dashed #000', display: 'inline-block' }}>
                    <strong>CODE SECRET DE LIVRAISON :</strong> <br/>
                    <span style={{ fontSize: 36, fontWeight: 900, letterSpacing: 4 }}>{selectedOrder.delivery_pin}</span>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', paddingTop: 20 }}>
                <div style={{ width: '45%' }}>
                  <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: 5 }}>Expéditeur</h3>
                  <p><strong>Maison Lián</strong><br/>12 Rue de la Paix<br/>75000 Paris, France</p>
                </div>
                <div style={{ width: '45%' }}>
                  <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: 5 }}>Destinataire</h3>
                  {selectedOrder.shipping_address?.method === 'pickup' ? (
                    <p style={{ fontSize: 18, fontWeight: 'bold' }}>RETRAIT EN BOUTIQUE</p>
                  ) : (
                    <p style={{ fontSize: 18, lineHeight: 1.5 }}>
                      <strong>{selectedOrder.shipping_address?.full_name || selectedOrder.customer_name}</strong><br/>
                      {selectedOrder.shipping_address?.address}<br/>
                      {selectedOrder.shipping_address?.postal_code} {selectedOrder.shipping_address?.city}<br/>
                      {selectedOrder.shipping_address?.country}<br/>
                      Tél : {selectedOrder.shipping_address?.phone || '-'}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 30 }}>
                <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: 5 }}>Contenu</h3>
                <ul style={{ fontSize: 18, listStyle: 'none', padding: 0 }}>
                  {(selectedOrder.items || []).map((item, idx) => (
                    <li key={item.id || idx} style={{ padding: '8px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                      <span><strong>{item.quantity}x</strong> {item.product_name} ({item.sku})</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
