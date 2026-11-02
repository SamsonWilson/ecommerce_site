import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cartTotals, eur } from '../data/cart.jsx';
import { useCart } from '../store/cart.js';
import { IconCheck, IconPackage } from '../components/icons.jsx';

export default function OrderConfirmation() {
  const { t } = useTranslation();
  const location = useLocation();
  const isAccount = location.pathname.startsWith('/compte');
  const shopPath = isAccount ? '/compte/boutique' : '/boutique';

  // On fige le contenu du panier au montage, puis on le vide (commande passée).
  const [cartItems] = useState(() => useCart.getState().items);
  const clear = useCart((s) => s.clear);
  useEffect(() => { clear(); }, [clear]);

  const { total } = cartTotals(cartItems);
  const reference = 'CMD-2026-00042';

  return (
    <div className="confirm-wrap">
      <div className="confirm-check"><IconCheck /></div>
      <h1>{t('orderConfirmation.thankYou', 'Thank you for your order!')}</h1>
      <p>{t('orderConfirmation.emailSent', 'A confirmation email has just been sent to your address.')}</p>
      <div className="confirm-ref">{t('orderConfirmation.ref', 'Reference:')} {reference}</div>

      <div className="confirm-box">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconPackage />{t('orderConfirmation.summary', 'Order Summary')}
        </div>
        {cartItems.map((it) => (
          <div className="srow" key={it.slug} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 13.5 }}>
            <span>{it.name} × {it.qty}</span><span>{eur(it.unit * it.qty)}</span>
          </div>
        ))}
        <div className="stotal" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 12 }}>
          <strong>{t('orderConfirmation.totalPaid', 'Total paid')}</strong>
          <span className="amt" style={{ fontWeight: 800, color: 'var(--brand-red)' }}>{eur(total)}</span>
        </div>
      </div>

      <div className="confirm-actions">
        <Link to="/compte/commandes" className="btn-outline">{t('orderConfirmation.trackOrder', 'Track my order')}</Link>
        <Link to={shopPath} className="btn-primary">{t('orderConfirmation.continueShopping', 'Continue shopping')}</Link>
      </div>
    </div>
  );
}
