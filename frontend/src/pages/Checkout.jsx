import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { cartTotals, eur } from '../data/cart.jsx';
import { useCart } from '../store/cart.js';
import { IconCheck, IconCard, IconLock } from '../components/icons.jsx';

export default function Checkout() {
  const navigate = useNavigate();
  const cartItems = useCart((s) => s.items);
  const [shipMethod, setShipMethod] = useState('standard');
  const [payMethod, setPayMethod] = useState('card');
  const { subtotal, shipping, total } = cartTotals(cartItems);

  const submit = (e) => {
    e.preventDefault();
    // En production : POST /api/v1/checkout/ (le total est recalculé côté serveur).
    navigate('/commande/confirmee');
  };

  return (
    <>
      <div className="uee-breadcrumb">
        <div className="container">
          <Link to="/">Accueil</Link><span className="sep">/</span>
          <Link to="/panier">Panier</Link><span className="sep">/</span><span>Commande</span>
        </div>
      </div>

      <div className="container">
        <form className="split-2" onSubmit={submit}>
          <div>
            <div className="card-box">
              <div className="step-head"><span className="num">1</span><h3>Adresse de livraison</h3></div>
              <div className="form-grid">
                <div className="field"><label htmlFor="prenom">Prénom</label><input id="prenom" required /></div>
                <div className="field"><label htmlFor="nom">Nom</label><input id="nom" required /></div>
                <div className="field full"><label htmlFor="adr">Adresse</label><input id="adr" required /></div>
                <div className="field"><label htmlFor="cp">Code postal</label><input id="cp" required /></div>
                <div className="field"><label htmlFor="ville">Ville</label><input id="ville" required /></div>
                <div className="field"><label htmlFor="pays">Pays</label>
                  <select id="pays" defaultValue="France"><option>France</option><option>Belgique</option><option>Suisse</option><option>Canada</option></select>
                </div>
                <div className="field"><label htmlFor="tel">Téléphone</label><input id="tel" type="tel" /></div>
                <div className="field full"><label htmlFor="mail">E-mail</label><input id="mail" type="email" required /></div>
              </div>
            </div>

            <div className="card-box">
              <div className="step-head"><span className="num">2</span><h3>Mode de livraison</h3></div>
              <div className="choice-row">
                {[
                  { id: 'standard', ct: 'Standard — 48/72h', cs: subtotal >= 150 ? 'Offerte' : eur(6.9) },
                  { id: 'express', ct: 'Express — 24h', cs: eur(12.9) },
                ].map((o) => (
                  <label className={`choice ${shipMethod === o.id ? 'sel' : ''}`} key={o.id}>
                    <input type="radio" name="ship" checked={shipMethod === o.id} onChange={() => setShipMethod(o.id)} />
                    <span><span className="ct">{o.ct}</span><br /><span className="cs">{o.cs}</span></span>
                  </label>
                ))}
              </div>
            </div>

            <div className="card-box">
              <div className="step-head"><span className="num">3</span><h3>Paiement</h3></div>
              <div className="choice-row">
                {[
                  { id: 'card', ct: 'Carte bancaire', cs: 'Visa · Mastercard · AMEX' },
                  { id: 'paypal', ct: 'PayPal', cs: 'Compte PayPal' },
                ].map((o) => (
                  <label className={`choice ${payMethod === o.id ? 'sel' : ''}`} key={o.id}>
                    <input type="radio" name="pay" checked={payMethod === o.id} onChange={() => setPayMethod(o.id)} />
                    <span><span className="ct">{o.ct}</span><br /><span className="cs">{o.cs}</span></span>
                  </label>
                ))}
              </div>
              {payMethod === 'card' && (
                <div className="form-grid" style={{ marginTop: 16 }}>
                  <div className="field full"><label htmlFor="cc">Numéro de carte</label><input id="cc" placeholder="1234 5678 9012 3456" /></div>
                  <div className="field"><label htmlFor="exp">Expiration</label><input id="exp" placeholder="MM/AA" /></div>
                  <div className="field"><label htmlFor="cvc">CVC</label><input id="cvc" placeholder="123" /></div>
                </div>
              )}
              <p className="summary-note" style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--muted)', marginTop: 14 }}>
                <IconLock />Vos données de carte ne transitent jamais par nos serveurs (Stripe Elements).
              </p>
            </div>
          </div>

          {/* RÉCAP */}
          <div className="card-box summary">
            <div className="card-title">Votre commande</div>
            {cartItems.map((it) => (
              <div className="srow" key={it.slug}>
                <span>{it.name} × {it.qty}</span><span>{eur(it.unit * it.qty)}</span>
              </div>
            ))}
            <div className="srow muted" style={{ borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 12 }}>
              <span>Sous-total</span><span>{eur(subtotal)}</span>
            </div>
            <div className="srow muted"><span>Livraison</span><span>{shipping === 0 ? 'Offerte' : eur(shipping)}</span></div>
            <div className="stotal"><span>Total</span><span className="amt">{eur(total)}</span></div>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <IconCard />Payer {eur(total)}
            </button>
            <div className="reassure"><IconCheck />Commande protégée · TVA incluse</div>
          </div>
        </form>
      </div>
    </>
  );
}
