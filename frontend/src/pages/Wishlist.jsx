import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { catalogProducts } from '../data/products.jsx';

// Sélection factice de favoris (en attendant le modèle Wishlist côté serveur).
const favorites = [catalogProducts[0], catalogProducts[5], catalogProducts[4]];

export default function Wishlist() {
  return (
    <>
      <div className="acc-head">
        <h1>Mes favoris</h1>
        <p>Les pièces que vous avez enregistrées.</p>
      </div>

      {favorites.length === 0 ? (
        <div className="card-box">
          <div className="acc-empty">
            Aucun favori pour l'instant.<br />
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
