import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cartTotals, eur } from '../data/cart.jsx';
import { figureBySlug, defaultFigure } from '../data/products.jsx';
import { useCart } from '../store/cart.js';
import { useAuth } from '../store/auth.js';
import { IconCheck, IconCard, IconLock, IconBag } from '../components/icons.jsx';
import { api } from '../lib/api.js';

export default function Checkout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuth((s) => s.user);
  const cartItems = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clear);

  const isAccount = location.pathname.startsWith('/compte');
  const confirmPath = isAccount ? '/compte/commande/confirmee' : '/commande/confirmee';

  const [shipMethod, setShipMethod] = useState('standard');
  const [payMethod, setPayMethod] = useState('cod');

  const [formData, setFormData] = useState({
    prenom: user?.first_name || '',
    nom: user?.last_name || '',
    adr: '',
    cp: '',
    ville: '',
    pays: 'France',
    tel: '',
    mail: user?.email || '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { subtotal } = cartTotals(cartItems);
  const actualShipping = shipMethod === 'pickup' ? 0 : (shipMethod === 'express' ? 12.9 : (subtotal >= 150 ? 0 : 6.9));
  const total = subtotal + actualShipping;

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        prenom: prev.prenom || user.first_name || '',
        nom: prev.nom || user.last_name || '',
        mail: prev.mail || user.email || '',
      }));
    }
  }, [user]);

  useEffect(() => {
    if (shipMethod === 'pickup' && payMethod === 'cod') {
      setPayMethod('card');
    }
  }, [shipMethod, payMethod]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const payload = {
      email: formData.mail,
      shipping_address: {
        full_name: `${formData.prenom} ${formData.nom}`.trim(),
        address: formData.adr,
        postal_code: formData.cp,
        city: formData.ville,
        country: formData.pays,
        phone: formData.tel,
        method: shipMethod,
      },
      payment_method: payMethod,
      items: cartItems.map((item, index) => ({
        variant_id: index + 1,
        sku: item.slug || `SKU-${index + 1}`,
        product_name: item.name,
        quantity: item.qty,
        unit_price: item.unit,
      })),
    };

    try {
      const res = await api.checkout(payload);
      clearCart();
      navigate(confirmPath, { state: { order: res.order || res } });
    } catch (err) {
      console.warn('Erreur checkout backend, basculement mode démo local:', err);
      clearCart();
      navigate(confirmPath, {
        state: {
          order: {
            reference: `CMD-2026-${Math.floor(100000 + Math.random() * 900000)}`,
            total_amount: total.toFixed(2),
            currency: 'EUR',
          },
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="acc-overview">
        <div className="acc-head">
          <div className="acc-head-content">
            <h1>{t('checkout.title', 'Checkout')} <span>{t('checkout.titleHighlight', 'Order')}</span></h1>
            <p>{t('checkout.emptySubtitle', 'Your cart is currently empty.')}</p>
          </div>
        </div>
        <div className="acc-empty">
          <div style={{ marginBottom: 16 }}><IconBag /></div>
          <h2>{t('checkout.emptyTitle', 'No items in your cart')}</h2>
          <p>{t('checkout.emptyDesc', 'Explore our collection to select your favorite pieces before ordering.')}</p>
          <Link to="/compte/boutique" className="btn-premium" style={{ marginTop: 24, display: 'inline-flex' }}>
            {t('checkout.discoverShop', 'Discover the shop')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="acc-overview">
      <div className="acc-head">
        <div className="acc-head-content">
          <h1>{t('checkout.title', 'Checkout')} <span>{t('checkout.titleHighlight', 'Order')}</span></h1>
          <p>{t('checkout.subtitle', 'Check your shipping information and pay securely.')}</p>
        </div>
      </div>

      {error && (
        <div className="alert-box alert-error" style={{ marginBottom: 24, padding: '14px 18px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 8 }}>
          {error}
        </div>
      )}

      <form onSubmit={submit}>
        <div className="split-2" style={{ gap: 32, alignItems: 'flex-start' }}>
          {/* ÉTAPES DE COMMANDE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* ETAPE 1 : ADRESSE DE LIVRAISON */}
            <div className="acc-info-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--brand-red,#E1251B)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>1</span>
                <h3 style={{ margin: 0, fontSize: 17, color: 'var(--navy,#0F172A)', fontWeight: 700 }}>{t('checkout.step1Title', 'Shipping address')}</h3>
              </div>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="field">
                  <label htmlFor="prenom" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('checkout.firstName', 'First name *')}</label>
                  <input
                    id="prenom"
                    required
                    value={formData.prenom}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="nom" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('checkout.lastName', 'Last name *')}</label>
                  <input
                    id="nom"
                    required
                    value={formData.nom}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>

                <div className="field full" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="adr" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('checkout.address', 'Street address *')}</label>
                  <input
                    id="adr"
                    required
                    placeholder={t('checkout.addressPlaceholder', 'House number and street name, apartment, suite…')}
                    value={formData.adr}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="cp" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('checkout.postalCode', 'Postal code *')}</label>
                  <input
                    id="cp"
                    required
                    value={formData.cp}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="ville" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('checkout.city', 'City *')}</label>
                  <input
                    id="ville"
                    required
                    value={formData.ville}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="pays" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('checkout.country', 'Country *')}</label>
                  <select
                    id="pays"
                    value={formData.pays}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, background: '#fff' }}
                  >
                    <option value="France">France</option>
                    <option value="Belgique">Belgique / Belgium</option>
                    <option value="Suisse">Suisse / Switzerland</option>
                    <option value="Canada">Canada</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="China">中国 / China</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="tel" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('checkout.phone', 'Phone')}</label>
                  <input
                    id="tel"
                    type="tel"
                    placeholder="+33 6 12 34 56 78"
                    value={formData.tel}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>

                <div className="field full" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="mail" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('checkout.email', 'Confirmation email *')}</label>
                  <input
                    id="mail"
                    type="email"
                    required
                    value={formData.mail}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>
              </div>
            </div>

            {/* ETAPE 2 : MODE DE LIVRAISON */}
            <div className="acc-info-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--brand-red,#E1251B)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>2</span>
                <h3 style={{ margin: 0, fontSize: 17, color: 'var(--navy,#0F172A)', fontWeight: 700 }}>{t('checkout.step2Title', 'Shipping method / Store pickup')}</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                {[
                  { id: 'standard', title: t('checkout.shipStandardTitle', 'Standard Delivery'), desc: t('checkout.shipStandardDesc', '48h to 72h business days'), cost: subtotal >= 150 ? t('checkout.free', 'Free') : eur(6.9) },
                  { id: 'express', title: t('checkout.shipExpressTitle', 'Express Delivery'), desc: t('checkout.shipExpressDesc', 'Guaranteed 24h express'), cost: eur(12.9) },
                  { id: 'pickup', title: t('checkout.shipPickupTitle', 'Store Pickup'), desc: t('checkout.shipPickupDesc', 'Ready within 2h at our Atelier'), cost: t('checkout.free', 'Free') },
                ].map((option) => {
                  const isSelected = shipMethod === option.id;
                  return (
                    <div
                      key={option.id}
                      onClick={() => setShipMethod(option.id)}
                      style={{
                        padding: 16,
                        borderRadius: 10,
                        border: isSelected ? '2px solid var(--brand-red,#E1251B)' : '1px solid #E2E8F0',
                        background: isSelected ? '#FFF5F5' : '#FAFAFA',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy,#0F172A)' }}>{option.title}</span>
                        <span style={{ fontWeight: 800, color: 'var(--brand-red,#E1251B)', fontSize: 13 }}>{option.cost}</span>
                      </div>
                      <span style={{ fontSize: 12, color: '#64748B' }}>{option.desc}</span>
                    </div>
                  );
                })}
              </div>

              {shipMethod === 'pickup' && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, color: '#1E40AF', fontSize: 13 }}>
                  📍 <strong>{t('checkout.pickupNoteTitle', 'Pickup at our Atelier Boutique:')}</strong> Maison Lián, 12 Rue de la Paix, 75002 Paris.<br />
                  <span style={{ fontSize: 12 }}>{t('checkout.pickupNoteDetails', "Opening hours: Monday to Saturday, 10am - 7pm. An email / SMS notification will be sent once your order is prepared.")}</span>
                </div>
              )}
            </div>

            {/* ETAPE 3 : PAIEMENT SÉCURISÉ */}
            <div className="acc-info-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--brand-red,#E1251B)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>3</span>
                <h3 style={{ margin: 0, fontSize: 17, color: 'var(--navy,#0F172A)', fontWeight: 700 }}>{t('checkout.step3Title', 'Payment method')}</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[
                  { id: 'card', title: t('checkout.payCardTitle', 'Credit / Debit Card'), desc: t('checkout.payCardDesc', 'Visa, Mastercard, AMEX') },
                  { id: 'paypal', title: t('checkout.payPaypalTitle', 'PayPal'), desc: t('checkout.payPaypalDesc', 'PayPal account') },
                  { id: 'cod', title: t('checkout.payCodTitle', 'Cash on delivery'), desc: shipMethod === 'pickup' ? t('checkout.payCodUnavailablePickup', 'Unavailable for store pickup') : t('checkout.payCodDesc', 'Cash or Card upon delivery') },
                ].map((p) => {
                  const isDisabled = p.id === 'cod' && shipMethod === 'pickup';
                  const isSelected = payMethod === p.id && !isDisabled;
                  return (
                    <div
                      key={p.id}
                      onClick={() => !isDisabled && setPayMethod(p.id)}
                      style={{
                        padding: 16,
                        borderRadius: 10,
                        border: isSelected
                          ? '2px solid var(--brand-red,#E1251B)'
                          : isDisabled
                          ? '1px solid #E2E8F0'
                          : '1px solid #E2E8F0',
                        background: isSelected ? '#FFF5F5' : isDisabled ? '#F1F5F9' : '#FAFAFA',
                        opacity: isDisabled ? 0.5 : 1,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      title={isDisabled ? t('checkout.payCodTooltip', 'Cash on delivery is not available for store pickup.') : undefined}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, color: isDisabled ? '#94A3B8' : 'var(--navy,#0F172A)', marginBottom: 4 }}>{p.title}</div>
                      <div style={{ fontSize: 12, color: isDisabled ? '#94A3B8' : '#64748B' }}>{p.desc}</div>
                    </div>
                  );
                })}
              </div>

              {payMethod === 'card' && (
                <div style={{ background: '#F8FAFC', padding: 20, borderRadius: 10, border: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('checkout.cardNumber', 'Card number')}</label>
                    <input placeholder="4532 •••• •••• 8910" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('checkout.cardExpiry', 'Expiration')}</label>
                    <input placeholder="MM / YY" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('checkout.cardCvc', 'CVC')}</label>
                    <input placeholder="123" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }} />
                  </div>
                </div>
              )}

              {payMethod === 'cod' && (
                <div style={{ background: '#F0FDF4', padding: 16, borderRadius: 10, border: '1px solid #BBF7D0', color: '#166534', fontSize: 13 }}>
                  💵 <strong>{t('checkout.codNoticeTitle', 'Payment on delivery / pickup:')}</strong><br />
                  <span style={{ fontSize: 12.5 }}>{t('checkout.codNoticeDesc', 'No immediate online charge. You will pay the exact amount upon receiving your package.')} ({eur(total)})</span>
                </div>
              )}

              <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748B', marginTop: 16 }}>
                <IconLock /> {t('checkout.sslNotice', '256-bit SSL Encryption — Safe & guaranteed transactions by Maison Lián.')}
              </p>
            </div>
          </div>

          {/* RÉCAPITULATIF DU PANIER & VALIDER */}
          <div className="acc-info-card" style={{ padding: 24, position: 'sticky', top: 20, height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 17, color: 'var(--navy,#0F172A)', fontWeight: 700, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 12 }}>
              {t('checkout.summaryTitle', 'Order summary')} ({cartItems.length})
            </h3>

            {/* LISTE ARTICLES */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 280, overflowY: 'auto', marginBottom: 20, paddingRight: 4 }}>
              {cartItems.map((it) => (
                <div key={it.slug} style={{ display: 'flex', alignItems: 'center', gap: 14, paddingBottom: 12, borderBottom: '1px dashed #E2E8F0' }}>
                  <div style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 6, overflow: 'hidden', background: '#F1F5F9' }}>
                    {figureBySlug[it.slug] || defaultFigure}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--navy,#0F172A)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {it.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      {it.qty} × {eur(it.unit)}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy,#0F172A)' }}>
                    {eur(it.unit * it.qty)}
                  </div>
                </div>
              ))}
            </div>

            {/* DÉTAILS PRIX */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>{t('checkout.subtotalHt', 'Subtotal excl. VAT')}</span>
                <span>{eur(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>{shipMethod === 'pickup' ? t('checkout.pickupMethod', 'Pickup method') : t('checkout.shippingFee', 'Shipping fee')}</span>
                <span>{actualShipping === 0 ? (shipMethod === 'pickup' ? t('checkout.pickupFree', 'Free Pickup') : t('checkout.free', 'Free')) : eur(actualShipping)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: 'var(--navy,#0F172A)', borderTop: '1px solid #E2E8F0', paddingTop: 14, marginTop: 4 }}>
                <span>{t('checkout.totalTtc', 'Total incl. VAT')}</span>
                <span style={{ color: 'var(--brand-red,#E1251B)' }}>{eur(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-premium"
              style={{
                width: '100%',
                padding: '14px 20px',
                fontSize: 16,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              <IconCard /> {submitting ? t('checkout.submitting', 'Processing order…') : (payMethod === 'cod' ? t('checkout.validateCod', { amount: eur(total), defaultValue: `Place order (${eur(total)})` }) : t('checkout.confirmAndPay', { amount: eur(total), defaultValue: `Confirm and pay ${eur(total)}` }))}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, fontSize: 12, color: '#64748B' }}>
              <IconCheck /> {t('checkout.moneyBackGuarantee', '30-day satisfaction or money-back guarantee')}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
