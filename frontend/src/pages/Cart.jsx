import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cartTotals, eur } from '../data/cart.jsx';
import { figureBySlug, defaultFigure } from '../data/products.jsx';
import { useCart } from '../store/cart.js';
import { IconTrash, IconBag, IconCheck } from '../components/icons.jsx';

export default function Cart() {
  const { t } = useTranslation();
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);

  const { subtotal, shipping, total } = cartTotals(items);

  return (
    <>
      <div className="uee-breadcrumb">
        <div className="container">
          <Link to="/">{t('nav.home', 'Home')}</Link><span className="sep">/</span><span>{t('cart.breadcrumb', 'Cart')}</span>
        </div>
      </div>

      <div className="container">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="ic"><IconBag /></div>
            <h2>{t('cart.emptyTitle', 'Your cart is empty')}</h2>
            <p>{t('cart.emptySubtitle', 'Browse our catalog and add your favorite pieces.')}</p>
            <Link to="/boutique" className="btn-primary">{t('cart.discoverShop', 'Explore the shop')}</Link>
          </div>
        ) : (
          <div className="split-2">
            <div className="card-box">
              <div className="card-title">{t('cart.myCart', 'My Cart')} ({items.length})</div>
              {items.map((it) => (
                <div className="cart-line" key={it.slug}>
                  <div className="cart-thumb">{figureBySlug[it.slug] || defaultFigure}</div>
                  <div>
                    <div className="cl-cat">{it.cat}</div>
                    <Link className="cl-name" to={`/produit/${it.slug}`}>{it.name}</Link>
                    <div className="cl-moq">{it.moq}</div>
                    <div className="uee-qty-stepper" style={{ marginTop: 10, width: 'max-content' }}>
                      <button aria-label={t('cart.decrease', 'Decrease quantity')} onClick={() => setQty(it.slug, -1)}>−</button>
                      <input type="text" value={it.qty} readOnly aria-label={t('cart.quantity', 'Quantity')} />
                      <button aria-label={t('cart.increase', 'Increase quantity')} onClick={() => setQty(it.slug, 1)}>+</button>
                    </div>
                  </div>
                  <div className="cl-right">
                    <span className="cl-price">{eur(it.unit * it.qty)}</span>
                    <button className="cl-remove" onClick={() => remove(it.slug)}>
                      <IconTrash />{t('cart.remove', 'Remove')}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="card-box summary">
              <div className="card-title">{t('cart.summaryTitle', 'Summary')}</div>
              <div className="srow"><span>{t('cart.subtotal', 'Subtotal')}</span><span>{eur(subtotal)}</span></div>
              <div className="srow muted"><span>{t('cart.shipping', 'Shipping')}</span><span>{shipping === 0 ? t('cart.shippingFree', 'Free') : eur(shipping)}</span></div>
              <div className="promo">
                <input type="text" placeholder={t('cart.promoPlaceholder', 'Promo code')} />
                <button type="button">{t('cart.promoApply', 'Apply')}</button>
              </div>
              <div className="stotal"><span>{t('cart.total', 'Total')}</span><span className="amt">{eur(total)}</span></div>
              <Link to="/compte/checkout" className="btn-primary">{t('cart.checkout', 'Proceed to Checkout')}</Link>
              <div className="reassure"><IconCheck />{t('cart.securePayment', 'Secure payment · 30-day returns')}</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
