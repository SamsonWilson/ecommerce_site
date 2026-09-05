import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { IconHeart, Stars } from './icons.jsx';
import { useCart } from '../store/cart.js';
import { useWishlist } from '../store/wishlist.js';

// Carte produit réutilisable (grilles accueil, catégorie, produits associés).
export default function ProductCard({ product, showStars = false, showWish = true }) {
  const { t } = useTranslation();
  const location = useLocation();
  const add = useCart((s) => s.add);
  const toggleWish = useWishlist((s) => s.toggle);
  const wished = useWishlist((s) => s.items.some((x) => x.slug === product.slug));

  const isAccount = location.pathname.startsWith('/compte');
  const targetLink = isAccount ? `/compte/produit/${product.slug}` : `/produit/${product.slug}`;

  // Confirmation brève après l'ajout : sans retour visuel, le clic semble sans effet.
  const [added, setAdded] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const addToCart = () => {
    add(product);
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1600);
  };

  const stock = Number(product.stock ?? 0);
  const stockLabel = stock > 0 ? `Stock : ${stock} dispo` : 'Rupture de stock';

  return (
    <div className="uee-card">
      <div className="uee-card-media">
        {product.badge && <span className="uee-badge">{product.badge}</span>}
        {showWish && (
          <button
            type="button"
            className={`uee-wish${wished ? ' on' : ''}`}
            aria-pressed={wished}
            aria-label={t(wished ? 'common.removeFromWishlist' : 'common.addToWishlist')}
            title={t(wished ? 'common.removeFromWishlist' : 'common.addToWishlist')}
            onClick={() => toggleWish(product)}
          >
            <IconHeart />
          </button>
        )}
        {product.image
          ? <Link to={targetLink}><img className="uee-card-photo" src={product.image} alt={product.name} loading="lazy" /></Link>
          : <Link to={targetLink} style={{ display: 'block', width: '100%', height: '100%', color: 'inherit' }}>{product.figure}</Link>}
        <button type="button" className="uee-quickadd" onClick={addToCart}>
          {added ? t('common.added') : t('common.addToCart')}
        </button>
      </div>
      <div className="uee-card-info">
        <span className="ci-cat">{product.cat}</span>
        <div className="ci-name">
          <Link to={targetLink}>{product.name}</Link>
        </div>
        {showStars && typeof product.rating === 'number' && <Stars value={product.rating} />}
        <div className="price-row">
          <span className="new">{product.priceNew}</span>
          {product.priceOld && <span className="old">{product.priceOld}</span>}
        </div>
        <div className={`stock-tag ${stock > 0 ? 'in-stock' : 'out-stock'}`}>
          {stock > 0 ? `Disponible : ${stock}` : 'Épuisé'}
        </div>
        {product.moq && <div className="moq-tag">{product.moq}</div>}
      </div>
    </div>
  );
}

ProductCard.propTypes = {
  product: PropTypes.shape({
    slug: PropTypes.string.isRequired,
    cat: PropTypes.string,
    name: PropTypes.string.isRequired,
    priceNew: PropTypes.string,
    priceOld: PropTypes.string,
    badge: PropTypes.string,
    image: PropTypes.string,
    moq: PropTypes.string,
    stock: PropTypes.number,
    rating: PropTypes.number,
    figure: PropTypes.node,
  }).isRequired,
  showStars: PropTypes.bool,
  showWish: PropTypes.bool,
};
