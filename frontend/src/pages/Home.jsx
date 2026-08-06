import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEOHead from '../components/SEOHead.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { bestSellers, catalogProducts } from '../data/products.jsx';
import { api } from '../lib/api.js';
import { productsFromApi } from '../lib/catalog.js';
import { useReveal, useRevealChildren } from '../hooks/useReveal.js';
import {
  IconChevronLeft, IconChevronRight, IconTruck, IconCard, IconStore, IconChat,
  IconCeremony, IconGuests, IconBell, IconCamera, IconLayers, IconTag,
  IconShield, IconCheck, Stars,
} from '../components/icons.jsx';

const HERO_SLIDES = 3;

const SHELF_ICONS = [
  <IconCeremony key="a" />, <IconGuests key="b" />, <IconBell key="c" />,
  <IconCamera key="d" />, <IconLayers key="e" />, <IconTag key="f" />,
];

export default function Home() {
  const { t } = useTranslation();

  const [products, setProducts] = useState(bestSellers);
  const [heroProducts, setHeroProducts] = useState(bestSellers.slice(0, HERO_SLIDES));
  const [cats, setCats] = useState([]);
  const [tab, setTab] = useState('');
  const [loading, setLoading] = useState(true);

  const [slide, setSlide] = useState(0);
  const [subscribed, setSubscribed] = useState(false);

  // Compte à rebours promotionnel réactif
  const [timeLeft, setTimeLeft] = useState({ days: 3, hours: 14, min: 52, sec: 0 });

  const timerRef = useRef(null);
  const railRef1 = useRef(null);
  const railRef2 = useRef(null);

  // Toast d'activité en direct réactif
  const [activeToast, setActiveToast] = useState(0);
  const liveToasts = [
    { name: 'Épingle Chinoise Dorée & Perles', loc: 'Paris, France', time: 'Il y a 2 min' },
    { name: 'Peigne de Mariée Fleur de Lys', loc: 'Lyon, France', time: 'Il y a 5 min' },
    { name: 'Diadème Princesse Cristal', loc: 'Bruxelles, Belgique', time: 'Il y a 12 min' },
  ];

  useEffect(() => {
    const toastInterval = setInterval(() => {
      setActiveToast((prev) => (prev + 1) % liveToasts.length);
    }, 7000);
    return () => clearInterval(toastInterval);
  }, []);

  // ── Scroll-reveal refs ──────────────────────────────────────────────────
  const revealHero        = useReveal({ threshold: 0.05 });
  const revealUsp         = useRevealChildren({ stagger: 100 });
  const revealAmzGrid1    = useRevealChildren({ stagger: 80 });
  const revealAmzGrid2    = useRevealChildren({ stagger: 80 });
  const revealCats        = useRevealChildren({ stagger: 60 });
  const revealGrid        = useRevealChildren({ stagger: 70 });
  const revealShelf1      = useReveal();
  const revealShelf2      = useReveal();
  const revealPromo       = useReveal();
  const revealTestis      = useRevealChildren({ stagger: 120 });
  const revealNewsletter  = useReveal();

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.sec > 0) return { ...prev, sec: prev.sec - 1 };
        if (prev.min > 0) return { ...prev, min: 59, sec: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, min: 59, sec: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, min: 59, sec: 59 };
        return prev;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  // Défilement automatique du carrousel Hero toutes les 6 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      setSlide((s) => (s + 1) % HERO_SLIDES);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    api.categories()
      .then((d) => setCats(d.results || d))
      .catch(() => setCats([]));

    api.products({ page_size: HERO_SLIDES })
      .then((d) => {
        const items = productsFromApi(d);
        if (items.length) { setHeroProducts(items); setSlide(0); }
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.products({ page_size: 12, category: tab || undefined })
      .then((d) => {
        if (!alive) return;
        setProducts(productsFromApi(d));
      })
      .catch(() => { })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tab]);

  const slides = heroProducts.slice(0, HERO_SLIDES);
  const featured = slides[slide] || slides[0];
  const step = (d) => setSlide((s) => (s + d + slides.length) % (slides.length || 1));

  const scrollRail = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fallbackMoments = [
    { slug: '', name: t('home.moments.ceremony') },
    { slug: '', name: t('home.moments.reception') },
    { slug: '', name: t('home.moments.dinner') },
    { slug: '', name: t('home.moments.photoshoot') },
    { slug: '', name: t('home.moments.chinese') },
    { slug: '', name: t('home.moments.promotions') },
  ];
  const shelves = (cats.length ? cats.slice(0, 6) : fallbackMoments).map((c, i) => ({
    ...c, icon: SHELF_ICONS[i % SHELF_ICONS.length],
  }));

  const usps = [
    { icon: <IconTruck />, title: t('home.usp.worldwide'), sub: t('home.usp.worldwideSub') },
    { icon: <IconCard />, title: t('home.usp.secure'), sub: t('home.usp.secureSub') },
    { icon: <IconStore />, title: t('home.usp.wholesale'), sub: t('home.usp.wholesaleSub') },
    { icon: <IconChat />, title: t('home.usp.support'), sub: t('home.usp.supportSub') },
  ];

  const testimonials = [
    { av: 'C', text: t('home.testimonials.t1'), name: 'Camille R.', loc: 'Lyon, France', rating: 5 },
    { av: 'S', text: t('home.testimonials.t2'), name: 'Sophie M. — Boutique Ivoire', loc: 'Bruxelles, Belgique', rating: 5 },
    { av: 'M', text: t('home.testimonials.t3'), name: 'Mei L.', loc: 'Vancouver, Canada', rating: 5 },
  ];

  // Quad items pour les cartes style Amazon avec fallbacks garantis
  const quadNouveautes = catalogProducts.slice(0, 4);
  const quadMoments = [
    { name: 'Cérémonie', link: '/boutique?category=ceremonie', icon: <IconCeremony /> },
    { name: 'Réception', link: '/boutique?category=reception', icon: <IconGuests /> },
    { name: 'Style Chinois', link: '/boutique?category=chinois', icon: <IconLayers /> },
    { name: 'Photoshoot', link: '/boutique?category=photos', icon: <IconCamera /> },
  ];

  const quadCoiffure = catalogProducts.slice(4, 8);
  const flashProduct = catalogProducts.find((p) => p.badge) || catalogProducts[0];
  const featuredSingleProduct = catalogProducts[0];

  return (
    <main className="amz-home-body">
      <SEOHead
        title="Accessoires de Mariage & Haute Coiffure Chinoise | Maison Lián"
        description="Collection exclusive d'accessoires de mariage d'inspiration traditionnelle chinoise et occidentale. Vente au détail et tarifs professionnels B2B."
        schema={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Maison Lián",
          "url": "https://maisonlian.com",
          "logo": "https://maisonlian.com/assets/hero.png"
        }}
      />

      {/* SECTION 1 : BANNIÈRE HERO CARROUSEL AVEC FADED GRADIENT AMAZON */}
      <section className="uee-hero">
        <button type="button" className="slider-arrow left" aria-label={t('home.hero.previous')} onClick={() => step(-1)}>
          <IconChevronLeft />
        </button>
        <button type="button" className="slider-arrow right" aria-label={t('home.hero.next')} onClick={() => step(1)}>
          <IconChevronRight />
        </button>

        <div className="container" ref={revealHero}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
              <Link to="/boutique" className="animated-pill-btn">
                <span>{t('nav.allCategories')}</span>
                <span className="btn-arrow">›</span>
              </Link>
              <span className="sale-tag" style={{ margin: 0 }}>
                <span style={{ color: '#FFD700' }}>✦</span> {t('home.hero.badge')}
              </span>
            </div>
            <h1>{t('home.hero.title1')} <em>&amp;</em> {t('home.hero.title2')}</h1>
            <p>
              {featured?.name && featured.name.length > 8 && !/^[a-z0-9_-]+$/i.test(featured.name)
                ? featured.name
                : "Collection d'exception de bijoux nuptiaux et coiffures traditionnelles impériales pour une célébration d'une élégance inoubliable."}
            </p>
            <div className="uee-hero-cta">
              <Link to={featured ? `/produit/${featured.slug}` : '/boutique'} className="btn-primary">
                {t('home.hero.buyNow')} ➔
              </Link>
              <Link to="/compte/inscription?type=pro" className="btn-outline">
                {t('home.hero.wholesalePrices')}
              </Link>
            </div>
          </div>

          <div className="uee-hero-art">
            <div className="hero-pill p1">💎 Fait Main &amp; Finitions Dorées</div>
            <div className="hero-pill p2">✨ Tarifs Pro Grossiste -30%</div>
            <div className="disc pg-fade" key={featured?.slug || slide}>
              {featured?.image ? (
                <img className="hero-photo" src={featured.image} alt={featured.name} />
              ) : (
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                  {featured?.figure || (
                    <svg viewBox="0 0 200 220" fill="none" style={{ width: '100%', height: '100%' }}>
                      <rect width="200" height="220" fill="#FAF5EE" />
                      <circle cx="100" cy="90" r="48" fill="#C0392B" opacity="0.1" />
                      <path d="M100 25 C 75 60, 65 110, 100 165 C 135 110, 125 60, 100 25 Z" stroke="#C9A227" strokeWidth="2.5" />
                      <path d="M100 165 L 100 205" stroke="#C9A227" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="100" cy="85" r="14" fill="#C0392B" />
                      <circle cx="100" cy="85" r="5" fill="#FFF" opacity="0.8" />
                    </svg>
                  )}
                </div>
              )}
              {featured?.priceNew && (
                <div className="price-float">
                  {featured.priceOld && <div className="pf-old">{featured.priceOld}</div>}
                  <div className="pf-new">{featured.priceNew}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="slider-dots">
          {slides.map((s, i) => (
            <button key={s?.slug || i} type="button" className={i === slide ? 'active' : undefined}
              aria-label={`Slide ${i + 1}`} onClick={() => setSlide(i)} />
          ))}
        </div>

        {/* Gradient bas de hero se fondant dans le fond #EAEDED */}
        <div className="uee-hero-fade"></div>
      </section>

      {/* SECTION 2 : PREMIER SUPER-GRID OVERLAY AMAZON (4 CARTES FLOATING) */}
      <section className="amz-overlay-section">
        <div className="container">
          <div className="amz-grid-4" ref={revealAmzGrid1}>

            {/* CARTE 1: NOUVEAUTÉS DU CATALOGUE (QUAD 2x2) */}
            <div className="amz-card">
              <div>
                <h3>Dernières Nouveautés</h3>
                <div className="amz-card-quad">
                  {quadNouveautes.map((p, idx) => (
                    <Link to={`/produit/${p.slug}`} key={p.slug || idx} className="amz-quad-item">
                      <div className="amz-quad-img">
                        {p.image ? (
                          <img src={p.image} alt={p.name} />
                        ) : p.figure ? (
                          <div style={{ width: '65%', height: '65%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.figure}</div>
                        ) : (
                          <IconTag />
                        )}
                      </div>
                      <span className="amz-quad-label">{p.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <Link to="/boutique" className="amz-card-link">Découvrir les nouveautés →</Link>
            </div>

            {/* CARTE 2: MOMENTS DE MARIAGE (QUAD 2x2) */}
            <div className="amz-card">
              <div>
                <h3>Acheter par Événement</h3>
                <div className="amz-card-quad">
                  {quadMoments.map((m) => (
                    <Link to={m.link} key={m.name} className="amz-quad-item">
                      <div className="amz-quad-img" style={{ background: 'linear-gradient(135deg, #FFFDF8 0%, #FAF4E8 100%)', border: '1px solid #EFE6D8' }}>
                        {m.icon}
                      </div>
                      <span className="amz-quad-label">{m.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <Link to="/boutique" className="amz-card-link">Voir toutes les collections →</Link>
            </div>

            {/* CARTE 3: VENTE FLASH DU JOUR */}
            <div className="amz-card">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ margin: 0 }}>Vente Flash du Jour</h3>
                  <span className="amz-deal-tag">-20%</span>
                </div>
                <div className="amz-flash-img">
                  {flashProduct?.image ? (
                    <img src={flashProduct.image} alt={flashProduct.name} />
                  ) : flashProduct?.figure ? (
                    <div style={{ width: '60%', height: '60%', margin: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {flashProduct.figure}
                    </div>
                  ) : (
                    <IconCeremony />
                  )}
                  <span className="amz-flash-badge">✦ Offre Limitée</span>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0F1111' }}>
                  {flashProduct?.name || 'Épingle Chinoise Dorée & Perles'}
                </div>
                <div className="amz-progress-bg">
                  <div className="amz-progress-fill" style={{ width: '75%' }}></div>
                </div>
                <div style={{ fontSize: 11.5, color: '#565959', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span>Déjà réservé à 75%</span>
                  <span style={{ color: '#CC0C39', fontWeight: 700 }}>Stock limité</span>
                </div>
              </div>
              <Link to={flashProduct ? `/produit/${flashProduct.slug}` : '/boutique'} className="amz-card-link" style={{ marginTop: 10 }}>
                Profiter de la vente flash →
              </Link>
            </div>

            {/* CARTE 4: ESPACE GROSSISTE B2B */}
            <div className="amz-card amz-card-dark">
              <div>
                <span className="amz-b2b-badge">✦ ESPACE PROFESSIONNEL</span>
                <h3 style={{ color: '#fff', marginTop: 6, fontFamily: 'var(--serif)', fontSize: 19 }}>Compte Grossiste &amp; Devis Sur-Mesure</h3>
                <p style={{ fontSize: 12.5, color: '#c3cbdc', lineHeight: 1.55, marginBottom: 14 }}>
                  Accédez aux tarifs professionnels préférentiels, MOQ réduit dès 12 pièces et création personnalisée.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12, color: '#e2e8f0', marginBottom: 16 }}>
                  <div>✓ Jusqu'à -30% sur l'ensemble du catalogue</div>
                  <div>✓ Expédition prioritaire sous 48h</div>
                  <div>✓ Facturation H.T. &amp; devis immédiat</div>
                </div>
              </div>
              <Link to="/compte/inscription?type=pro" className="btn-primary" style={{ textAlign: 'center', width: '100%', fontSize: 13, padding: '12px 18px' }}>
                Créer mon compte pro ➔
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 3 : CARROUSEL HORIZONTAL 1 - VENTES FLASH & TENDANCE */}
      <section className="amz-shelf-section" ref={revealShelf1}>
        <div className="container">
          <div className="amz-shelf">
            <div className="amz-shelf-head">
              <div>
                <h2>Ventes Flash &amp; Sélection Tendance</h2>
                <p className="amz-shelf-sub">Les articles les plus demandés et plébiscités de la saison</p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button type="button" className="amz-arrow-btn" aria-label="Précédent" onClick={() => scrollRail(railRef1, 'left')}>
                  <IconChevronLeft />
                </button>
                <button type="button" className="amz-arrow-btn" aria-label="Suivant" onClick={() => scrollRail(railRef1, 'right')}>
                  <IconChevronRight />
                </button>
              </div>
            </div>

            <div className="amz-rail-wrapper">
              <div className="amz-rail" ref={railRef1}>
                {products.map((p) => (
                  <ProductCard key={p.slug} product={p} showStars={true} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 : SECOND SUPER-GRID MULTI-CARTES (COIFFURE, COUP DE COEUR, SERVICES, DEVIS) */}
      <section className="amz-grid-section">
        <div className="container">
          <div className="amz-grid-4" ref={revealAmzGrid2}>

            {/* CARTE 5: HAUTE COIFFURE NUPTIALE (QUAD 2x2) */}
            <div className="amz-card">
              <div>
                <h3>Haute Coiffure Nuptiale</h3>
                <div className="amz-card-quad">
                  {quadCoiffure.map((p) => (
                    <Link to={`/produit/${p.slug}`} key={p.slug} className="amz-quad-item">
                      <div className="amz-quad-img">
                        {p.figure ? (
                          <div style={{ width: '65%', height: '65%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.figure}</div>
                        ) : (
                          <IconTag />
                        )}
                      </div>
                      <span className="amz-quad-label">{p.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <Link to="/boutique" className="amz-card-link">Explorer la collection coiffure →</Link>
            </div>

            {/* CARTE 6: COUP DE CŒUR DE LA MARIÉE (SINGLE FEATURED CARD) */}
            <div className="amz-card">
              <div>
                <span className="amz-card-kicker">✦ RECOMMANDATION MAISON LIÁN</span>
                <h3 style={{ marginTop: 4 }}>{featuredSingleProduct.name}</h3>
                <div className="amz-single-feat-img">
                  {featuredSingleProduct.image ? (
                    <img src={featuredSingleProduct.image} alt={featuredSingleProduct.name} />
                  ) : featuredSingleProduct.figure ? (
                    <div style={{ width: '55%', height: '55%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {featuredSingleProduct.figure}
                    </div>
                  ) : (
                    <IconCeremony />
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Stars value={5} />
                  <span style={{ fontSize: 12, color: '#007185', fontWeight: 600 }}>(98 avis)</span>
                </div>
                <div className="amz-price-box">
                  <span className="amz-price-new">{featuredSingleProduct.priceNew}</span>
                  {featuredSingleProduct.priceOld && <span className="amz-price-old">{featuredSingleProduct.priceOld}</span>}
                  <span className="amz-prime-badge">✓ Livraison Gratuite dès 150€</span>
                </div>
              </div>
              <Link to={`/produit/${featuredSingleProduct.slug}`} className="amz-card-link">Voir la fiche produit →</Link>
            </div>

            {/* CARTE 7: GARANTIES & SERVICES MAISON LIÁN */}
            <div className="amz-card">
              <div>
                <h3>Engagements &amp; Services</h3>
                <div className="amz-services-list">
                  <div className="amz-service-item">
                    <span className="amz-service-icon"><IconTruck /></span>
                    <div>
                      <div className="amz-s-title">Expédition Express 48h</div>
                      <div className="amz-s-sub">Emballage sécurisé &amp; suivi</div>
                    </div>
                  </div>
                  <div className="amz-service-item">
                    <span className="amz-service-icon"><IconShield /></span>
                    <div>
                      <div className="amz-s-title">Qualité Garantie</div>
                      <div className="amz-s-sub">Finition dorée à la main</div>
                    </div>
                  </div>
                  <div className="amz-service-item">
                    <span className="amz-service-icon"><IconStore /></span>
                    <div>
                      <div className="amz-s-title">Tarifs Direct Fabrique</div>
                      <div className="amz-s-sub">Paiement sur facture pro</div>
                    </div>
                  </div>
                  <div className="amz-service-item">
                    <span className="amz-service-icon"><IconChat /></span>
                    <div>
                      <div className="amz-s-title">Conseils &amp; Support 7j/7</div>
                      <div className="amz-s-sub">Conseiller dédié en direct</div>
                    </div>
                  </div>
                </div>
              </div>
              <Link to="/contact" className="amz-card-link">Découvrir nos garanties →</Link>
            </div>

            {/* CARTE 8: DEMANDE DE DEVIS SUR-MESURE */}
            <div className="amz-card amz-quote-card">
              <div>
                <span className="amz-quote-kicker">✦ DEVIS ESPACE BOUTIQUE</span>
                <h3>Commandes Sur-Mesure &amp; Mariages</h3>
                <p className="amz-quote-desc">
                  Besoin d'une personnalisation de parure, de coloris spécifique ou d'un volume conséquent pour votre mariage ou boutique ?
                </p>
                <div className="amz-quote-features">
                  <div>✓ Devis rapide transmis sous 24h</div>
                  <div>✓ Échantillonnage sur demande</div>
                  <div>✓ Accompagnement styliste dédié</div>
                </div>
              </div>
              <Link to="/contact" className="btn-primary" style={{ textAlign: 'center', width: '100%', fontSize: 13, padding: '12px 18px', marginTop: 14 }}>
                Demander un devis sur-mesure ➔
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 5 : CARROUSEL HORIZONTAL 2 - MEILLEURES VENTES */}
      <section className="amz-shelf-section" ref={revealShelf2}>
        <div className="container">
          <div className="amz-shelf">
            <div className="amz-shelf-head">
              <div>
                <h2>Meilleures Ventes dans Bijoux &amp; Mariage</h2>
                <p className="amz-shelf-sub">Inspiré par les choix des mariées et boutiques partenaires</p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button type="button" className="amz-arrow-btn" aria-label="Précédent" onClick={() => scrollRail(railRef2, 'left')}>
                  <IconChevronLeft />
                </button>
                <button type="button" className="amz-arrow-btn" aria-label="Suivant" onClick={() => scrollRail(railRef2, 'right')}>
                  <IconChevronRight />
                </button>
              </div>
            </div>

            <div className="amz-rail-wrapper">
              <div className="amz-rail" ref={railRef2}>
                {catalogProducts.map((p) => (
                  <ProductCard key={p.slug} product={{ ...p, rating: 5 }} showStars={true} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 : BLOC DEPARTEMENTS & RAYONS CATEGORIES */}
      <section className="amz-block-section">
        <div className="container">
          <div className="amz-block-card">
            <div className="uee-section-head" style={{ marginBottom: 24 }}>
              <div>
                <span className="section-kicker">✦ EXPLORER LE CATALOGUE</span>
                <h2 style={{ fontSize: 22, margin: 0 }}>Acheter par Rayon / Catégorie</h2>
              </div>
              <Link to="/boutique" className="amz-card-link">
                Voir toutes les catégories →
              </Link>
            </div>
            <div className="cat-grid" ref={revealCats}>
              {shelves.map((m) => (
                <Link
                  className="cat-item"
                  to={m.slug ? `/boutique?category=${m.slug}` : '/boutique'}
                  key={m.slug || m.name}
                >
                  <span className="ci-icon">{m.icon}</span>
                  <span className="ci-name">{m.name}</span>
                  <span className="ci-count">Explorer ➔</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7 : CATALOGUE GENERAL ET FILTRE PAR ONGLETS */}
      <section className="amz-block-section">
        <div className="container">
          <div className="amz-block-card">
            <div className="uee-section-head" style={{ marginBottom: 24 }}>
              <div>
                <span className="section-kicker">✦ COLLECTION EN DIRECT</span>
                <h2 style={{ fontSize: 22, margin: 0 }}>Catalogue Général &amp; Nouveautés</h2>
              </div>
              <div className="uee-tabs">
                <button
                  type="button"
                  className={`uee-tab${tab === '' ? ' active' : ''}`}
                  onClick={() => setTab('')}
                >
                  Tous nos trésors
                </button>
                {cats.slice(0, 5).map((c) => (
                  <button
                    key={c.slug || 'all'}
                    type="button"
                    className={`uee-tab${tab === c.slug ? ' active' : ''}`}
                    onClick={() => setTab(c.slug)}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="uee-grid-note">Chargement du catalogue en direct...</div>
            ) : (
              <>
                <div className="uee-product-grid" ref={revealGrid}>
                  {products.map((p) => (
                    <ProductCard key={p.slug} product={p} showStars={true} />
                  ))}
                </div>
                <div style={{ textAlign: 'center', marginTop: 36 }}>
                  <Link to="/boutique" className="btn-primary" style={{ padding: '14px 34px', fontSize: 14 }}>
                    Voir l'intégralité du catalogue ({products.length > 0 ? products.length : 12}+ pièces) ➔
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 8 : BANNIÈRE PROMO B2B AVEC COUNTDOWN */}
      <section className="amz-block-section">
        <div className="container">
          <div className="promo-banner reveal-elem" ref={revealPromo}>
            <div>
              <h3>{t('home.promo.title')}</h3>
              <p>{t('home.promo.text')}</p>
              <div className="promo-countdown">
                <div>
                  <div className="cd-num">{String(timeLeft.days).padStart(2, '0')}</div>
                  <div className="cd-label">{t('home.promo.days')}</div>
                </div>
                <div>
                  <div className="cd-num">{String(timeLeft.hours).padStart(2, '0')}</div>
                  <div className="cd-label">{t('home.promo.hours')}</div>
                </div>
                <div>
                  <div className="cd-num">{String(timeLeft.min).padStart(2, '0')}</div>
                  <div className="cd-label">{t('home.promo.min')}</div>
                </div>
                <div>
                  <div className="cd-num">{String(timeLeft.sec).padStart(2, '0')}</div>
                  <div className="cd-label">Sec</div>
                </div>
              </div>
            </div>
            <Link to="/compte/inscription?type=pro" className="btn-primary">{t('home.promo.createPro')}</Link>
          </div>
        </div>
      </section>

      {/* SECTION 9 : TÉMOIGNAGES CLIENTS */}
      <section className="amz-block-section">
        <div className="container">
          <div className="amz-block-card">
            <div className="uee-section-head" style={{ marginBottom: 24 }}>
              <div>
                <span className="section-kicker">✦ EXPÉRIENCE &amp; AVIS CERTIFIÉS</span>
                <h2 style={{ fontSize: 22, margin: 0 }}>Ce que nos mariées et partenaires disent de nous</h2>
              </div>
            </div>
            <div className="testi-grid" ref={revealTestis}>
              {testimonials.map((tm) => (
                <div className="testi-card" key={tm.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Stars value={tm.rating} />
                    <span className="t-verified">✓ Achat vérifié</span>
                  </div>
                  <p className="t-text">« {tm.text} »</p>
                  <div className="t-who">
                    <span className="t-avatar">{tm.av}</span>
                    <div>
                      <div className="t-name">{tm.name}</div>
                      <div className="t-loc">{tm.loc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 10 : BANDEAU UNIFIÉ RÉASSURANCE ET PAIEMENT SÉCURISÉ */}
      <section className="trust-section">
        <div className="container trust-flex">
          <div className="trust-badges" ref={revealUsp}>
            {usps.map((u) => (
              <span className="trust-badge" key={u.title}>
                {u.icon}
                <span><strong>{u.title}</strong> — {u.sub}</span>
              </span>
            ))}
          </div>
          <div className="pay-icons">
            <span className="pi">VISA</span><span className="pi">MC</span><span className="pi">PayPal</span><span className="pi">Stripe</span><span className="pi">AMEX</span>
          </div>
        </div>
      </section>

      {/* SECTION 11 : NEWSLETTER */}
      <section className="uee-newsletter" ref={revealNewsletter}>
        <div className="container nl-flex">
          <div>
            <h3>{t('home.newsletter.title')}</h3>
            <p>{t('home.newsletter.text')}</p>
          </div>
          {subscribed ? (
            <p className="nl-thanks">{t('home.newsletter.thanks')}</p>
          ) : (
            <form className="uee-nl-form" onSubmit={(e) => { e.preventDefault(); setSubscribed(true); }}>
              <input type="email" required placeholder={t('home.newsletter.placeholder')} />
              <button type="submit">{t('home.newsletter.subscribe')}</button>
            </form>
          )}
        </div>
      </section>

      {/* SECTION 12 : BOUTON RETOUR EN HAUT STYLE AMAZON */}
      <div className="amz-back-to-top" onClick={scrollToTop}>
        <span>Retour en haut ▲</span>
      </div>

      {/* TOAST DYNAMIQUE D'ACTIVITÉ EN DIRECT */}
      <div className="live-toast">
        <div className="lt-dot"></div>
        <div className="lt-content">
          <div className="lt-title">✦ Commande en direct</div>
          <div className="lt-item">{liveToasts[activeToast].name}</div>
          <div className="lt-sub">{liveToasts[activeToast].loc} • {liveToasts[activeToast].time}</div>
        </div>
      </div>
    </main>
  );
}
