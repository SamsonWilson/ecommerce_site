import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { eur } from '../data/cart.jsx';
import { useAuth } from '../store/auth.js';
import { IconCheck } from '../components/icons.jsx';
import OrderSummary from '../components/OrderSummary.jsx';
import BankTransferDetails from '../components/BankTransferDetails.jsx';

// Affiche la commande que le serveur vient d'enregistrer (transmise par le
// checkout), jamais le panier : les montants sont ceux qui seront facturés.
export default function OrderConfirmation() {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuth((s) => s.user);
  const isAccount = location.pathname.startsWith('/compte');
  const shopPath = isAccount ? '/compte/boutique' : '/boutique';
  const order = location.state?.order;

  if (!order?.reference) {
    // Page rechargée ou ouverte directement : rien à montrer.
    return (
      <div className="confirm-wrap">
        <h1>{t('confirmation.missingTitle')}</h1>
        <p>{t('confirmation.missing')}</p>
        <div className="confirm-actions">
          {user && <Link to="/compte/commandes" className="btn-outline">{t('confirmation.track')}</Link>}
          <Link to={shopPath} className="btn-primary">{t('confirmation.continue')}</Link>
        </div>
      </div>
    );
  }

  const amount = (value) => eur(Number(value));
  const isPickup = order.shipping_address?.method === 'pickup';

  return (
    <div className="confirm-wrap">
      <div className="confirm-check"><IconCheck /></div>
      <h1>{t('confirmation.title')}</h1>
      <p>{t('confirmation.recorded')}</p>
      <div className="confirm-ref">{t('confirmation.reference')} : {order.reference}</div>

      <OrderSummary order={order} />

      {order.bank_transfer && <BankTransferDetails transfer={order.bank_transfer} />}

      {order.payment_method === 'cod' && (
        <p style={{ background: '#F0FDF4', padding: 16, borderRadius: 10, border: '1px solid #BBF7D0', color: '#166534', fontSize: 13 }}>
          💵 {t(isPickup ? 'confirmation.payAtPickup' : 'confirmation.payOnDelivery', { amount: amount(order.total_amount) })}
        </p>
      )}

      <div className="confirm-actions">
        {user && <Link to="/compte/commandes" className="btn-outline">{t('confirmation.track')}</Link>}
        <Link to={shopPath} className="btn-primary">{t('confirmation.continue')}</Link>
      </div>
    </div>
  );
}
