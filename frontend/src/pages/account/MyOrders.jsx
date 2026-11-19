import BankTransferDetails from '../../components/BankTransferDetails.jsx';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api.js';
import { eur } from '../../data/cart.jsx';
import { figureBySlug, defaultFigure } from '../../data/products.jsx';
import { IconBag, IconPdf, IconStore } from '../../components/icons.jsx';

export default function MyOrders() {
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openOrder, setOpenOrder] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updating, setUpdating] = useState(false);
  const [pinInputs, setPinInputs] = useState({});
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const fetchOrders = (silent = false) => {
      api.myOrders()
        .then((data) => {
          const items = data.results || data;
          setOrders(Array.isArray(items) ? items : []);
        })
        .catch(() => {
          if (!silent) setOrders([]);
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    };
    
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 15000);
    return () => clearInterval(interval);
  }, []);

  // Validation automatique par scan QR
  useEffect(() => {
    const confirmRef = searchParams.get('confirm_ref');
    const pin = searchParams.get('pin');
    
    if (confirmRef && pin && !loading && !updating) {
      const targetOrder = orders.find(o => o.reference === confirmRef);
      if (targetOrder && targetOrder.status === 'SHIPPED') {
        setUpdating(true);
        api.confirmOrderDelivery(confirmRef, pin)
          .then((updated) => {
            setOrders(prev => prev.map(o => o.reference === confirmRef ? { ...o, status: updated.status } : o));
            alert(t('orders.validated'));
            setOpenOrder(targetOrder.id);
          })
          .catch(err => {
            console.warn('Erreur validation auto:', err);
            alert(t('orders.qrFailed'));
          })
          .finally(() => {
            setUpdating(false);
            setSearchParams({}, { replace: true });
          });
      }
    }
  }, [searchParams, loading, orders, updating, setSearchParams]);

  const handleConfirmDelivery = (reference) => {
    const pin = pinInputs[reference];
    if (!pin || pin.length !== 6) {
      alert(t('orders.enterPin'));
      return;
    }
    if (!window.confirm(t('orders.confirmReceived'))) return;
    setUpdating(true);
    api.confirmOrderDelivery(reference, pin)
      .then((updated) => {
        setOrders(prev => prev.map(o => o.reference === reference ? { ...o, status: updated.status } : o));
        setPinInputs(prev => ({ ...prev, [reference]: '' }));
      })
      .catch(err => {
        console.warn('Erreur confirmation livraison:', err);
        alert(t('orders.pinWrong'));
      })
      .finally(() => setUpdating(false));
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PENDING') return ['PENDING', 'PAID', 'PREPARING', 'SHIPPED'].includes(o.status);
    if (statusFilter === 'COMPLETED') return o.status === 'DELIVERED';
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>✓</span> {t('orders.status.PAID')}
          </span>
        );
      case 'PREPARING':
        return (
          <span style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>⚡</span> {t('orders.status.PREPARING')}
          </span>
        );
      case 'SHIPPED':
        return (
          <span style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#E0E7FF', color: '#4338CA', border: '1px solid #C7D2FE', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>📦</span> {t('orders.status.SHIPPED')}
          </span>
        );
      case 'DELIVERED':
        return (
          <span style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>🎉</span> {t('orders.status.DELIVERED')}
          </span>
        );
      case 'CANCELLED':
        return (
          <span style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FCA5A5', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>✕</span> {t('orders.status.CANCELLED')}
          </span>
        );
      default:
        return (
          <span style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>⏳</span> {t('orders.status.PENDING')}
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
          <h1>{t('account.myOrders', 'Mes Commandes')}</h1>
          <p>{t('account.myOrdersSub', 'Suivez vos expéditions en temps réel et consultez votre historique d\'achats.')}</p>
        </div>
      </div>

      {/* STATS RAPIDES ET FILTRES */}
      {!loading && orders.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'ALL', label: t('orders.filterAll', { n: orders.length }) },
              { id: 'PENDING', label: t('orders.filterPending') },
              { id: 'COMPLETED', label: t('orders.filterDelivered') },
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
            <IconStore /> {t('orders.newOrder')}
          </Link>
        </div>
      )}

      {/* ETAT DE CHARGEMENT */}
      {loading ? (
        <div className="acc-info-card" style={{ padding: 40, textAlign: 'center' }}>
          <div className="acc-shop-spinner" style={{ margin: '0 auto 16px auto' }} />
          <p style={{ color: '#64748B', margin: 0 }}>{t('orders.loading')}</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        /* AUCUNE COMMANDE */
        <div className="acc-empty">
          <div style={{ marginBottom: 16 }}><IconBag /></div>
          <h2>{orders.length === 0 ? t('orders.none') : t('orders.noneInCategory')}</h2>
          <p>
            {orders.length === 0
              ? t('orders.noneHint')
              : t('orders.noneFilter')}
          </p>
          <Link to="/compte/boutique" className="btn-premium" style={{ marginTop: 20, display: 'inline-flex' }}>
            {t('common.discoverShop')}
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
                        Commande #{o.reference}
                      </span>
                      {getStatusBadge(o.status)}
                    </div>
                    <span style={{ fontSize: 13, color: '#64748B' }}>
                      {t('orders.placedOn', { date: new Date(o.created_at || Date.now()).toLocaleDateString(i18n.resolvedLanguage, { day: 'numeric', month: 'long', year: 'numeric' }), n: o.items_count || o.items?.length || 1 })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#64748B' }}>{t('orders.totalAmount')}</div>
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
                      {isOpen ? t('orders.hide') : t('orders.details')}
                    </button>
                  </div>
                </div>

                {/* TIMELINE DE SUIVI RAPIDE */}
                <div style={{ padding: '16px 0 8px 0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, position: 'relative' }}>
                    {[
                      { label: t('orders.step.validation'), active: step >= 1 },
                      { label: t('orders.step.preparing'), active: step >= 2 },
                      { label: o.shipping_address?.method === 'pickup' ? t('orders.step.ready') : t('orders.step.shipping'), active: step >= 3 },
                      { label: o.shipping_address?.method === 'pickup' ? t('orders.step.collected') : t('common.shipping'), active: step >= 4 },
                    ].map((st, idx) => (
                      <div key={st.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
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
                            {o.shipping_address?.method === 'pickup' ? t('orders.ready') : t('orders.onTheWay')}
                          </h4>
                          <p style={{ margin: 0, fontSize: 13, color: '#15803D' }}>
                            {o.shipping_address?.method === 'pickup'
                              ? t('orders.pinPickup')
                              : t('orders.pinDelivery')}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <input
                            type="text"
                            maxLength={6}
                            placeholder={t('orders.pinPlaceholder')}
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
                            {updating ? t('orders.confirming') : (o.shipping_address?.method === 'pickup' ? t('orders.confirmPickup') : t('orders.confirmReceipt'))}
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--navy,#0F172A)' }}>{t('orders.items')}</h4>
                      <button
                        type="button"
                        onClick={() => alert(t('orders.invoiceDownload', { ref: o.reference }))}
                        style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}
                      >
                        <IconPdf /> Télécharger la facture (PDF)
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
                              {item.product_name || t('orders.pieceFallback')}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748B' }}>
                              SKU: {item.sku || 'SKU-001'} • Quantité: {item.quantity} × {eur(item.unit_price || 0)}
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
                              📍 <strong>{t('orders.pickupAt')}</strong><br />
                              <span style={{ fontSize: 12 }}>Maison Lián, 12 Rue de la Paix, 75002 Paris</span>
                            </>
                          ) : (
                            <>
                              📍 <strong>{t('orders.deliveryAddress')}</strong><br />
                              <span style={{ fontSize: 12 }}>{o.shipping_address.full_name || ''} — {o.shipping_address.address || ''}, {o.shipping_address.postal_code || ''} {o.shipping_address.city || ''} ({o.shipping_address.country || 'FR'})</span>
                            </>
                          )}
                        </div>

                        <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0', color: '#334155' }}>
                          💳 <strong>{t('orders.payment')}</strong><br />
                          <span style={{ fontSize: 12 }}>
                            {(o.payment_method || o.shipping_address.payment_method) === 'cod'
                              ? `💵 ${t('orders.paymentCod')}`
                              : (o.payment_method || o.shipping_address.payment_method) === 'airwallex'
                              ? `🔒 ${t('checkout.online')}`
                              : (o.payment_method || o.shipping_address.payment_method) === 'transfer'
                              ? `🏦 ${t('checkout.transfer')}`
                              : (o.payment_method || o.shipping_address.payment_method) === 'paypal'
                              ? '🅿️ PayPal'
                              : `💳 ${t('orders.paymentCard')}`}
                          </span>
                        </div>
                        {o.bank_transfer && <BankTransferDetails transfer={o.bank_transfer} />}
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
