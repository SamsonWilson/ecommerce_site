import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { IconHeart, Stars } from './icons.jsx';
import { useCart } from '../store/cart.js';

// Carte produit réutilisable (grilles accueil, catégorie, produits associés).
export default function ProductCard({ product, showStars = false, showWish = true }) {
  const { t } = useTranslation();
  const add = useCart((s) => s.add);
  return (
    <div className="uee-card">
      <div className="uee-card-media">
        {product.badge && <span className="uee-badge">{product.badge}</span>}
        {showWish && (
          <span className="uee-wish" role="button" aria-label={t('common.addToWishlist')}><IconHeart /></span>
        )}
        {product.figure}
        <div className="uee-quickadd" role="button" onClick={() => add(product)}>{t('common.addToCart')}</div>
      </div>
      <div className="uee-card-info">
        <span className="ci-cat">{product.cat}</span>
        <div className="ci-name">
          <Link to={`/produit/${product.slug}`}>{product.name}</Link>
        </div>
        {showStars && typeof product.rating === 'number' && <Stars value={product.rating} />}
        <div className="price-row">
          <span className="new">{product.priceNew}</span>
          {product.priceOld && <span className="old">{product.priceOld}</span>}
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
    moq: PropTypes.string,
    rating: PropTypes.number,
    figure: PropTypes.node,
  }).isRequired,
  showStars: PropTypes.bool,
  showWish: PropTypes.bool,
};
