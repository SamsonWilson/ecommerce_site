import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProductCard from '../components/ProductCard.jsx';
import { defaultFigure, figureBySlug } from '../data/products.jsx';
import { useWishlist } from '../store/wishlist.js';
import { useCart } from '../store/cart.js';
import { IconHeart, IconBag, IconTrash } from '../components/icons.jsx';

export default function Wishlist() {
  const { t } = useTranslation();
  const items = useWishlist((s) => s.items);
  const clear = useWishlist((s) => s.clear);
  const add = useCart((s) => s.add);

  const [addedAll, setAddedAll] = useState(false);

  const favorites = items.map((p) => ({
    ...p,
    figure: figureBySlug[p.slug] || defaultFigure,
  }));

  const handleAddAll = () => {
    favorites.forEach((p) => add(p));
    setAddedAll(true);
    setTimeout(() => setAddedAll(false), 2000);
  };

  return (
    <div className="acc-wishlist">
      <div className="acc-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1>{t('wishlist.title', 'My Wishlist')} <span>({favorites.length})</span></h1>
          <p>{t('wishlist.subtitle', 'Find all your saved favorite items.')}</p>
        </div>

        {favorites.length > 0 && (
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              className="btn-premium"
              onClick={handleAddAll}
              style={{ fontSize: 13, padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <IconBag /> {addedAll ? t('wishlist.allAdded', '✓ All items added') : t('wishlist.addAllToCart', 'Add all to cart')}
            </button>
            <button
              type="button"
              onClick={clear}
              style={{ border: '1px solid rgba(0,0,0,0.15)', background: '#fff', color: 'var(--brand-red)', padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
            >
              <IconTrash /> {t('wishlist.clearWishlist', 'Clear wishlist')}
            </button>
          </div>
        )}
      </div>

      {favorites.length === 0 ? (
        <div className="card-box" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div className="acc-empty">
            <div style={{ fontSize: 40, marginBottom: 12 }}><IconHeart /></div>
            <h2>{t('wishlist.emptyTitle', 'You have no saved favorites yet')}</h2>
            <p style={{ color: 'var(--muted)', marginTop: 8, maxWidth: 400, margin: '8px auto 20px' }}>
              {t('wishlist.emptyText', 'Save your favorite jewelry and accessories to find them anytime.')}
            </p>
            <Link to="/compte/boutique" className="btn-premium" style={{ display: 'inline-flex', padding: '10px 24px' }}>
              {t('wishlist.exploreCatalog', 'Explore the catalog')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="uee-product-grid" style={{ marginTop: 24 }}>
          {favorites.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
