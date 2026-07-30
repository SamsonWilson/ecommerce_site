import { Link } from 'react-router-dom';
import { cartTotals, eur } from '../../data/cart.jsx';
import { figureBySlug, defaultFigure } from '../../data/products.jsx';
import { useCart } from '../../store/cart.js';
import { IconTrash, IconBag, IconCheck } from '../../components/icons.jsx';

export default function AccountCart() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);

  const { subtotal, shipping, total } = cartTotals(items);

  return (
    <div className="acc-overview">
      <div className="acc-head">
        <div className="acc-head-content">
          <h1>Mon <span>Panier</span></h1>
          <p>Gérez les articles de votre panier avant de passer commande.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="acc-empty">
          <div style={{ marginBottom: 16 }}><IconBag /></div>
          <h2>Votre panier est vide</h2>
          <p>Parcourez la boutique pour ajouter vos articles préférés.</p>
          <Link to="/compte/boutique" className="btn-premium" style={{ marginTop: 24 }}>
            Découvrir la boutique
          </Link>
        </div>
      ) : (
        <div className="split-2" style={{ gap: 32 }}>
          {/* Liste des articles */}
          <div className="acc-info-card" style={{ padding: 24 }}>
            <div className="card-title">Articles ({items.length})</div>
            {items.map((it) => (
              <div className="cart-line" key={it.slug} style={{ display: 'flex', gap: 20, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div className="cart-thumb" style={{ width: 80, flexShrink: 0 }}>
                  {figureBySlug[it.slug] || defaultFigure}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="cl-cat" style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase' }}>{it.cat}</div>
                  <Link className="cl-name" to={`/produit/${it.slug}`} style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)', textDecoration: 'none' }}>
                    {it.name}
                  </Link>
                  <div className="cl-moq" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{it.moq}</div>
                  
                  <div className="uee-qty-stepper" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, width: 'max-content', background: '#f5f7f9', padding: 4, borderRadius: 8 }}>
                    <button type="button" aria-label="Diminuer" onClick={() => setQty(it.slug, -1)} style={{ width: 28, height: 28, border: 'none', background: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}>−</button>
                    <input type="text" value={it.qty} readOnly aria-label="Quantité" style={{ width: 32, textAlign: 'center', border: 'none', background: 'transparent', fontWeight: 600 }} />
                    <button type="button" aria-label="Augmenter" onClick={() => setQty(it.slug, 1)} style={{ width: 28, height: 28, border: 'none', background: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                  </div>
                </div>
                <div className="cl-right" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <span className="cl-price" style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>{eur(it.unit * it.qty)}</span>
                  <button type="button" className="cl-remove" onClick={() => remove(it.slug)} style={{ background: 'none', border: 'none', color: 'var(--brand-red)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
                    <IconTrash /> Retirer
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Récapitulatif */}
          <div className="acc-info-card" style={{ padding: 24, height: 'fit-content' }}>
            <div className="card-title">Récapitulatif</div>
            <div className="srow" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, color: 'var(--navy)', fontWeight: 500 }}>
              <span>Sous-total</span><span>{eur(subtotal)}</span>
            </div>
            <div className="srow muted" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, color: 'var(--muted)', fontSize: 14 }}>
              <span>Livraison</span><span>{shipping === 0 ? 'Offerte' : eur(shipping)}</span>
            </div>
            <div className="stotal" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 20, marginBottom: 32, fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>
              <span>Total</span><span className="amt">{eur(total)}</span>
            </div>
            <Link to="/compte/checkout" className="btn-premium" style={{ width: '100%', display: 'flex' }}>
              Passer la commande
            </Link>
            <div className="reassure" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, fontSize: 12, color: 'var(--muted)' }}>
              <IconCheck /> Paiement sécurisé · Retours sous 30 jours
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
