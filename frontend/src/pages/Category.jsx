import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import ProductCard from '../components/ProductCard.jsx';
import { catalogProducts } from '../data/products.jsx';
import { api } from '../lib/api.js';
import { productsFromApi } from '../lib/catalog.js';

const PRICE_MIN = 0;
const PRICE_MAX = 300;

export default function Category({ title, titleKey }) {
  const { t } = useTranslation();
  const defaultTitle = t('category.title', 'Shop');
  const pageTitle = titleKey ? t(titleKey) : (title || defaultTitle);

  const SORTS = [
    { value: '-created_at', label: t('category.sortNewest', 'Sort by: Newest') },
    { value: 'name', label: t('category.sortNameAsc', 'Name (A → Z)') },
    { value: 'min_price', label: t('category.sortPriceAsc', 'Price (Low to High)') },
    { value: '-min_price', label: t('category.sortPriceDesc', 'Price (High to Low)') },
  ];

  const [params, setParams] = useSearchParams();
  const search = params.get('q') || params.get('search') || '';
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
  const [priceCursor, setPriceCursor] = useState(Number(maxPrice) || PRICE_MAX);

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
      search: search || undefined,
      category: category || undefined,
      color: color || undefined,
      max_price: maxPrice || undefined,
      max_moq: maxMoq || undefined,
      ordering,
    })
      .then((data) => {
        if (!alive) return;
        let items = productsFromApi(data);
        if (search) {
          const q = search.toLowerCase();
          items = items.filter((p) => (p.name && p.name.toLowerCase().includes(q)) || (p.cat && p.cat.toLowerCase().includes(q)));
        }
        setProducts(items);
        setCount(data.count ?? items.length);
      })
      .catch(() => {
        if (!alive) return;
        let items = catalogProducts;
        if (search) {
          const q = search.toLowerCase();
          items = items.filter((p) => (p.name && p.name.toLowerCase().includes(q)) || (p.cat && p.cat.toLowerCase().includes(q)));
        }
        setProducts(items);
        setCount(items.length);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [category, search, color, maxPrice, maxMoq, ordering]);

  const heading = search
    ? t('category.resultsFor', { search, defaultValue: `Results for "${search}"` })
    : (cats.find((c) => c.slug === category)?.name || pageTitle);

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  return (
    <>
      <div className="uee-breadcrumb">
        <div className="container">
          <Link to="/">{t('nav.home', 'Home')}</Link><span className="sep">/</span>
          {category ? (
            <>
              <Link to="/boutique">{pageTitle}</Link><span className="sep">/</span>
              <span>{heading}</span>
            </>
          ) : <span>{pageTitle}</span>}
        </div>
      </div>

      <div className="container">
        <div className="uee-shop-layout">
          {/* SIDEBAR */}
          <aside className={`uee-sidebar ${showMobileFilters ? 'mobile-open' : ''}`}>
            <div className="uee-filter-block">
              <h4>{t('category.categories', 'Categories')}</h4>
              <label className="uee-checkline">
                <span>
                  <input type="radio" name="cat" checked={category === ''}
                    onChange={() => setFilter('category', '')} /> {t('category.allCategories', 'All')}
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
              {cats.length === 0 && <p className="filter-note">{t('category.noCategories', 'No categories found.')}</p>}
            </div>

            <div className="uee-filter-block">
              <h4>{t('category.color', 'Color')}</h4>
              <div className="uee-swatches">
                {colors.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    style={{ background: c.hex_code }}
                    className={color === c.slug ? 'sel' : undefined}
                    aria-pressed={color === c.slug}
                    title={c.name}
                    onClick={() => setFilter('color', color === c.slug ? '' : c.slug)}
                  />
                ))}
              </div>
              {colors.length === 0 && <p className="filter-note">{t('category.noColors', 'No colors found.')}</p>}
              {color && (
                <button type="button" className="filter-clear" onClick={() => setFilter('color', '')}>
                  {t('category.clearColor', 'Remove color filter')}
                </button>
              )}
            </div>
          </aside>

          {/* GRILLE */}
          <div>
            {search && (
              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, background: '#F0ECE4', border: '1px solid #DFD8CB', color: '#111', padding: '6px 14px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  🔍 {t('category.searchLabel', 'Search:')} <strong>"{search}"</strong>
                  <button type="button" onClick={() => setFilter('q', '')} style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 14, color: '#C0392B', marginLeft: 4 }}>✕</button>
                </span>
              </div>
            )}

            <div className="uee-shop-toolbar">
              <button
                type="button"
                className="mobile-filter-toggle-btn"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
              >
                ⚙️ {showMobileFilters ? t('category.hideFilters', 'Hide filters') : t('category.filterAndSort', 'Filter & Sort')}
              </button>

              <span className="count-label">
                {count ?? products.length} {t('category.productsCount', { count: count ?? products.length, defaultValue: 'product(s)' })} — <strong>{heading}</strong>
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

            {loading && products.length === 0 && <p className="uee-grid-note">{t('category.loading', 'Loading…')}</p>}
            {!loading && products.length === 0 && (
              <p className="uee-grid-note">{t('category.noProductsMatch', 'No products match these filters.')}</p>
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
