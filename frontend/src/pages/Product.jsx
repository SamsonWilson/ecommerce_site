import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useLocation } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import ProductGallery from '../components/ProductGallery.jsx';
import { api } from '../lib/api.js';
import { productsFromApi } from '../lib/catalog.js';
import { useCart, parseEuro } from '../store/cart.js';
import { useWishlist } from '../store/wishlist.js';
import {
  catalogProducts, bestSellers,
  figureBySlug, defaultFigure,
} from '../data/products.jsx';
import { IconHeart, IconPdf, IconShield, IconTruck, IconCheck, IconStore, Stars } from '../components/icons.jsx';

import SEOHead from '../components/SEOHead.jsx';

const tabs = ['product.tabs.description', 'product.tabs.specs', 'product.tabs.shipping', 'product.tabs.reviews'];

// Repli local (API indisponible) : reconstruit une fiche depuis le mock.
function localView(slug) {
  const p = [...catalogProducts, ...bestSellers].find((x) => x.slug === slug);
  if (!p) return null;
  return {
    slug, name: p.name, cat: p.cat,
    description: `${p.name} — pièce façonnée à la main, collection Héritage.`,
    culturalStory: 'Inspiré des symboles du mariage chinois.',
    priceCur: p.priceNew, priceOld: p.priceOld,
    ref: `ML-${slug.slice(0, 6).toUpperCase()}`, moq: 12, stock: 50,
  };
}

// Fiche issue de l'API
function apiView(d) {
  const v = d.variants?.[0] || {};
  const fmt = (x) => (x == null ? undefined : `${parseFloat(x)} €`);
  return {
    slug: d.slug, name: d.name, cat: d.category?.name,
    description: d.description, culturalStory: d.cultural_story,
    priceCur: fmt(v.price), priceOld: fmt(v.original_price),
    ref: v.sku, moq: v.moq ?? 12, stock: v.stock ?? 0,
    media: (d.media || []).map((m) => ({ src: m.file, kind: m.media_type })),
  };
}

