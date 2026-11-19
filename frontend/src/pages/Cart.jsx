import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cartTotals, eur } from '../data/cart.jsx';
import { figureBySlug, defaultFigure } from '../data/products.jsx';
import { useCart } from '../store/cart.js';
import { IconTrash, IconBag, IconCheck } from '../components/icons.jsx';
import QuoteRequestForm from '../components/QuoteRequestForm.jsx';

export default function Cart() {
  const { t } = useTranslation();
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);

  const { subtotal } = cartTotals(items);

  return (
    <>
      <div className="uee-breadcrumb">
        <div className="container">
          <Link to="/">{t('common.home')}</Link><span className="sep">/</span><span>{t('common.cart')}</span>
        </div>
      </div>

      <div className="container">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="ic"><IconBag /></div>
            <h2>{t('common.emptyCart')}</h2>
            <p>{t('cart.emptyHint')}</p>
            <Link to="/boutique" className="btn-primary">{t('common.discoverShop')}</Link>
          </div>
        ) : (
          <div className="split-2">
            <div className="card-box">
              <div className="card-title">Mon panier ({items.length})</div>
              {items.map((it) => (
                <div className="cart-line" key={it.slug}>
                  <div className="cart-thumb">{figureBySlug[it.slug] || defaultFigure}</div>
                  <div>
                    <div className="cl-cat">{it.cat}</div>
                    <Link className="cl-name" to={`/produit/${it.slug}`}>{it.name}</Link>
                    <div className="cl-moq">{it.moq}</div>
                    <div className="uee-qty-stepper" style={{ marginTop: 10, width: 'max-content' }}>
                      <button aria-label={t('common.decrease')} onClick={() => setQty(it.slug, -1)}>−</button>
                      <input type="text" value={it.qty} readOnly aria-label={t('common.quantity')} />
                      <button aria-label={t('common.increase')} onClick={() => setQty(it.slug, 1)}>+</button>
                    </div>
                  </div>
                  <div className="cl-right">
                    <span className="cl-price">{eur(it.unit * it.qty)}</span>
                    <button className="cl-remove" onClick={() => remove(it.slug)}><IconTrash />{t('common.remove')}</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="card-box summary">
              <div className="card-title">{t('common.summary')}</div>
              <div className="srow"><span>{t('common.subtotal')}</span><span>{eur(subtotal)}</span></div>
              <div className="srow muted"><span>{t('common.shipping')}</span><span>{t('common.shippingAtCheckout')}</span></div>
              <div className="promo">
                <input type="text" placeholder={t('cart.promoCode')} />
                <button type="button">{t('cart.apply')}</button>
              </div>
              <div className="stotal"><span>{t('common.totalExclShipping')}</span><span className="amt">{eur(subtotal)}</span></div>
              <Link to="/compte/checkout" className="btn-primary">{t('common.checkout')}</Link>
              <QuoteRequestForm items={items} />
              <div className="reassure"><IconCheck />{t('cart.reassure')}</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
