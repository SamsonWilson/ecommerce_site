import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ProductCard from '../../components/ProductCard.jsx';
import { catalogProducts, figureBySlug, defaultFigure } from '../../data/products.jsx';
import { api } from '../../lib/api.js';
import { productsFromApi } from '../../lib/catalog.js';
import { useCart } from '../../store/cart.js';
import { cartTotals, eur } from '../../data/cart.jsx';
import { IconTrash, IconBag } from '../../components/icons.jsx';

const PRICE_MAX = 300;
const SORTS = [
  { value: '-created_at', label: 'Nouveautés' },
  { value: 'name', label: 'Nom A → Z' },
  { value: 'min_price', label: 'Prix croissant' },
  { value: '-min_price', label: 'Prix décroissant' },
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const color = params.get('color') || '';
  const ordering = params.get('sort') || '-created_at';
  const maxPrice = params.get('max_price') || '';

  const [products, setProducts] = useState(catalogProducts);
  const [cats, setCats] = useState([]);
  const [colors, setColors] = useState([]);
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priceCursor, setPriceCursor] = useState(Number(maxPrice) || PRICE_MAX);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Cart state
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const { total } = cartTotals(items);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  useEffect(() => { setPriceCursor(Number(maxPrice) || PRICE_MAX); }, [maxPrice]);

  useEffect(() => {
    api.categories().then((d) => setCats(d.results || d)).catch(() => {});
    api.colors().then((d) => setColors(d.results || d)).catch(() => {});
  }, []);

  const commitPrice = (value) => setFilter('max_price', value >= PRICE_MAX ? '' : String(value));

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.products({
      page_size: 50,
      category: category || undefined,
      color: color || undefined,
      max_price: maxPrice || undefined,
      search: search || undefined,
      ordering,
    })
      .then((data) => {
        if (!alive) return;
        setProducts(productsFromApi(data));
        setCount(data.count ?? null);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [category, color, maxPrice, ordering, search]);

  const heading = cats.find((c) => c.slug === category)?.name || 'Boutique';

  return (
    <div className="acc-shop">
      {/* Header de la boutique intégrée */}
      <div className="acc-shop-header">
        <div className="acc-shop-title">
          <h2>Boutique</h2>
          <span className="acc-shop-count">{count ?? products.length} produit(s)</span>
        </div>
        <div className="acc-shop-controls">
          <div className="acc-shop-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              placeholder="Rechercher un produit…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="acc-shop-sort"
            value={ordering}
            onChange={(e) => setFilter('sort', e.target.value)}
          >
            {SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            type="button"
            className={`acc-shop-filter-btn${filtersOpen ? ' active' : ''}`}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            Filtres
          </button>
        </div>
      </div>

      <div className="acc-shop-layout">
        {/* Panneau filtres latéral / drawer */}
        <aside className={`acc-shop-aside${filtersOpen ? ' open' : ''}`}>
          {/* Catégories */}
          <div className="acc-shop-filter-block">
            <div className="acc-filter-title">Catégories</div>
            <label className="acc-radio-line">
              <input type="radio" name="cat" checked={category === ''} onChange={() => setFilter('category', '')} />
              <span>Toutes</span>
            </label>
            {cats.map((c) => (
              <label key={c.slug} className="acc-radio-line">
                <input type="radio" name="cat" checked={category === c.slug} onChange={() => setFilter('category', c.slug)} />
                <span>{c.name}</span>
              </label>
            ))}
            {cats.length === 0 && <p className="acc-filter-note">Aucune catégorie disponible.</p>}
          </div>

          {/* Prix */}
          <div className="acc-shop-filter-block">
            <div className="acc-filter-title">Prix max</div>
            <div className="acc-price-range">
              <input
                type="range"
                min={PRICE_MAX / 10}
                max={PRICE_MAX}
                step={5}
                value={priceCursor}
                onChange={(e) => setPriceCursor(Number(e.target.value))}
                onMouseUp={(e) => commitPrice(Number(e.target.value))}
                onTouchEnd={(e) => commitPrice(Number(e.target.value))}
              />
              <span className="acc-price-label">
                {priceCursor >= PRICE_MAX ? 'Tous les prix' : `≤ ${priceCursor} €`}
              </span>
            </div>
          </div>

          {/* Couleurs */}
          {colors.length > 0 && (
            <div className="acc-shop-filter-block">
              <div className="acc-filter-title">Couleur</div>
              <div className="acc-swatches">
                {colors.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    style={{ background: c.hex_code }}
                    className={`acc-swatch${color === c.slug ? ' sel' : ''}`}
                    title={c.name}
                    onClick={() => setFilter('color', color === c.slug ? '' : c.slug)}
                  />
                ))}
              </div>
              {color && (
                <button type="button" className="acc-filter-clear" onClick={() => setFilter('color', '')}>
                  Retirer le filtre couleur
                </button>
              )}
            </div>
          )}

          {/* Réinitialiser */}
          {(category || color || maxPrice) && (
            <button
              type="button"
              className="acc-filter-reset"
              onClick={() => setParams({}, { replace: true })}
            >
              Réinitialiser tous les filtres
            </button>
          )}
        </aside>

        {/* Grille produits */}
        <div className="acc-shop-grid-area">
          {/* Filtres actifs (chips) */}
          {(category || color || maxPrice) && (
            <div className="acc-active-filters">
              {category && (
                <span className="acc-chip">
                  {cats.find((c) => c.slug === category)?.name || category}
                  <button type="button" onClick={() => setFilter('category', '')}>×</button>
                </span>
              )}
              {color && (
                <span className="acc-chip">
                  Couleur : {colors.find((c) => c.slug === color)?.name || color}
                  <button type="button" onClick={() => setFilter('color', '')}>×</button>
                </span>
              )}
              {maxPrice && (
                <span className="acc-chip">
                  Prix ≤ {maxPrice} €
                  <button type="button" onClick={() => setFilter('max_price', '')}>×</button>
                </span>
              )}
            </div>
          )}

          {/* Grille */}
          <div className="uee-product-grid acc-shop-product-grid">
            {products.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>

          {loading && products.length === 0 && (
            <div className="acc-shop-loading">
              <div className="acc-shop-spinner" />
              <p>Chargement des produits…</p>
            </div>
          )}
          {!loading && products.length === 0 && (
            <div className="acc-empty">
              <p>Aucun produit ne correspond à votre recherche.</p>
              <button
                type="button"
                className="btn-premium"
                style={{ marginTop: 16 }}
                onClick={() => setParams({}, { replace: true })}
              >
                Effacer les filtres
              </button>
            </div>
          )}
        </div>

        {/* Panneau Panier en direct */}
        <div className="acc-shop-cart-panel">
          <div className="acc-cart-header">
            <h3>Mon Panier</h3>
            <span className="count">{items.length} article(s)</span>
          </div>
          <div className="acc-cart-items">
            {items.length === 0 ? (
              <div className="acc-cart-empty">
                <IconBag />
                <p>Votre panier est vide</p>
              </div>
            ) : (
              items.map((it) => (
                <div className="acc-cart-item" key={it.slug}>
                  <div className="thumb">{figureBySlug[it.slug] || defaultFigure}</div>
                  <div className="info">
                    <div className="name">{it.name}</div>
                    <div className="price">{eur(it.unit * it.qty)}</div>
                    <div className="actions">
                      <div className="stepper">
                        <button type="button" onClick={() => setQty(it.slug, -1)}>−</button>
                        <span>{it.qty}</span>
                        <button type="button" onClick={() => setQty(it.slug, 1)}>+</button>
                      </div>
                      <button type="button" className="del" onClick={() => remove(it.slug)}>
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {items.length > 0 && (
            <div className="acc-cart-footer">
              <div className="tot">
                <span>Total</span>
                <strong>{eur(total)}</strong>
              </div>
              <Link to="/checkout" className="btn-premium" style={{ width: '100%' }}>
                Commander
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
