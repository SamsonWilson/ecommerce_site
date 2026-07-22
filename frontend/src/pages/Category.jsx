import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import ProductCard from '../components/ProductCard.jsx';
import { catalogProducts, figureBySlug, defaultFigure } from '../data/products.jsx';
import { api } from '../lib/api.js';

// Formate "128.00" -> "128 €"
const price = (p) => (p == null ? undefined : `${parseFloat(p)} €`);

// Convertit un produit de l'API vers la forme attendue par ProductCard,
// en réutilisant le visuel SVG associé au slug.
const fromApi = (p) => ({
  slug: p.slug,
  name: p.name,
  cat: p.category,
  priceNew: price(p.price),
  priceOld: price(p.original_price),
  figure: figureBySlug[p.slug] || defaultFigure,
});

const categories = [
  { name: 'Épingles & peignes', count: 24, checked: true },
  { name: 'Diadèmes & tiares', count: 12 },
  { name: 'Éventails brodés', count: 9 },
  { name: 'Bracelets', count: 15 },
  { name: "Boucles d'oreilles", count: 18 },
];
const colors = ['#A5293B', '#B08A34', '#ECE3D1', '#435C4E', '#1A2942'];

export default function Category({ title = 'Style chinois', count = 78 }) {
  // Affiche le mock immédiatement, puis remplace par les données de l'API si
  // celle-ci répond (elle passe par le proxy nginx — pas d'URL backend en clair).
  const [products, setProducts] = useState(catalogProducts);

  useEffect(() => {
    let alive = true;
    api.products({ page_size: 50 })
      .then((data) => {
        const items = (data.results || data).map(fromApi);
        if (alive && items.length) setProducts(items);
      })
      .catch(() => { /* API indisponible : on garde le mock */ });
    return () => { alive = false; };
  }, []);

  return (
    <>
      <div className="uee-breadcrumb">
        <div className="container">
          <Link to="/">Accueil</Link><span className="sep">/</span>
          <span>{title}</span>
        </div>
      </div>

      <div className="container">
        <div className="uee-shop-layout">
          {/* SIDEBAR */}
          <aside className="uee-sidebar">
            <div className="uee-filter-block">
              <h4>Catégories</h4>
              {categories.map((c) => (
                <label className="uee-checkline" key={c.name}>
                  <span><input type="checkbox" defaultChecked={c.checked} /> {c.name}</span>
                  <span className="count">{c.count}</span>
                </label>
              ))}
            </div>

            <div className="uee-filter-block">
              <h4>Couleur</h4>
              <div className="uee-swatches">
                {colors.map((c, i) => (
                  <span key={c} style={{ background: c }} className={i === 0 ? 'sel' : undefined} />
                ))}
              </div>
            </div>

            <div className="uee-filter-block">
              <h4>Prix</h4>
              <input className="uee-price-range" type="range" min="0" max="300" defaultValue="150" />
              <div className="uee-price-range"><span>0 €</span><span style={{ marginLeft: 'auto' }}>300 €+</span></div>
            </div>

            <div className="uee-filter-block">
              <h4>Palier professionnel</h4>
              <label className="uee-checkline"><span><input type="checkbox" /> MOQ ≤ 12</span></label>
              <label className="uee-checkline"><span><input type="checkbox" /> MOQ ≤ 24</span></label>
              <label className="uee-checkline"><span><input type="checkbox" /> Sur devis uniquement</span></label>
            </div>

            <div className="uee-filter-block" style={{ background: '#FBEAEA', boxShadow: 'none' }}>
              <h4 style={{ border: 'none' }}>Programme grossiste</h4>
              <p style={{ fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.6 }}>
                Créez un compte pro pour voir vos tarifs préférentiels directement sur cette page.
              </p>
              <Link to="/pro" className="btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: 12 }}>
                Créer un compte pro
              </Link>
            </div>
          </aside>

          {/* GRILLE */}
          <div>
            <div className="uee-shop-toolbar">
              <span className="count-label">{count} produits — <strong>{title}</strong></span>
              <div className="uee-sort">
                <select defaultValue="Trier par : Popularité">
                  <option>Trier par : Popularité</option>
                  <option>Prix croissant</option>
                  <option>Prix décroissant</option>
                  <option>Nouveautés</option>
                </select>
              </div>
            </div>

            <div className="uee-product-grid">
              {products.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>

            <div className="uee-pagination">
              <a href="#" className="active">1</a>
              <a href="#">2</a>
              <a href="#">3</a>
              <a href="#">…</a>
              <a href="#">10</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

Category.propTypes = {
  title: PropTypes.string,
  count: PropTypes.number,
};
