import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import ProductCard from '../components/ProductCard.jsx';
import { catalogProducts } from '../data/products.jsx';
import { api } from '../lib/api.js';
import { productsFromApi } from '../lib/catalog.js';

const PRICE_MIN = 0;
const PRICE_MAX = 300;

// Le MOQ est la quantité minimale de commande en gros : plus il est bas,
// plus la pièce est accessible à une petite boutique.
const MOQ_OPTIONS = [
  { value: '', label: 'Tous les paliers' },
  { value: '12', label: 'MOQ ≤ 12 pièces' },
  { value: '24', label: 'MOQ ≤ 24 pièces' },
  { value: '50', label: 'MOQ ≤ 50 pièces' },
];

const SORTS = [
  { value: '-created_at', label: 'Trier par : Nouveautés' },
  { value: 'name', label: 'Nom (A → Z)' },
  { value: 'min_price', label: 'Prix croissant' },
  { value: '-min_price', label: 'Prix décroissant' },
];

export default function Category({ title = 'Boutique' }) {
  // Les filtres vivent dans l'URL : un lien « /boutique?category=epingles »
  // depuis l'accueil arrive donc déjà filtré, et la page reste partageable.
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const color = params.get('color') || '';
  const ordering = params.get('sort') || '-created_at';
  const maxPrice = params.get('max_price') || '';
  const maxMoq = params.get('max_moq') || '';

  const [products, setProducts] = useState(catalogProducts);
  const [cats, setCats] = useState([]);
  const [colors, setColors] = useState([]);
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);
  // Position du curseur pendant le glissement (l'URL, elle, ne bouge qu'au relâchement).
  const [priceCursor, setPriceCursor] = useState(Number(maxPrice) || PRICE_MAX);

  // Remplace un filtre dans l'URL (valeur vide = on l'enlève).
  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  // Le curseur suit l'URL : retour arrière du navigateur, lien partagé, etc.
  useEffect(() => { setPriceCursor(Number(maxPrice) || PRICE_MAX); }, [maxPrice]);

  useEffect(() => {
    api.categories().then((d) => setCats(d.results || d)).catch(() => {});
    api.colors().then((d) => setColors(d.results || d)).catch(() => {});
  }, []);

  // Au maximum, le filtre n'a plus de sens : on le retire de l'URL.
  const commitPrice = (value) => setFilter('max_price', value >= PRICE_MAX ? '' : String(value));

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.products({
      page_size: 50,
      category: category || undefined,
      color: color || undefined,
      max_price: maxPrice || undefined,
      max_moq: maxMoq || undefined,
      ordering,
    })
      .then((data) => {
        if (!alive) return;
        setProducts(productsFromApi(data));
        setCount(data.count ?? null);
      })
      .catch(() => { /* API indisponible : on garde ce qui est affiché */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [category, color, maxPrice, maxMoq, ordering]);

  const heading = cats.find((c) => c.slug === category)?.name || title;

  return (
    <>
      <div className="uee-breadcrumb">
        <div className="container">
          <Link to="/">Accueil</Link><span className="sep">/</span>
          {category ? (
            <>
              <Link to="/boutique">{title}</Link><span className="sep">/</span>
              <span>{heading}</span>
            </>
          ) : <span>{title}</span>}
        </div>
      </div>

      <div className="container">
        <div className="uee-shop-layout">
          {/* SIDEBAR */}
          <aside className="uee-sidebar">
            <div className="uee-filter-block">
              <h4>Catégories</h4>
              <label className="uee-checkline">
                <span>
                  <input type="radio" name="cat" checked={category === ''}
                    onChange={() => setFilter('category', '')} /> Toutes
                </span>
              </label>
              {cats.map((c) => (
                <label className="uee-checkline" key={c.slug}>
                  <span>
                    <input type="radio" name="cat" checked={category === c.slug}
                      onChange={() => setFilter('category', c.slug)} /> {c.name}
                  </span>
                </label>
              ))}
              {cats.length === 0 && <p className="filter-note">Aucune catégorie enregistrée.</p>}
            </div>

            <div className="uee-filter-block">
              <h4>Couleur</h4>
              <div className="uee-swatches">
                {colors.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    style={{ background: c.hex_code }}
                    className={color === c.slug ? 'sel' : undefined}
                    aria-pressed={color === c.slug}
                    title={c.name}
                    /* Recliquer sur la pastille active retire le filtre. */
                    onClick={() => setFilter('color', color === c.slug ? '' : c.slug)}
                  />
                ))}
              </div>
              {colors.length === 0 && <p className="filter-note">Aucun coloris enregistré.</p>}
              {color && (
                <button type="button" className="filter-clear" onClick={() => setFilter('color', '')}>
                  Retirer le filtre couleur
                </button>
              )}
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
              <span className="count-label">
                {count ?? products.length} produit(s) — <strong>{heading}</strong>
              </span>
              <div className="uee-sort">
                <select value={ordering} onChange={(e) => setFilter('sort', e.target.value)}>
                  {SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="uee-product-grid">
              {products.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>

            {loading && products.length === 0 && <p className="uee-grid-note">Chargement…</p>}
            {!loading && products.length === 0 && (
              <p className="uee-grid-note">Aucun produit ne correspond à ces filtres.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

Category.propTypes = {
  title: PropTypes.string,
};
