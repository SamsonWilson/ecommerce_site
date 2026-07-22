import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cartTotals, eur } from '../data/cart.jsx';
import { useCart } from '../store/cart.js';
import { IconCheck, IconPackage } from '../components/icons.jsx';

export default function OrderConfirmation() {
  // On fige le contenu du panier au montage, puis on le vide (commande passée).
  const [cartItems] = useState(() => useCart.getState().items);
  const clear = useCart((s) => s.clear);
  useEffect(() => { clear(); }, [clear]);

  const { total } = cartTotals(cartItems);
  const reference = 'CMD-2026-00042';

  return (
    <div className="confirm-wrap">
      <div className="confirm-check"><IconCheck /></div>
      <h1>Merci pour votre commande !</h1>
      <p>Un e-mail de confirmation vient de vous être envoyé.</p>
      <div className="confirm-ref">Référence : {reference}</div>

      <div className="confirm-box">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconPackage />Récapitulatif
        </div>
        {cartItems.map((it) => (
          <div className="srow" key={it.slug} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 13.5 }}>
            <span>{it.name} × {it.qty}</span><span>{eur(it.unit * it.qty)}</span>
          </div>
        ))}
        <div className="stotal" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 12 }}>
          <strong>Total payé</strong><span className="amt" style={{ fontWeight: 800, color: 'var(--brand-red)' }}>{eur(total)}</span>
        </div>
      </div>

      <div className="confirm-actions">
        <Link to="/compte" className="btn-outline">Suivre ma commande</Link>
        <Link to="/boutique" className="btn-primary">Continuer mes achats</Link>
      </div>
    </div>
  );
}
