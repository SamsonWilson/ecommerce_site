import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { defaultFigure, figureBySlug } from '../data/products.jsx';
import { useWishlist } from '../store/wishlist.js';

export default function Wishlist() {
  // Les favoris sont ceux que le visiteur a réellement cochés (conservés dans
  // le navigateur). Le visuel est ré-résolu ici : le store ne garde que des
  // données sérialisables.
  const items = useWishlist((s) => s.items);
  const favorites = items.map((p) => ({ ...p, figure: figureBySlug[p.slug] || defaultFigure }));

  return (
    <>
      <div className="acc-head">
        <h1>Mes favoris</h1>
        <p>Les pièces que vous avez enregistrées.</p>
      </div>

      {favorites.length === 0 ? (
        <div className="card-box">
          <div className="acc-empty">
            Aucun favori pour l&apos;instant.<br />
            <Link to="/boutique" className="btn-primary" style={{ display: 'inline-block', marginTop: 16 }}>
              Explorer le catalogue
            </Link>
          </div>
        </div>
      ) : (
        <div className="uee-product-grid">
          {favorites.map((p) => (<ProductCard key={p.slug} product={p} />))}
        </div>
      )}
    </>
  );
}
