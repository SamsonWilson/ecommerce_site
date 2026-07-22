import { Link } from 'react-router-dom';
import { cartTotals, eur } from '../data/cart.jsx';
import { figureBySlug, defaultFigure } from '../data/products.jsx';
import { useCart } from '../store/cart.js';
import { IconTrash, IconBag, IconCheck } from '../components/icons.jsx';

export default function Cart() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);

  const { subtotal, shipping, total } = cartTotals(items);

  return (
    <>
      <div className="uee-breadcrumb">
        <div className="container">
          <Link to="/">Accueil</Link><span className="sep">/</span><span>Panier</span>
        </div>
      </div>

      <div className="container">
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="ic"><IconBag /></div>
            <h2>Votre panier est vide</h2>
            <p>Parcourez le catalogue et ajoutez vos pièces préférées.</p>
            <Link to="/boutique" className="btn-primary">Découvrir la boutique</Link>
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
                      <button aria-label="Diminuer" onClick={() => setQty(it.slug, -1)}>−</button>
                      <input type="text" value={it.qty} readOnly aria-label="Quantité" />
                      <button aria-label="Augmenter" onClick={() => setQty(it.slug, 1)}>+</button>
                    </div>
                  </div>
                  <div className="cl-right">
                    <span className="cl-price">{eur(it.unit * it.qty)}</span>
                    <button className="cl-remove" onClick={() => remove(it.slug)}><IconTrash />Retirer</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="card-box summary">
              <div className="card-title">Récapitulatif</div>
              <div className="srow"><span>Sous-total</span><span>{eur(subtotal)}</span></div>
              <div className="srow muted"><span>Livraison</span><span>{shipping === 0 ? 'Offerte' : eur(shipping)}</span></div>
              <div className="promo">
                <input type="text" placeholder="Code promo" />
                <button type="button">Appliquer</button>
              </div>
              <div className="stotal"><span>Total</span><span className="amt">{eur(total)}</span></div>
              <Link to="/checkout" className="btn-primary">Passer la commande</Link>
              <div className="reassure"><IconCheck />Paiement sécurisé · Retours sous 30 jours</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
