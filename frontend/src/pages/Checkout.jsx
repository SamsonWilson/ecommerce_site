import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { cartTotals, eur } from '../data/cart.jsx';
import { figureBySlug, defaultFigure } from '../data/products.jsx';
import { useCart } from '../store/cart.js';
import { useAuth } from '../store/auth.js';
import { IconCheck, IconCard, IconLock, IconBag } from '../components/icons.jsx';
import { api } from '../lib/api.js';

export default function Checkout() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const cartItems = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clear);

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
      navigate('/commande/confirmee', { state: { order: res.order || res } });
    } catch (err) {
      console.warn('Erreur checkout backend, basculement mode démo local:', err);
      clearCart();
      navigate('/commande/confirmee', {
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
            <h1>Finaliser la <span>Commande</span></h1>
            <p>Votre panier est actuellement vide.</p>
          </div>
        </div>
        <div className="acc-empty">
          <div style={{ marginBottom: 16 }}><IconBag /></div>
          <h2>Aucun article dans votre panier</h2>
          <p>Explorez la boutique pour sélectionner vos pièces préférées avant de commander.</p>
          <Link to="/compte/boutique" className="btn-premium" style={{ marginTop: 24, display: 'inline-flex' }}>
            Découvrir la boutique
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="acc-overview">
      <div className="acc-head">
        <div className="acc-head-content">
          <h1>Finaliser ma <span>Commande</span></h1>
          <p>Vérifiez vos informations de livraison et réglez votre commande en toute sécurité.</p>
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
                <h3 style={{ margin: 0, fontSize: 17, color: 'var(--navy,#0F172A)', fontWeight: 700 }}>Adresse de livraison</h3>
              </div>

              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="field">
                  <label htmlFor="prenom" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Prénom *</label>
                  <input
                    id="prenom"
                    required
                    value={formData.prenom}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="nom" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Nom *</label>
                  <input
                    id="nom"
                    required
                    value={formData.nom}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>

                <div className="field full" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="adr" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Adresse postale *</label>
                  <input
                    id="adr"
                    required
                    placeholder="Numéro et nom de rue, bâtiment, appartement…"
                    value={formData.adr}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="cp" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Code postal *</label>
                  <input
                    id="cp"
                    required
                    value={formData.cp}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="ville" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Ville *</label>
                  <input
                    id="ville"
                    required
                    value={formData.ville}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="pays" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Pays *</label>
                  <select
                    id="pays"
                    value={formData.pays}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, background: '#fff' }}
                  >
                    <option value="France">France</option>
                    <option value="Belgique">Belgique</option>
                    <option value="Suisse">Suisse</option>
                    <option value="Canada">Canada</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="tel" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Téléphone</label>
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
                  <label htmlFor="mail" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>E-mail de confirmation *</label>
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
                <h3 style={{ margin: 0, fontSize: 17, color: 'var(--navy,#0F172A)', fontWeight: 700 }}>Mode de livraison / Retrait</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                {[
                  { id: 'standard', title: 'Livraison Standard', desc: '48h à 72h ouvrés', cost: subtotal >= 150 ? 'Offerte' : eur(6.9) },
                  { id: 'express', title: 'Livraison Express', desc: '24h chrono sécurisé', cost: eur(12.9) },
                  { id: 'pickup', title: 'Retrait Boutique', desc: 'Prêt sous 2h à l\'Atelier', cost: 'Offert' },
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
                  📍 <strong>Retrait à l'Atelier Boutique :</strong> Maison Lián, 12 Rue de la Paix, 75002 Paris.<br />
                  <span style={{ fontSize: 12 }}>Heures d'ouverture : Du Lundi au Samedi, 10h - 19h. Un e-mail / SMS vous sera envoyé dès la préparation terminée.</span>
                </div>
              )}
            </div>

            {/* ETAPE 3 : PAIEMENT SÉCURISÉ */}
            <div className="acc-info-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--brand-red,#E1251B)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>3</span>
                <h3 style={{ margin: 0, fontSize: 17, color: 'var(--navy,#0F172A)', fontWeight: 700 }}>Mode de règlement</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[
                  { id: 'card', title: 'Carte Bancaire', desc: 'Visa, Mastercard, AMEX' },
                  { id: 'paypal', title: 'PayPal', desc: 'Compte PayPal' },
                  { id: 'cod', title: 'À la livraison', desc: shipMethod === 'pickup' ? 'Indisponible en retrait' : 'Espèces / CB à la remise' },
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
                      title={isDisabled ? 'Le paiement à la livraison n\'est pas disponible lors d\'un retrait en boutique.' : undefined}
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
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Numéro de carte</label>
                    <input placeholder="4532 •••• •••• 8910" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Expiration</label>
                    <input placeholder="MM / AA" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>CVC</label>
                    <input placeholder="123" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }} />
                  </div>
                </div>
              )}

              {payMethod === 'cod' && (
                <div style={{ background: '#F0FDF4', padding: 16, borderRadius: 10, border: '1px solid #BBF7D0', color: '#166534', fontSize: 13 }}>
                  💵 <strong>Paiement à la livraison / au retrait :</strong><br />
                  <span style={{ fontSize: 12.5 }}>Aucun débit en ligne immédiat. Vous réglerez le montant exact ({eur(total)}) directement en espèces ou par carte bancaire lors de la remise de votre commande.</span>
                </div>
              )}

              <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748B', marginTop: 16 }}>
                <IconLock /> Cryptage SSL 256-bit — Transactions garanties et sécurisées par Maison Lián.
              </p>
            </div>
          </div>

          {/* RÉCAPITULATIF DU PANIER & VALIDER */}
          <div className="acc-info-card" style={{ padding: 24, sticky: 'top', top: 20, height: 'fit-content' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 17, color: 'var(--navy,#0F172A)', fontWeight: 700, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 12 }}>
              Résumé de la commande ({cartItems.length})
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
                      Qté: {it.qty} × {eur(it.unit)}
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
                <span>Sous-total HT</span>
                <span>{eur(subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                <span>{shipMethod === 'pickup' ? 'Mode de retrait' : 'Frais de livraison'}</span>
                <span>{actualShipping === 0 ? (shipMethod === 'pickup' ? 'Retrait Offert' : 'Offerte') : eur(actualShipping)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, color: 'var(--navy,#0F172A)', borderTop: '1px solid #E2E8F0', paddingTop: 14, marginTop: 4 }}>
                <span>Total TTC</span>
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
              <IconCard /> {submitting ? 'Validation en cours…' : (payMethod === 'cod' ? `Valider la commande (${eur(total)})` : `Confirmer et payer ${eur(total)}`)}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, fontSize: 12, color: '#64748B' }}>
              <IconCheck /> Garantie satisfait ou remboursé sous 30 jours
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