export default function Product() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams();
  const location = useLocation();
  const add = useCart((s) => s.add);
  const toggleWish = useWishlist((s) => s.toggle);
  const wished = useWishlist((s) => s.items.some((x) => x.slug === slug));

  const isAccount = location.pathname.startsWith('/compte');
  const shopPath = isAccount ? '/compte/boutique' : '/boutique';
  const homePath = isAccount ? '/compte' : '/';

  const [view, setView] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    api.products({ page_size: 5 })
      .then((data) => setRelated(productsFromApi(data).filter((p) => p.slug !== slug).slice(0, 4)))
      .catch(() => setRelated([]));
  }, [slug, i18n.resolvedLanguage]);

  useEffect(() => {
    let alive = true;
    setNotFound(false);
    api.product(slug)
      .then((d) => {
        if (!alive) return;
        const v = apiView(d);
        if (Number(v.stock ?? 0) <= 0) {
          setNotFound(true);
        } else {
          setView(v);
        }
      })
      .catch(() => {
        if (!alive) return;
        setNotFound(true);
      });
    return () => { alive = false; };
  }, [slug, i18n.resolvedLanguage]);

  const figure = useMemo(() => figureBySlug[slug] || defaultFigure, [slug]);
  // À défaut de média téléversé, la galerie retombe sur le tracé de la maquette.
  const gallery = view?.media?.length
    ? view.media
    : [{ kind: 'IMAGE', figure }];

  const addToCart = () => {
    if (!view) return;
    add({ slug: view.slug, name: view.name, cat: view.cat, unit: parseEuro(view.priceCur), moq: t('product.moqLabel', { moq: view.moq }) }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  if (notFound) {
    return (
      <div className="empty-state" style={{ padding: '90px 20px' }}>
        <h2>{t('product.notFound')}</h2>
        <p>{t('product.notFoundText')}</p>
        <Link to={shopPath} className="btn-primary">{t('product.backToCatalog')}</Link>
      </div>
    );
  }
  if (!view) return <div style={{ padding: 60, textAlign: 'center' }}>{t('common.loading')}</div>;

  return (
    <>
      <SEOHead
        title={view.name}
        description={view.description || t('product.seoFallback', { name: view.name })}
        url={`https://maisonlian.com/produit/${view.slug}`}
        schema={{
          "@context": "https://schema.org",
          "@type": "Product",
          "name": view.name,
          "description": view.description,
          "offers": {
            "@type": "Offer",
            "price": parseEuro(view.priceCur),
            "priceCurrency": "EUR",
            "availability": view.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
          }
        }}
      />
      <div className="uee-breadcrumb">
        <div className="container">
          <Link to={homePath}>{isAccount ? t('product.clientArea') : t('common.home')}</Link><span className="sep">/</span>
          <Link to={shopPath}>{view.cat || t('common.shop')}</Link><span className="sep">/</span>
          <span>{view.name}</span>
        </div>
      </div>

      <div className="container">
        <div className="uee-pdp">
          {/* GALERIE */}
          <div>
            <ProductGallery
              items={gallery}
              title={view.name}
              badge={view.priceOld ? 'Promo' : undefined}
            >
              <button
                type="button"
                className={`uee-wish${wished ? ' on' : ''}`}
                style={{ top: 14, right: 14, zIndex: 4 }}
                aria-pressed={wished}
                aria-label={wished ? t('common.removeFromWishlist') : t('common.addToWishlist')}
                onClick={() => toggleWish({ slug: view.slug, name: view.name, cat: view.cat, priceNew: view.priceCur, priceOld: view.priceOld })}
              >
                <IconHeart />
              </button>
            </ProductGallery>
            <div className="uee-trust-mini">
              <span><IconShield />{t('product.securePayment')}</span>
              <span><IconTruck />{t('product.dispatch72')}</span>
              <span><IconCheck />{t('product.returns30')}</span>
            </div>
          </div>

          {/* INFOS */}
          <div className="uee-pdp-info">
            <span className="breadcrumb-cat">{view.cat} — {t('product.heritage')}</span>
            <h1>{view.name}</h1>
            <div className="uee-pdp-meta">
              <Stars value={4.5} />
              <span>{t('product.reviews')}</span>
              {view.ref && <span>· {t('product.ref')} {view.ref}</span>}
            </div>

            <div className="uee-pdp-price-block">
              <span className="cur">{view.priceCur}</span>
              {view.priceOld && <span className="old">{view.priceOld}</span>}
              {view.priceOld && <span className="save">{t('product.proPrice')}</span>}
            </div>

            {view.description && <p className="uee-pdp-desc">{view.description}</p>}

            <div className="uee-tabs-line">
              {tabs.map((tb, i) => (
                <button key={tb} className={i === activeTab ? 'active' : undefined} onClick={() => setActiveTab(i)}>{t(tb)}</button>
              ))}
            </div>
            {activeTab === 0 && view.culturalStory && (
              <p className="uee-pdp-desc" style={{ marginTop: 14 }}>{view.culturalStory}</p>
            )}

            <div className="uee-purchase">
              <div className="uee-qty-row">
                <div className="uee-qty-stepper">
                  <button aria-label={t('common.decrease')} onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={view.stock === 0}>−</button>
                  <input type="text" value={view.stock === 0 ? 0 : qty} aria-label={t('common.quantity')} readOnly />
                  <button aria-label={t('common.increase')} onClick={() => setQty((q) => Math.min(view.stock || 1, q + 1))} disabled={view.stock === 0 || qty >= view.stock}>+</button>
                </div>
                <span className="uee-stock" style={{ color: view.stock > 0 ? undefined : 'var(--brand-red, #d9534f)' }}>
                  <IconCheck />{view.stock > 0 ? t('product.inStock', { n: view.stock }) : t('product.outOfStock')}
                </span>
              </div>
              <div className="uee-pdp-cta">
                <button className="btn-primary" onClick={addToCart} disabled={view.stock === 0}>
                  {view.stock === 0 ? t('product.outOfStock') : added ? t('product.addedToCart') : t('product.addToCart')}
                </button>
                <span className="uee-icon-btn" aria-label={t('common.addToWishlist')}><IconHeart /></span>
                <span className="uee-icon-btn" aria-label={t('product.downloadPdf')}><IconPdf /></span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* PRODUITS ASSOCIÉS */}
      <section className="uee-section" style={{ background: '#fff' }}>
        <div className="container">
          <div className="uee-section-head">
            <h2>{t('product.related')}</h2>
            <Link className="see-all" to={shopPath}>{t('product.seeAll')}</Link>
          </div>
          <div className="uee-product-grid">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} showWish={false} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
