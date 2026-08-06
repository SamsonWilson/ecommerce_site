import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import ProductGallery from '../components/ProductGallery.jsx';
import { api } from '../lib/api.js';
import { useCart, parseEuro } from '../store/cart.js';
import { useWishlist } from '../store/wishlist.js';
import {
  catalogProducts, bestSellers, relatedProducts,
  figureBySlug, defaultFigure,
} from '../data/products.jsx';
import { IconHeart, IconPdf, IconShield, IconTruck, IconCheck, IconStore, Stars } from '../components/icons.jsx';

import SEOHead from '../components/SEOHead.jsx';

const tabs = ['Description', 'Caractéristiques', 'Livraison', 'Avis'];

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
  const { slug } = useParams();
  const add = useCart((s) => s.add);
  const toggleWish = useWishlist((s) => s.toggle);
  const wished = useWishlist((s) => s.items.some((x) => x.slug === slug));

  const [view, setView] = useState(() => localView(slug));
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let alive = true;
    setView(localView(slug));
    setNotFound(false);
    api.product(slug)
      .then((d) => { if (alive) setView(apiView(d)); })
      .catch((e) => { if (alive && e.status === 404 && !localView(slug)) setNotFound(true); });
    return () => { alive = false; };
  }, [slug]);

  const figure = useMemo(() => figureBySlug[slug] || defaultFigure, [slug]);
  // À défaut de média téléversé, la galerie retombe sur le tracé de la maquette.
  const gallery = view?.media?.length
    ? view.media
    : [{ kind: 'IMAGE', figure }];

  const addToCart = () => {
    if (!view) return;
    add({ slug: view.slug, name: view.name, cat: view.cat, unit: parseEuro(view.priceCur), moq: `MOQ grossiste : ${view.moq} pièces` }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  if (notFound) {
    return (
      <div className="empty-state" style={{ padding: '90px 20px' }}>
        <h2>Produit introuvable</h2>
        <p>Cette référence n'existe pas ou n'est plus disponible.</p>
        <Link to="/boutique" className="btn-primary">Retour au catalogue</Link>
      </div>
    );
  }
  if (!view) return <div style={{ padding: 60, textAlign: 'center' }}>Chargement…</div>;

  return (
    <>
      <SEOHead
        title={view.name}
        description={view.description || `Achetez ${view.name} chez Maison Lian. Accessoires de mariage d'exception.`}
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
          <Link to="/">Accueil</Link><span className="sep">/</span>
          <Link to="/boutique">{view.cat || 'Boutique'}</Link><span className="sep">/</span>
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
                aria-label={wished ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                onClick={() => toggleWish({ slug: view.slug, name: view.name, cat: view.cat, priceNew: view.priceCur, priceOld: view.priceOld })}
              >
                <IconHeart />
              </button>
            </ProductGallery>
            <div className="uee-trust-mini">
              <span><IconShield />Paiement sécurisé</span>
              <span><IconTruck />Expédition sous 72h</span>
              <span><IconCheck />Retours 30 jours</span>
            </div>
          </div>

          {/* INFOS */}
          <div className="uee-pdp-info">
            <span className="breadcrumb-cat">{view.cat} — Collection Héritage</span>
            <h1>{view.name}</h1>
            <div className="uee-pdp-meta">
              <Stars value={4.5} />
              <span>4.5 (86 avis)</span>
              {view.ref && <span>· Réf. {view.ref}</span>}
            </div>

            <div className="uee-pdp-price-block">
              <span className="cur">{view.priceCur}</span>
              {view.priceOld && <span className="old">{view.priceOld}</span>}
              {view.priceOld && <span className="save">Tarif pro</span>}
            </div>

            {view.description && <p className="uee-pdp-desc">{view.description}</p>}

            <div className="uee-tabs-line">
              {tabs.map((tb, i) => (
                <button key={tb} className={i === activeTab ? 'active' : undefined} onClick={() => setActiveTab(i)}>{tb}</button>
              ))}
            </div>
            {activeTab === 0 && view.culturalStory && (
              <p className="uee-pdp-desc" style={{ marginTop: 14 }}>{view.culturalStory}</p>
            )}

            <div className="uee-purchase">
              <div className="uee-qty-row">
                <div className="uee-qty-stepper">
                  <button aria-label="Diminuer" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={view.stock === 0}>−</button>
                  <input type="text" value={view.stock === 0 ? 0 : qty} aria-label="Quantité" readOnly />
                  <button aria-label="Augmenter" onClick={() => setQty((q) => Math.min(view.stock || 1, q + 1))} disabled={view.stock === 0 || qty >= view.stock}>+</button>
                </div>
                <span className="uee-stock" style={{ color: view.stock > 0 ? undefined : 'var(--brand-red, #d9534f)' }}>
                  <IconCheck />{view.stock > 0 ? `En stock (${view.stock} disponible${view.stock > 1 ? 's' : ''})` : 'Rupture de stock'}
                </span>
              </div>
              <div className="uee-pdp-cta">
                <button className="btn-primary" onClick={addToCart} disabled={view.stock === 0}>
                  {view.stock === 0 ? 'Rupture de stock' : added ? 'Ajouté au panier ✓' : 'Ajouter au panier'}
                </button>
                <span className="uee-icon-btn" aria-label="Ajouter aux favoris"><IconHeart /></span>
                <span className="uee-icon-btn" aria-label="Télécharger la fiche PDF"><IconPdf /></span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* PRODUITS ASSOCIÉS */}
      <section className="uee-section" style={{ background: '#fff' }}>
        <div className="container">
          <div className="uee-section-head">
            <h2>Assortis à cette pièce</h2>
            <Link className="see-all" to="/boutique">Voir tout →</Link>
          </div>
          <div className="uee-product-grid">
            {relatedProducts.filter((p) => p.slug !== slug).slice(0, 4).map((p) => (
              <ProductCard key={p.slug} product={p} showWish={false} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
