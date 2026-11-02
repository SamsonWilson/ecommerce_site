import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api.js';
import { eur } from '../../data/cart.jsx';
import { figureBySlug, defaultFigure } from '../../data/products.jsx';
import { IconPackage, IconPdf, IconCheck, IconTruck, IconStore, IconBag } from '../../components/icons.jsx';

export default function MyOrders() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openOrder, setOpenOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pinInputs, setPinInputs] = useState({});
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.orders()
      .then((data) => {
        if (!alive) return;
        setOrders(data.results || data || []);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Détecter un scan QR Code (URL: /compte/commandes?confirm_ref=CMD-xxx&pin=123456)
  useEffect(() => {
    const confirmRef = searchParams.get('confirm_ref');
    const autoPin = searchParams.get('pin');
    if (confirmRef && autoPin && !loading && orders.length > 0 && !updating) {
      const targetOrder = orders.find(o => o.reference === confirmRef);
      if (targetOrder && targetOrder.status === 'SHIPPED') {
        setUpdating(true);
        api.confirmOrderDelivery(confirmRef, autoPin)
          .then((updated) => {
            setOrders(prev => prev.map(o => o.reference === confirmRef ? { ...o, status: updated.status } : o));
            alert(t('account.orders.pinSuccess', 'Your order receipt has been verified successfully!'));
            setOpenOrder(targetOrder.id);
          })
          .catch((err) => {
            console.warn('Erreur validation auto:', err);
            alert(t('account.orders.qrFailed', 'QR Code validation failed. The PIN code may be incorrect.'));
          })
          .finally(() => {
            setUpdating(false);
            setSearchParams({}, { replace: true });
          });
      }
    }
  }, [searchParams, loading, orders, updating, setSearchParams, t]);

  const handleConfirmDelivery = (reference) => {
    const pin = pinInputs[reference];
    if (!pin || pin.length !== 6) {
      alert(t('account.orders.enterPinPrompt', 'Enter the 6-digit confirmation PIN code.'));
      return;
    }
    if (!window.confirm(t('account.orders.confirmPrompt', 'Do you confirm receiving this order?'))) return;
    setUpdating(true);
    api.confirmOrderDelivery(reference, pin)
      .then((updated) => {
        setOrders(prev => prev.map(o => o.reference === reference ? { ...o, status: updated.status } : o));
        setPinInputs(prev => ({ ...prev, [reference]: '' }));
      })
      .catch((err) => {
        console.warn('Erreur confirmation livraison:', err);
        alert(t('account.orders.pinError', 'Invalid validation code. Please check.'));
      })
      .finally(() => setUpdating(false));
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PENDING') return ['PENDING', 'PAID', 'PREPARING', 'SHIPPED'].includes(o.status);
    if (statusFilter === 'COMPLETED') return o.status === 'DELIVERED';
    return true;
  });

  const getStatusBadge = (status, label) => {
    switch (status) {
      case 'PAID':
        return (
          <span style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>✓</span> {t('account.orders.paid', label || 'Paid')}
          </span>
        );
      case 'PREPARING':
        return (
          <span style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>⚡</span> {t('account.orders.preparing', label || 'Preparing')}
          </span>
        );
      case 'SHIPPED':
        return (
          <span style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#E0E7FF', color: '#4338CA', border: '1px solid #C7D2FE', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>📦</span> {t('account.orders.shipped', label || 'Shipped')}
          </span>
        );
      case 'DELIVERED':
        return (
          <span style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>🎉</span> {t('account.orders.delivered', label || 'Delivered')}
          </span>
        );
      case 'CANCELLED':
        return (
          <span style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FCA5A5', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>✕</span> {t('account.orders.cancelled', label || 'Cancelled')}
          </span>
        );
      default:
        return (
          <span style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>⏳</span> {t('account.orders.pending', label || 'Pending')}
          </span>
        );
    }
  };

  const getStepIndex = (status) => {
    switch (status) {
      case 'PENDING': return 1;
      case 'PAID': return 1;
      case 'PREPARING': return 2;
      case 'SHIPPED': return 3;
      case 'DELIVERED': return 4;
      default: return 1;
    }
  };

  return (
    <div className="acc-overview">
      <div className="acc-head">
        <div className="acc-head-content">
          <h1>{t('account.layout.orders', 'My Orders')}</h1>
          <p>{t('account.orders.subtitle', 'Track your shipments in real-time and review your purchase history.')}</p>
        </div>
      </div>

      {/* STATS RAPIDES & FILTRES */}
      {!loading && orders.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'ALL', label: `${t('account.orders.filterAll', 'All orders')} (${orders.length})` },
              { id: 'PENDING', label: t('account.orders.filterPending', 'In progress') },
              { id: 'COMPLETED', label: t('account.orders.filterCompleted', 'Delivered') },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  border: statusFilter === tab.id ? '1px solid var(--brand-red,#E1251B)' : '1px solid #E2E8F0',
                  background: statusFilter === tab.id ? 'var(--brand-red,#E1251B)' : '#fff',
                  color: statusFilter === tab.id ? '#fff' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Link to="/compte/boutique" className="btn-premium" style={{ fontSize: 13, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <IconStore /> {t('account.orders.newOrder', 'New order')}
          </Link>
        </div>
      )}

      {/* ETAT DE CHARGEMENT */}
      {loading ? (
        <div className="acc-info-card" style={{ padding: 40, textAlign: 'center' }}>
          <div className="acc-shop-spinner" style={{ margin: '0 auto 16px auto' }} />
          <p style={{ color: '#64748B', margin: 0 }}>{t('account.orders.loadingOrders', 'Loading your orders…')}</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        /* AUCUNE COMMANDE */
        <div className="acc-empty">
          <div style={{ marginBottom: 16 }}><IconBag /></div>
          <h2>{orders.length === 0 ? t('account.orders.emptyTitle', 'No orders yet') : t('account.orders.noOrdersInCategory', 'No orders in this category')}</h2>
          <p>
            {orders.length === 0
              ? t('account.orders.emptyDesc', 'You haven\'t placed any orders yet. Visit our shop to find unique bridal pieces.')
              : t('account.orders.noOrdersInCategoryDesc', 'No orders match the selected filters.')}
          </p>
          <Link to="/compte/boutique" className="btn-premium" style={{ marginTop: 20, display: 'inline-flex' }}>
            {t('account.orders.exploreShop', 'Explore the shop')}
          </Link>
        </div>
      ) : (
        /* LISTE DES COMMANDES */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {filteredOrders.map((o) => {
            const isOpen = openOrder === o.reference;
            const step = getStepIndex(o.status);

            return (
              <div className="acc-info-card" key={o.reference} style={{ padding: 24, transition: 'all 0.2s ease' }}>
                {/* EN-TÊTE DE CARTE COMMANDE */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, paddingBottom: 16, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy,#0F172A)' }}>
                        {t('account.orders.orderRef', { ref: o.reference, defaultValue: `Order #${o.reference}` })}
                      </span>
                      {getStatusBadge(o.status, o.status_display)}
                    </div>
                    <span style={{ fontSize: 13, color: '#64748B' }}>
                      {t('account.orders.placedOn', 'Placed on')} {new Date(o.created_at || Date.now()).toLocaleDateString(i18n.language === 'en' ? 'en-US' : i18n.language === 'zh' ? 'zh-CN' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} • {t('account.orders.articlesCount', { count: o.items_count || o.items?.length || 1, defaultValue: `${o.items_count || o.items?.length || 1} item(s)` })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#64748B' }}>{t('account.orders.totalAmount', 'Total amount')}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--brand-red,#E1251B)' }}>
                        {eur(o.total_amount || 0)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpenOrder(isOpen ? null : o.reference)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        border: '1px solid #CBD5E1',
                        background: isOpen ? '#F1F5F9' : '#fff',
                        color: 'var(--navy,#0F172A)',
                        cursor: 'pointer',
                      }}
                    >
                      {isOpen ? t('account.orders.hide', 'Hide') : t('account.orders.detailsAndTracking', 'Details & Tracking')}
                    </button>
                  </div>
                </div>

                {/* TIMELINE DE SUIVI RAPIDE */}
                <div style={{ padding: '16px 0 8px 0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, position: 'relative' }}>
                    {[
                      { label: t('account.orders.stepValidation', 'Validation'), active: step >= 1 },
                      { label: t('account.orders.stepPreparation', 'Preparation'), active: step >= 2 },
                      { label: o.shipping_address?.method === 'pickup' ? t('account.orders.stepReadyPickup', 'Ready for pickup') : t('account.orders.stepShipping', 'Shipping'), active: step >= 3 },
                      { label: o.shipping_address?.method === 'pickup' ? t('account.orders.stepPickedUp', 'Picked up') : t('account.orders.stepDelivered', 'Delivered'), active: step >= 4 },
                    ].map((st, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: st.active ? 'var(--brand-red,#E1251B)' : '#E2E8F0',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                            marginBottom: 6,
                          }}
                        >
                          {st.active ? '✓' : idx + 1}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: st.active ? 700 : 500, color: st.active ? 'var(--navy,#0F172A)' : '#94A3B8' }}>
                          {st.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DÉTAILS DEPLIANTS */}
                {isOpen && (
                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px dashed #CBD5E1' }}>
                    
                    {/* CONFIRMATION LIVRAISON PAR LE CLIENT */}
                    {o.status === 'SHIPPED' && (
                      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: 16, borderRadius: 10, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: 14, color: '#166534', fontWeight: 700 }}>
                            {o.shipping_address?.method === 'pickup' ? t('account.orders.pickupReadyHeading', 'Your order is ready for pickup!') : t('account.orders.shippingReadyHeading', 'Your order is on its way!')}
                          </h4>
                          <p style={{ margin: 0, fontSize: 13, color: '#15803D' }}>
                            {o.shipping_address?.method === 'pickup'
                              ? t('account.orders.pickupPinPrompt', 'Enter the 6-digit PIN from your pickup slip or scan the QR Code.')
                              : t('account.orders.shippingPinPrompt', 'Enter the 6-digit PIN on the delivery receipt or scan the QR Code.')}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            maxLength={6}
                            placeholder={t('account.orders.pinPlaceholder', '6-digit PIN code')}
                            value={pinInputs[o.reference] || ''}
                            onChange={(e) => setPinInputs({ ...pinInputs, [o.reference]: e.target.value.replace(/[^0-9]/g, '') })}
                            disabled={updating}
                            style={{ 
                              padding: '10px 14px', 
                              borderRadius: 8, 
                              border: '1px solid #86EFAC', 
                              fontSize: 16, 
                              fontWeight: 700,
                              letterSpacing: 2,
                              outline: 'none',
                              width: 200,
                              textAlign: 'center'
                            }}
                          />
                          <button
                            className="btn btn-primary"
                            disabled={updating || (pinInputs[o.reference] || '').length !== 6}
                            onClick={() => handleConfirmDelivery(o.reference)}
                            style={{ background: '#16A34A', border: 'none', flex: 1, minWidth: 200 }}
                          >
                            {updating ? t('account.orders.confirming', 'Confirming…') : (o.shipping_address?.method === 'pickup' ? t('account.orders.validatePickup', 'Confirm pickup') : t('account.orders.validateDelivery', 'Confirm receipt'))}
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--navy,#0F172A)' }}>{t('account.orders.orderedItems', 'Ordered items')}</h4>
                      <button
                        type="button"
                        onClick={() => alert(t('account.orders.downloadingInvoice', { ref: o.reference, defaultValue: `Downloading PDF invoice for order #${o.reference}…` }))}
                        style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}
                      >
                        <IconPdf /> {t('account.orders.downloadInvoice', 'Download invoice (PDF)')}
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                      {(o.items || []).map((item, idx) => (
                        <div
                          key={item.id || idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            padding: 12,
                            background: '#F8FAFC',
                            borderRadius: 10,
                            border: '1px solid #F1F5F9',
                          }}
                        >
                          <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', background: '#fff', flexShrink: 0 }}>
                            {figureBySlug[item.sku] || defaultFigure}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy,#0F172A)' }}>
                              {item.product_name || t('account.orders.defaultItemName', 'Fine bridal jewelry')}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748B' }}>
                              SKU: {item.sku || 'SKU-001'} • {t('product.quantity', 'Quantity')}: {item.quantity} × {eur(item.unit_price || 0)}
                            </div>
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy,#0F172A)' }}>
                            {eur(item.line_total || (Number(item.unit_price) * item.quantity))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ADRESSE ET INFORMATIONS */}
                    {o.shipping_address && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                        <div style={{ background: '#EFF6FF', padding: 14, borderRadius: 10, border: '1px solid #BFDBFE', color: '#1E40AF' }}>
                          {o.shipping_address.method === 'pickup' ? (
                            <>
                              📍 <strong>{t('account.orders.pickupAddressTitle', 'Boutique Atelier Pickup:')}</strong><br />
                              <span style={{ fontSize: 12 }}>Maison Lián, 12 Rue de la Paix, 75002 Paris</span>
                            </>
                          ) : (
                            <>
                              📍 <strong>{t('account.orders.deliveryAddressTitle', 'Shipping address:')}</strong><br />
                              <span style={{ fontSize: 12 }}>{o.shipping_address.full_name || ''} — {o.shipping_address.address || ''}, {o.shipping_address.postal_code || ''} {o.shipping_address.city || ''} ({o.shipping_address.country || 'FR'})</span>
                            </>
                          )}
                        </div>

                        <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0', color: '#334155' }}>
                          💳 <strong>{t('account.orders.paymentMethodTitle', 'Payment method:')}</strong><br />
                          <span style={{ fontSize: 12 }}>
                            {(o.payment_method || o.shipping_address.payment_method) === 'cod'
                              ? `💵 ${t('account.orders.paymentCod', 'Cash on delivery / at pickup')}`
                              : (o.payment_method || o.shipping_address.payment_method) === 'paypal'
                              ? `🅿️ ${t('account.orders.paymentPaypal', 'PayPal')}`
                              : `💳 ${t('account.orders.paymentCard', 'Credit Card (SSL)')}`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
