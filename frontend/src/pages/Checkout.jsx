import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { cartTotals, eur } from '../data/cart.jsx';
import { figureBySlug, defaultFigure } from '../data/products.jsx';
import { useCart } from '../store/cart.js';
import { useAuth } from '../store/auth.js';
import { IconCheck, IconCard, IconLock, IconBag } from '../components/icons.jsx';
import { api } from '../lib/api.js';
import { paymentReturnPath, startOnlinePayment } from '../lib/payment.js';

export default function Checkout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuth((s) => s.user);
  const cartItems = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clear);

  const isAccount = location.pathname.startsWith('/compte');
  const confirmPath = isAccount ? '/compte/commande/confirmee' : '/commande/confirmee';

  const [shipMethod, setShipMethod] = useState('standard');
  // Paiement à la remise, plus le paiement en ligne si un prestataire est configuré.
  const [payMethod, setPayMethod] = useState('cod');
  const [onlineMethod, setOnlineMethod] = useState(null);
  const [transferDays, setTransferDays] = useState(null); // virement : grossistes validés seulement
  const [redirecting, setRedirecting] = useState(false);

  // Pays desservis et frais de port : le serveur décide, la page affiche.
  const [countries, setCountries] = useState([]);
  const [quote, setQuote] = useState(null); // { options, subtotal } ou null pendant le calcul
  const [quoteError, setQuoteError] = useState(false);

  const [formData, setFormData] = useState({
    prenom: user?.first_name || '',
    nom: user?.last_name || '',
    adr: '',
    cp: '',
    ville: '',
    pays: 'FR',
    tel: '',
    mail: user?.email || '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const regionName = useMemo(() => {
    try {
      const names = new Intl.DisplayNames([i18n.resolvedLanguage || 'fr'], { type: 'region' });
      return (code) => names.of(code) || code;
    } catch {
      return (code) => code;
    }
  }, [i18n.resolvedLanguage]);

  // Le serveur compte en prix réels (prix pro compris) : on affiche son sous-total.
  const cartSubtotal = cartTotals(cartItems).subtotal;
  const options = quote?.options || [];
  const selected = options.find((o) => o.code === shipMethod) || null;
  const subtotal = quote ? Number(quote.subtotal) : cartSubtotal;
  const shippingCost = selected ? Number(selected.cost) : 0;
  const total = subtotal + shippingCost;
  const isPickup = Boolean(selected?.is_pickup);
  const canCod = Boolean(selected?.cash_on_delivery);
  const isTransfer = payMethod === 'transfer';
  const isOnline = !['cod', 'transfer'].includes(payMethod);
  const canPay = Boolean(selected) && (
    isOnline ? Boolean(onlineMethod) : isTransfer ? Boolean(transferDays) : canCod
  );
  const itemsKey = cartItems.map((it) => `${it.slug}:${it.qty}`).join(',');

  useEffect(() => {
    let active = true;
    api.paymentConfig()
      .then(({ methods, transfer_days: days }) => {
        if (!active) return;
        const online = methods.find((m) => !['cod', 'transfer'].includes(m)) || null;
        if (methods.includes('transfer')) setTransferDays(days);
        if (online) {
          setOnlineMethod(online);
          setPayMethod(online);
        }
      })
      .catch(() => { /* paiement à la remise seulement */ });
    return () => { active = false; };
  }, []);

  // Le mode de livraison choisi peut refuser le paiement à la remise.
  useEffect(() => {
    const fallback = onlineMethod || (transferDays ? 'transfer' : null);
    if (payMethod === 'cod' && selected && !canCod && fallback) setPayMethod(fallback);
  }, [payMethod, selected, canCod, onlineMethod, transferDays]);

  useEffect(() => {
    let active = true;
    api.shippingCountries()
      .then(({ countries: list }) => {
        if (!active) return;
        setCountries(list);
        setFormData((prev) => (list.includes(prev.pays) ? prev : { ...prev, pays: list[0] || '' }));
      })
      .catch(() => active && setQuoteError(true));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!formData.pays || !itemsKey) return undefined;
    let active = true;
    setQuote(null);
    setQuoteError(false);
    api.shippingOptions({
      country: formData.pays,
      items: cartItems.map((item) => ({ slug: item.slug, quantity: item.qty })),
    })
      .then((data) => {
        if (!active) return;
        setQuote(data);
        // Le mode choisi n'existe pas forcément dans le nouveau pays.
        setShipMethod((current) => (
          data.options.some((o) => o.code === current) ? current : (data.options[0]?.code || '')
        ));
      })
      .catch(() => active && setQuoteError(true));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.pays, itemsKey, i18n.resolvedLanguage]);

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
      },
      shipping_method: shipMethod,
      payment_method: payMethod,
      // Le serveur retrouve l'article par son slug et fixe lui-même le prix.
      items: cartItems.map((item) => ({ slug: item.slug, quantity: item.qty })),
    };

    let res;
    try {
      res = await api.checkout(payload);
    } catch (err) {
      // Rien n'a été enregistré : le client doit le savoir, et garde son panier.
      console.warn('Erreur checkout backend :', err);
      setError(err.data?.detail || t('checkout.failed'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSubmitting(false);
      return;
    }

    // La commande est enregistrée : le panier peut être vidé.
    const order = res.order || res;
    if (!isOnline) {
      clearCart();
      navigate(confirmPath, { state: { order } });
      return;
    }
    setRedirecting(true);
    clearCart();
    try {
      await startOnlinePayment(order.reference, res.payment_token);
    } catch (err) {
      console.warn('Paiement en ligne non démarré :', err);
      // La page de retour propose de reprendre le paiement.
      navigate(paymentReturnPath(order.reference, res.payment_token, { cancelled: '1' }));
    }
  };

  if (redirecting) {
    return (
      <div className="acc-overview">
        <div className="acc-empty">
          <div style={{ marginBottom: 16 }}><IconLock /></div>
          <h2>{t('checkout.redirecting')}</h2>
          <p>{t('checkout.onlineText')}</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="acc-overview">
        <div className="acc-head">
          <div className="acc-head-content">
            <h1>{t('checkout.titleStart')} <span>{t('checkout.titleOrder')}</span></h1>
            <p>{t('checkout.cartEmpty')}</p>
          </div>
        </div>
        <div className="acc-empty">
          <div style={{ marginBottom: 16 }}><IconBag /></div>
          <h2>{t('checkout.noItems')}</h2>
          <p>{t('checkout.noItemsHint')}</p>
          <Link to="/compte/boutique" className="btn-premium" style={{ marginTop: 24, display: 'inline-flex' }}>
            {t('common.discoverShop')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="acc-overview">
      <div className="acc-head">
        <div className="acc-head-content">
          <h1>{t('checkout.titleMine')} <span>{t('checkout.titleOrder')}</span></h1>
          <p>{t('checkout.intro')}</p>
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
                <h3 style={{ margin: 0, fontSize: 17, color: 'var(--navy,#0F172A)', fontWeight: 700 }}>{t('checkout.address')}</h3>
              </div>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="field">
                  <label htmlFor="prenom" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('checkout.firstName')}</label>
                  <input
                    id="prenom"
                    required
                    value={formData.prenom}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="nom" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('checkout.lastName')}</label>
                  <input
                    id="nom"
                    required
                    value={formData.nom}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>

                <div className="field full" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="adr" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('checkout.street')}</label>
                  <input
                    id="adr"
                    required
                    placeholder={t('checkout.streetHint')}
                    value={formData.adr}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="cp" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('checkout.postalCode')}</label>
                  <input
                    id="cp"
                    required
                    value={formData.cp}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="ville" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('checkout.city')}</label>
                  <input
                    id="ville"
                    required
                    value={formData.ville}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="pays" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('checkout.country')}</label>
                  <select
                    id="pays"
                    value={formData.pays}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, background: '#fff' }}
                  >
                    {countries
                      .map((code) => [code, regionName(code)])
                      .sort((a, b) => a[1].localeCompare(b[1], i18n.resolvedLanguage))
                      .map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="tel" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('common.phone')}</label>
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
                  <label htmlFor="mail" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>{t('checkout.confirmEmail')}</label>
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
                <h3 style={{ margin: 0, fontSize: 17, color: 'var(--navy,#0F172A)', fontWeight: 700 }}>{t('checkout.deliveryMode')}</h3>
              </div>

              {quoteError && <p style={{ margin: 0, fontSize: 13, color: '#991B1B' }}>{t('checkout.optionsFailed')}</p>}
              {!quoteError && !quote && <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>{t('checkout.loadingOptions')}</p>}
              {quote && options.length === 0 && <p style={{ margin: 0, fontSize: 13, color: '#991B1B' }}>{t('checkout.noOption')}</p>}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                {options.map((o) => ({
                  id: o.code,
                  title: o.name,
                  desc: o.delay,
                  cost: Number(o.cost) === 0 ? (o.is_pickup ? t('checkout.pickupFree') : t('common.free')) : eur(Number(o.cost)),
                })).map((option) => {
                  const isSelected = shipMethod === option.id;
                  return (
                    <div
                      key={option.id}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setShipMethod(option.id))}
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

              {isPickup && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, color: '#1E40AF', fontSize: 13 }}>
                  📍 <strong>{t('checkout.pickupAt')}</strong> Maison Lián, 12 Rue de la Paix, 75002 Paris.<br />
                  <span style={{ fontSize: 12 }}>{t('checkout.pickupHours')}</span>
                </div>
              )}
            </div>

            {/* ETAPE 3 : PAIEMENT SÉCURISÉ */}
            <div className="acc-info-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--brand-red,#E1251B)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>3</span>
                <h3 style={{ margin: 0, fontSize: 17, color: 'var(--navy,#0F172A)', fontWeight: 700 }}>{t('checkout.paymentMode')}</h3>
              </div>

              {selected && !canCod && !onlineMethod && !transferDays ? (
                <div style={{ background: '#FEF2F2', padding: 16, borderRadius: 10, border: '1px solid #FCA5A5', color: '#991B1B', fontSize: 13 }}>
                  {t('checkout.noPaymentForMethod')}
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
                    {[
                      onlineMethod && { id: onlineMethod, title: t('checkout.online'), desc: t('checkout.onlineHint') },
                      transferDays && { id: 'transfer', title: t('checkout.transfer'), desc: t('checkout.transferHint') },
                      canCod && {
                        id: 'cod',
                        title: isPickup ? t('checkout.payAtPickup') : t('checkout.cod'),
                        desc: isPickup ? t('checkout.payAtPickupHint') : t('checkout.codHint'),
                      },
                    ].filter(Boolean).map((p) => {
                      const isSelected = payMethod === p.id;
                      return (
                        <div
                          key={p.id}
                          role="radio"
                          aria-checked={isSelected}
                          tabIndex={0}
                          data-payment={p.id}
                          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setPayMethod(p.id))}
                          onClick={() => setPayMethod(p.id)}
                          style={{
                            padding: 16,
                            borderRadius: 10,
                            border: isSelected ? '2px solid var(--brand-red,#E1251B)' : '1px solid #E2E8F0',
                            background: isSelected ? '#FFF5F5' : '#FAFAFA',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy,#0F172A)', marginBottom: 4 }}>{p.title}</div>
                          <div style={{ fontSize: 12, color: '#64748B' }}>{p.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                  {isOnline ? (
                    <div style={{ background: '#EFF6FF', padding: 16, borderRadius: 10, border: '1px solid #BFDBFE', color: '#1E40AF', fontSize: 13 }}>
                      🔒 {t('checkout.onlineText')}
                    </div>
                  ) : isTransfer ? (
                    <div style={{ background: '#EFF6FF', padding: 16, borderRadius: 10, border: '1px solid #BFDBFE', color: '#1E40AF', fontSize: 13 }}>
                      🏦 {t('checkout.transferText', { days: transferDays })}
                    </div>
                  ) : (
                    <div style={{ background: '#F0FDF4', padding: 16, borderRadius: 10, border: '1px solid #BBF7D0', color: '#166534', fontSize: 13 }}>
                      💵 <strong>{t('checkout.codTitle')}</strong><br />
                      <span style={{ fontSize: 12.5 }}>{t('checkout.codText', { amount: eur(total) })}</span>
                    </div>
                  )}
                </>
              )}

              <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748B', marginTop: 16 }}>
                <IconLock /> {t('checkout.secure')}
              </p>
            </div>
          </div>

          {/* RÉCAPITULATIF DU PANIER ET VALIDER */}
          <div className="acc-info-card" style={{ padding: 24, sticky: 'top', top: 20, height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 17, color: 'var(--navy,#0F172A)', fontWeight: 700, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 12 }}>
              {t('checkout.summaryTitle', { count: cartItems.length })}
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
                      {t('checkout.qty')} {it.qty} × {eur(it.unit)}
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
                <span>{t('checkout.subtotalHT')}</span>
                <span>{eur(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>{isPickup ? t('checkout.pickupMode') : t('checkout.shippingFees')}</span>
                <span>{!selected ? '—' : shippingCost === 0 ? (isPickup ? t('checkout.pickupOffered') : t('common.free')) : eur(shippingCost)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: 'var(--navy,#0F172A)', borderTop: '1px solid #E2E8F0', paddingTop: 14, marginTop: 4 }}>
                <span>{t('checkout.totalTTC')}</span>
                <span style={{ color: 'var(--brand-red,#E1251B)' }}>{eur(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || redirecting || !canPay}
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
                cursor: submitting || redirecting ? 'wait' : (!canPay ? 'not-allowed' : 'pointer'),
                opacity: !canPay ? 0.6 : 1,
              }}
            >
              <IconCard /> {redirecting ? t('checkout.redirecting')
                : submitting ? t('checkout.submitting')
                : isOnline ? t('checkout.payOnline', { amount: eur(total) })
                : t('checkout.placeOrder', { amount: eur(total) })}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, fontSize: 12, color: '#64748B' }}>
              <IconCheck /> {t('checkout.guarantee')}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
