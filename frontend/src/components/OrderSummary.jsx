import { useTranslation } from 'react-i18next';
import { eur } from '../data/cart.jsx';
import { PAID_STATUSES } from '../lib/payment.js';
import { IconPackage } from './icons.jsx';

// Récapitulatif d'une commande enregistrée : les montants viennent du serveur.
export default function OrderSummary({ order }) {
  const { t } = useTranslation();
  const amount = (value) => eur(Number(value));
  const isPickup = order.shipping_address?.method === 'pickup';
  const shipping = Number(order.shipping_cost);
  const paid = PAID_STATUSES.includes(order.status);
  const row = { display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 13.5 };

  return (
    <div className="confirm-box">
      <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconPackage />{t('common.summary')}
      </div>
      {order.items.map((it) => (
        <div className="srow" key={it.id} style={row}>
          <span>{it.product_name} × {it.quantity}</span><span>{amount(it.line_total)}</span>
        </div>
      ))}
      <div className="srow muted" style={{ ...row, borderTop: '1px dashed var(--line)', marginTop: 6 }}>
        <span>{t('common.subtotal')}</span><span>{amount(order.subtotal)}</span>
      </div>
      <div className="srow muted" style={row}>
        <span>{isPickup ? t('checkout.pickupMode') : t('common.shipping')}</span>
        <span>{shipping === 0 ? (isPickup ? t('checkout.pickupOffered') : t('common.free')) : eur(shipping)}</span>
      </div>
      <div className="stotal" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 12 }}>
        <strong>{paid ? t('confirmation.totalPaid') : t('confirmation.totalDue')}</strong>
        <span className="amt" style={{ fontWeight: 800, color: 'var(--brand-red)' }}>{amount(order.total_amount)}</span>
      </div>
    </div>
  );
}
