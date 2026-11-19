import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  { value: '-created_at', label: 'shop.titleNew' },
  { value: 'name', label: 'shop.sort.name' },
  { value: 'min_price', label: 'shop.sort.priceAsc' },
  { value: '-min_price', label: 'shop.sort.priceDesc' },
];

export default function Shop() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const color = params.get('color') || '';
  const ordering = params.get('sort') || '-created_at';
  const maxPrice = params.get('max_price') || '';

  const [products, setProducts] = useState([]);
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
  const { subtotal } = cartTotals(items);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  useEffect(() => { setPriceCursor(Number(maxPrice) || PRICE_MAX); }, [maxPrice]);

  useEffect(() => {
    api.categories().then((d) => setCats(d.results || d)).catch(() => {});
    api.colors().then((d) => setColors(d.results || d)).catch(() => {});
  }, [i18n.resolvedLanguage]);

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
        const items = productsFromApi(data).filter((p) => Number(p.stock) > 0);
        setProducts(items);
        setCount(data.count ?? items.length);
      })
      .catch(() => {
        if (!alive) return;
        setProducts([]);
        setCount(0);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [category, color, maxPrice, ordering, search, i18n.resolvedLanguage]);

  const heading = cats.find((c) => c.slug === category)?.name || t('common.shop');

  return (
    <div className="acc-shop">
      {/* Header de la boutique intégrée */}
      <div className="acc-shop-header">
        <div className="acc-shop-title">
          <h2>{t('common.shop')}</h2>
          <span className="acc-shop-count">{t('shop.productCount', { n: count ?? products.length })}</span>
        </div>
        <div className="acc-shop-controls">
          <div className="acc-shop-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              placeholder={t('shop.searchHint')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="acc-shop-sort"
            value={ordering}
            onChange={(e) => setFilter('sort', e.target.value)}
          >
            {SORTS.map((o) => <option key={o.value} value={o.value}>{t(o.label)}</option>)}
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
            {t('shop.filters')}
          </button>
        </div>
      </div>

      <div className="acc-shop-layout">
        {/* Panneau filtres latéral / drawer */}
        <aside className={`acc-shop-aside${filtersOpen ? ' open' : ''}`}>
          {/* Catégories */}
          <div className="acc-shop-filter-block">
            <div className="acc-filter-title">{t('shop.categories')}</div>
            <label className="acc-radio-line">
              <input type="radio" name="cat" checked={category === ''} onChange={() => setFilter('category', '')} />
              <span>{t('shop.all')}</span>
            </label>
            {cats.map((c) => (
              <label key={c.slug} className="acc-radio-line">
                <input type="radio" name="cat" checked={category === c.slug} onChange={() => setFilter('category', c.slug)} />
                <span>{c.name}</span>
              </label>
            ))}
            {cats.length === 0 && <p className="acc-filter-note">{t('shop.noCategoryAvailable')}</p>}
          </div>

          {/* Prix */}
          <div className="acc-shop-filter-block">
            <div className="acc-filter-title">{t('shop.maxPrice')}</div>
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
                {priceCursor >= PRICE_MAX ? t('shop.allPrices') : `≤ ${priceCursor} €`}
              </span>
            </div>
          </div>

          {/* Couleurs */}
          {colors.length > 0 && (
            <div className="acc-shop-filter-block">
              <div className="acc-filter-title">{t('shop.color')}</div>
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
                  {t('shop.clearColor')}
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
              {t('shop.resetFilters')}
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
              <p>{t('shop.loadingProducts')}</p>
            </div>
          )}
          {!loading && products.length === 0 && (
            <div className="acc-empty">
              <p>{t('shop.noSearchMatch')}</p>
              <button
                type="button"
                className="btn-premium"
                style={{ marginTop: 16 }}
                onClick={() => setParams({}, { replace: true })}
              >
                {t('shop.clearFilters')}
              </button>
            </div>
          )}
        </div>

        {/* Panneau Panier en direct */}
        <div className="acc-shop-cart-panel">
          <div className="acc-cart-header">
            <h3>{t('shop.myCart')}</h3>
            <span className="count">{t('shop.itemCount', { n: items.length })}</span>
          </div>
          <div className="acc-cart-items">
            {items.length === 0 ? (
              <div className="acc-cart-empty">
                <IconBag />
                <p>{t('common.emptyCart')}</p>
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
                <span>{t('common.totalExclShipping')}</span>
                <strong>{eur(subtotal)}</strong>
              </div>
              <Link to="/compte/checkout" className="btn-premium" style={{ width: '100%' }}>
                {t('shop.order')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
