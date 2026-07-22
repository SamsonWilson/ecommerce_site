import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard.jsx';
import { api } from '../lib/api.js';
import { useCart, parseEuro } from '../store/cart.js';
import {
  catalogProducts, bestSellers, relatedProducts,
  figureBySlug, defaultFigure,
} from '../data/products.jsx';
import { IconHeart, IconPdf, IconShield, IconTruck, IconCheck, IconStore, Stars } from '../components/icons.jsx';

const thumbs = [
  <svg viewBox="0 0 60 60" fill="none" stroke="#7C1F2C" strokeWidth="1" key="1"><path d="M30 10 C 20 25, 20 40, 30 50 C 40 40, 40 25, 30 10Z"/></svg>,
  <svg viewBox="0 0 60 60" fill="none" stroke="#7C1F2C" strokeWidth="1" key="2"><circle cx="30" cy="24" r="7"/><path d="M30 31 v 20"/></svg>,
  <svg viewBox="0 0 60 60" fill="none" stroke="#B08A34" strokeWidth="1" key="3"><path d="M15 30 q 15 -20 30 0 q -15 20 -30 0Z"/></svg>,
  <svg viewBox="0 0 60 60" fill="none" stroke="#A5293B" strokeWidth="1" key="4"><rect x="18" y="18" width="24" height="24"/></svg>,
  <svg viewBox="0 0 60 60" fill="none" stroke="#435C4E" strokeWidth="1" key="5"><circle cx="30" cy="30" r="12"/></svg>,
];
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
  };
}

export default function Product() {
  const { slug } = useParams();
  const add = useCart((s) => s.add);

  const [view, setView] = useState(() => localView(slug));
  const [notFound, setNotFound] = useState(false);
  const [activeThumb, setActiveThumb] = useState(0);
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
            <div className="uee-gallery-main">
              {view.priceOld && <span className="uee-badge">Promo</span>}
              <span className="uee-wish" style={{ top: 14, right: 14 }}><IconHeart /></span>
              {figure}
            </div>
            <div className="uee-gallery-thumbs">
              {thumbs.map((tb, i) => (
                <div key={i} className={i === activeThumb ? 'active' : undefined} onClick={() => setActiveThumb(i)}>{tb}</div>
              ))}
            </div>
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
                  <button aria-label="Diminuer" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                  <input type="text" value={qty} aria-label="Quantité" readOnly />
                  <button aria-label="Augmenter" onClick={() => setQty((q) => q + 1)}>+</button>
                </div>
                <span className="uee-stock">
                  <IconCheck />{view.stock > 0 ? 'En stock — expédition sous 3 jours' : 'Sur commande'}
                </span>
              </div>
              <div className="uee-pdp-cta">
                <button className="btn-primary" onClick={addToCart}>
                  {added ? 'Ajouté au panier ✓' : 'Ajouter au panier'}
                </button>
                <span className="uee-icon-btn" aria-label="Ajouter aux favoris"><IconHeart /></span>
                <span className="uee-icon-btn" aria-label="Télécharger la fiche PDF"><IconPdf /></span>
              </div>
            </div>

            <div className="uee-pro-box">
              <div className="pb-head">
                <IconStore />
                <h4>Vous êtes professionnel ? Débloquez le tarif grossiste</h4>
              </div>
              <p className="moq-note" style={{ marginTop: 0 }}>
                MOQ : {view.moq} pièces — au-delà, le tarif grossiste s'applique automatiquement à votre compte pro.
              </p>
              <div className="form-row">
                <input type="number" min={view.moq} defaultValue={view.moq * 2} placeholder="Quantité" style={{ width: 110 }} />
                <input type="text" placeholder="Votre e-mail professionnel" style={{ flex: 1, minWidth: 180 }} />
                <Link to="/pro" className="btn-outline">Demander un devis</Link>
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
