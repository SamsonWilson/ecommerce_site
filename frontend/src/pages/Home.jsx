import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEOHead from '../components/SEOHead.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { bestSellers, catalogProducts } from '../data/products.jsx';
import { mediaTags, mediaText as mediaTextIn, useAestheticMedia, withMediaVersion } from '../data/aestheticMedia.js';
import { api } from '../lib/api.js';
import { productsFromApi } from '../lib/catalog.js';
import { useReveal, useRevealChildren } from '../hooks/useReveal.js';
import {
  IconChevronLeft, IconChevronRight, IconTruck, IconCard, IconChat,
  IconShield, Stars,
} from '../components/icons.jsx';

export default function Home() {
  const { t, i18n } = useTranslation();

  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [tab, setTab] = useState('');
  const [loading, setLoading] = useState(false);
  const [moreCatsOpen, setMoreCatsOpen] = useState(false);
  const moreCatsRef = useRef(null);

  // Fermeture du menu déroulant des catégories supplémentaires au clic extérieur
  useEffect(() => {
    function handleClickOutside(e) {
      if (moreCatsRef.current && !moreCatsRef.current.contains(e.target)) {
        setMoreCatsOpen(false);
      }
    }
    if (moreCatsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [moreCatsOpen]);

  // Médiathèque esthétique synchronisée en direct avec /gestion/mediatheque
  const [aestheticMedia] = useAestheticMedia();

  const [slide, setSlide] = useState(0);
  const [subscribed, setSubscribed] = useState(false);
  const [toastDismissed, setToastDismissed] = useState(false);

  // Compte à rebours promotionnel réactif
  const [timeLeft, setTimeLeft] = useState({ days: 3, hours: 14, min: 52, sec: 0 });
  const timerRef = useRef(null);

  // Activité récente / commande en direct
  const [activeToast, setActiveToast] = useState(0);

  const liveToasts = [
    { name: t('home.liveOrders.item1') || 'Épingle Chinoise Dorée ET Perles', loc: t('home.liveOrders.locParis') || 'Paris, France', time: t('home.liveOrders.time2min') || 'Il y a 2 min' },
    { name: t('home.liveOrders.item2') || 'Peigne de Mariée Fleur de Lys', loc: t('home.liveOrders.locLyon') || 'Lyon, France', time: t('home.liveOrders.time5min') || 'Il y a 5 min' },
    { name: t('home.liveOrders.item3') || 'Diadème Princesse Cristal', loc: t('home.liveOrders.locBrussels') || 'Bruxelles, Belgique', time: t('home.liveOrders.time12min') || 'Il y a 12 min' },
  ];

  // Scroll reveal animations
  const revealHero = useReveal({ threshold: 0.05 });
  const revealUsp = useRevealChildren({ stagger: 90 });
  const revealCats = useRevealChildren({ stagger: 80 });
  const revealGrid = useRevealChildren({ stagger: 70 });
  const revealSpotlight = useReveal();
  const revealTestis = useRevealChildren({ stagger: 100 });
  const revealNewsletter = useReveal();

  // Compte à rebours 1s
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

  // Défilement automatique du carrousel Hero toutes les 6.5s
  useEffect(() => {
    const interval = setInterval(() => {
      setSlide((s) => (s + 1) % 3);
    }, 6500);
    return () => clearInterval(interval);
  }, []);

  // Rotation des toasts toutes les 8s
  useEffect(() => {
    const toastInterval = setInterval(() => {
      setActiveToast((prev) => (prev + 1) % liveToasts.length);
    }, 8000);
    return () => clearInterval(toastInterval);
  }, [i18n.language, liveToasts.length]);

  // Chargement des données backend
  useEffect(() => {
    api.categories()
      .then((d) => setCats(d.results || d || []))
      .catch(() => setCats([]));

    api.products({ page_size: 12, category: tab || undefined })
      .then((d) => {
        const items = productsFromApi(d);
        setProducts(items || []);
      })
      .catch(() => {
        setProducts([]);
      });
  }, [i18n.resolvedLanguage]);

  // Filtrage par onglet
  const handleTabChange = (categorySlug) => {
    setTab(categorySlug);
    setLoading(true);
    const params = { page_size: 12 };
    if (categorySlug) params.category = categorySlug;
    api.products(params)
      .then((d) => {
        const items = productsFromApi(d);
        setProducts(items || []);
      })
      .catch(() => {
        setProducts([]);
      })
      .finally(() => setLoading(false));
  };

  const mediaText = (item, field) => mediaTextIn(item, field, t, i18n.resolvedLanguage);

  // Bannières actives provenant directement de la Médiathèque Esthétique
  const heroSlides = useMemo(() => {
    const featured = (aestheticMedia || []).filter(
      (m) => (m.placement === 'hero' || m.status === 'featured') && m.status !== 'draft'
    );
    if (!featured || featured.length === 0) {
      return [
        {
          title1: t('home.hero.title1') || "Accessoires de Mariage",
          title2: t('home.hero.title2') || "Héritage Impérial",
          desc: t('home.hero.fallbackDesc'),
          image: withMediaVersion('/images/hero_phoenix_crown.jpg'),
          alt: t('home.hero.fallbackAlt'),
          pills: [],
          price: t('home.hero.fallbackPrice'),
          link: "/boutique",
        },
      ];
    }
    return featured.map((item) => {
      const title = mediaText(item, 'title');
      const badge = mediaText(item, 'badge');
      const parts = title.split('—');
      return {
        title1: badge ? badge.replace('✦', '').trim() : t('home.hero.highSet'),
        title2: (parts[0] || title).trim(),
        desc: mediaText(item, 'subtitle') || item.storytelling,
        image: item.image,
        alt: title,
        pills: mediaTags(item, t, i18n.resolvedLanguage),
        price: mediaText(item, 'cta') || t('home.hero.discoverCreation'),
        link: item.link || "/boutique",
      };
    });
  }, [aestheticMedia, t]);

  const currentHero = heroSlides[slide % heroSlides.length] || heroSlides[0];
  const stepSlide = (delta) => setSlide((s) => (s + delta + heroSlides.length) % heroSlides.length);


  // 4 Piliers de Confiance / Réassurance
  const usps = [
    { icon: <IconTruck />, title: t('home.usp.worldwide') || "Livraison Gratuite", sub: t('home.usp.subShipping') },
    { icon: <IconShield />, title: t('home.usp.quality') || "Savoir-Faire Artisanal", sub: t('home.usp.subQuality') },
    { icon: <IconCard />, title: t('home.usp.secure') || "Paiement Sécurisé", sub: t('home.usp.subPayment') },
    { icon: <IconChat />, title: t('home.usp.support') || "Conseils Dédiés 7j/7", sub: t('home.usp.subAdvice') },
  ];

  // Univers & Collections Phares synchronisés avec la médiathèque (exclusivement les articles ayant le statut 'active')
  const activeCategoryCards = useMemo(() => {
    const activeMedia = (aestheticMedia || []).filter((m) => m.status === 'active');
    return activeMedia.map((item) => {
      const title = mediaText(item, 'title');
      const badge = mediaText(item, 'badge');
      return {
        id: item.id,
        badge: badge ? badge.replace('✦', '').trim() : t('home.hero.royalCollection'),
        name: title ? (title.split('—')[0] || title).trim() : t('home.hero.bridalCreation'),
        sub: mediaText(item, 'subtitle') || (item.storytelling ? item.storytelling.slice(0, 95) + '...' : ''),
        image: item.image,
        link: item.link || '/boutique',
        cta: mediaText(item, 'cta') || t('home.hero.discoverCreation'),
      };
    });
  }, [aestheticMedia, t]);

  // Carrousel interactif des Univers de Mariage (stricte monoligne — max 4 cartes visibles simultanément)
  const categoriesTrackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isCatsHovered, setIsCatsHovered] = useState(false);

  const setCategoryRefs = useCallback((node) => {
    categoriesTrackRef.current = node;
    if (revealCats && typeof revealCats === 'object') {
      revealCats.current = node;
    }
  }, [revealCats]);

  const checkScrollState = useCallback(() => {
    const el = categoriesTrackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  const scrollCategories = useCallback((direction) => {
    const el = categoriesTrackRef.current;
    if (!el) return;
    const card = el.querySelector('.ml-category-card');
    const step = card ? card.offsetWidth + 22 : 320;
    if (direction === 'left') {
      if (el.scrollLeft <= 10) {
        el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: -step, behavior: 'smooth' });
      }
    } else {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    }
  }, []);

  // Défilement automatique fluide si plus de 4 cartes sont actives (en pause lors du survol de la souris)
  useEffect(() => {
    if (activeCategoryCards.length <= 4 || isCatsHovered) return;
    const autoScrollTimer = setInterval(() => {
      scrollCategories('right');
    }, 4500);
    return () => clearInterval(autoScrollTimer);
  }, [activeCategoryCards.length, isCatsHovered, scrollCategories]);

  // Synchronisation des indicateurs au scroll et au redimensionnement
  useEffect(() => {
    checkScrollState();
    const el = categoriesTrackRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollState, { passive: true });
      window.addEventListener('resize', checkScrollState);
    }
    return () => {
      if (el) el.removeEventListener('scroll', checkScrollState);
      window.removeEventListener('resize', checkScrollState);
    };
  }, [checkScrollState, activeCategoryCards]);

  // Produits en stock issus du backend pour la vitrine
  const displayProducts = (products || []).filter((p) => Number(p.stock) > 0).slice(0, 8);

  // Avis clientes vérifiés
  const testimonials = [
    { av: 'C', text: t('home.testimonials.t1') || "La parure était encore plus spectaculaire qu'en photo. Finitions impeccables et envoi ultra soigné.", name: 'Camille R.', loc: t('home.liveOrders.locLyon'), rating: 5 },
    { av: 'S', text: t('home.testimonials.t2') || "Pour notre boutique nuptiale, l'accompagnement et la qualité des peignes sont au-delà de nos attentes.", name: 'Sophie M. — Boutique Ivoire', loc: t('home.liveOrders.locBrussels'), rating: 5 },
    { av: 'M', text: t('home.testimonials.t3') || "Le peigne phénix a fait l'admiration de tous nos invités. Un trésor d'artisanat que je garderai toute ma vie.", name: 'Mei L.', loc: t('home.testimonials.locVancouver'), rating: 5 },
  ];

  return (
    <main className="ml-home-wrap">
      <SEOHead
        title={t('home.seoTitle')}
        description={t('home.seoDescription')}
        schema={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Maison Lián",
          "url": "https://maisonlian.com",
          "logo": "https://maisonlian.com/images/hero_phoenix_crown.jpg"
        }}
      />

      {/* =========================================================================
          SECTION 1 : HERO CARROUSEL HAUTE JOAILLERIE
          ========================================================================= */}
      <section className="uee-hero">
        <button
          type="button"
          className="slider-arrow left"
          aria-label={t('home.hero.previous') || 'Précédent'}
          onClick={() => stepSlide(-1)}
        >
          <IconChevronLeft />
        </button>
        <button
          type="button"
          className="slider-arrow right"
          aria-label={t('home.hero.next') || 'Suivant'}
          onClick={() => stepSlide(1)}
        >
          <IconChevronRight />
        </button>

        <div className="container" ref={revealHero}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <Link to="/boutique" className="animated-pill-btn">
                <span>{t('nav.allCategories') || 'Toutes les collections'}</span>
                <span className="btn-arrow">›</span>
              </Link>
            </div>

            <h1>{currentHero.title1} <em>{t('home.hero.and')}</em> {currentHero.title2}</h1>
            <p>{currentHero.desc}</p>

            <div className="uee-hero-cta">
              <Link to={currentHero.link} className="btn-primary">
                {t('home.hero.discoverCollection') || 'Explorer les Collections'} ➔
              </Link>
              <Link to="/contact" className="btn-outline">
                {t('header.requestQuote') || 'Créations Sur-Mesure'}
              </Link>
            </div>
          </div>

          <div className="uee-hero-art">
            <div className="disc pg-fade" key={slide}>
              <img
                className="hero-photo"
                src={currentHero.image}
                alt={currentHero.alt}
                loading="eager"
              />
              <div className="price-float">
                <div className="pf-old">{t('home.hero.ceremonyEdition')}</div>
                <div className="pf-new">{currentHero.price}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="slider-dots">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              type="button"
              className={i === slide ? 'active' : undefined}
              aria-label={t('home.hero.slide', { n: i + 1 })}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 2 : BARRE DE RÉASSURANCE ET PRESTIGE (IMMEDIATEMENT SOUS LE HERO)
          ========================================================================= */}
      <section className="usp-row">
        <div className="container">
          <div className="usp-grid" ref={revealUsp}>
            {usps.map((u) => (
              <div className="usp-item" key={u.title}>
                <span className="usp-icon">{u.icon}</span>
                <div>
                  <div className="usp-title">{u.title}</div>
                  <div className="usp-sub">{u.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3 : UNIVERS ET COLLECTIONS PHARES DE LA MAISON
          ========================================================================= */}
      <section className="uee-section" style={{ background: '#FAF8F5' }}>
        <div className="container">
          <div className="uee-section-head">
            <div>
              <span className="section-kicker">✦ {t('home.collections.kicker', 'UNIVERS DE MARIAGE')}</span>
              <h2>{t('home.collections.title', 'Explorez nos Collections Royales')}</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {activeCategoryCards.length > 4 && (
                <div className="ml-carousel-nav-arrows">
                  <button
                    type="button"
                    className="ml-carousel-arrow-btn"
                    onClick={() => scrollCategories('left')}
                    aria-label={t('home.prevCollection')}
                    title={t('home.prev')}
                  >
                    <IconChevronLeft />
                  </button>
                  <button
                    type="button"
                    className="ml-carousel-arrow-btn"
                    onClick={() => scrollCategories('right')}
                    aria-label={t('home.nextCollection')}
                    title={t('home.next')}
                  >
                    <IconChevronRight />
                  </button>
                </div>
              )}
              <Link to="/boutique" className="see-all">
                <span>{t('home.collections.viewAll', 'Voir tout le catalogue')}</span>
                <IconChevronRight />
              </Link>
            </div>
          </div>

          <div
            className="ml-categories-carousel-wrap"
            onMouseEnter={() => setIsCatsHovered(true)}
            onMouseLeave={() => setIsCatsHovered(false)}
          >
            {activeCategoryCards.length > 4 && (
              <button
                type="button"
                className="ml-cat-floating-arrow left"
                onClick={() => scrollCategories('left')}
                aria-label={t('home.scrollLeft')}
              >
                <IconChevronLeft />
              </button>
            )}

            <div
              className="ml-categories-track ml-categories-grid"
              ref={setCategoryRefs}
            >
              {activeCategoryCards.map((c) => (
                <Link to={c.link} key={c.id || c.name} className="ml-category-card">
                  <div className="ml-category-media">
                    <span className="ml-category-badge">{c.badge}</span>
                    <img src={c.image} alt={c.name} loading="lazy" />
                  </div>
                  <div className="ml-category-content">
                    <div className="ml-category-title">{c.name}</div>
                    <div className="ml-category-sub">{c.sub}</div>
                    <span className="ml-category-cta">
                      {c.cta} ➔
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {activeCategoryCards.length > 4 && (
              <button
                type="button"
                className="ml-cat-floating-arrow right"
                onClick={() => scrollCategories('right')}
                aria-label={t('home.scrollRight')}
              >
                <IconChevronRight />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4 : SÉLECTION D'EXCEPTION (PRODUITS VEDETTES AVEC FILTRES)
          ========================================================================= */}
      <section className="uee-section">
        <div className="container">
          <div className="uee-section-head">
            <div>
              <span className="section-kicker">✦ {t('home.selection.kicker', "SÉLECTION D'EXCEPTION")}</span>
              <h2>{t('home.overview.generalCatalog') || 'Les Trésors de la Saison'}</h2>
            </div>

            <div className="uee-tabs">
              <button
                type="button"
                className={`uee-tab${tab === '' ? ' active' : ''}`}
                onClick={() => {
                  handleTabChange('');
                  setMoreCatsOpen(false);
                }}
              >
                {t('home.overview.allTreasures') || 'Tous les trésors'}
              </button>
              {cats.slice(0, 4).map((c) => (
                <button
                  key={c.slug || c.id}
                  type="button"
                  className={`uee-tab${tab === c.slug ? ' active' : ''}`}
                  onClick={() => {
                    handleTabChange(c.slug);
                    setMoreCatsOpen(false);
                  }}
                >
                  {c.name}
                </button>
              ))}

              {cats.length > 4 && (
                <div className="uee-tabs-dropdown-wrap" ref={moreCatsRef}>
                  <button
                    type="button"
                    className={`uee-tab uee-tab-more${cats.slice(4).some((c) => c.slug === tab) ? ' active' : ''}${moreCatsOpen ? ' open' : ''}`}
                    onClick={() => setMoreCatsOpen((prev) => !prev)}
                    aria-expanded={moreCatsOpen}
                    title={t('home.moreCategories')}
                  >
                    <span>
                      {cats.slice(4).find((c) => c.slug === tab)?.name || t('home.others')}
                    </span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      style={{
                        width: 13,
                        height: 13,
                        transition: 'transform 0.25s ease',
                        transform: moreCatsOpen ? 'rotate(180deg)' : 'none',
                      }}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {moreCatsOpen && (
                    <div className="uee-tabs-dropdown-menu">
                      {cats.slice(4).map((c) => (
                        <button
                          key={c.slug || c.id}
                          type="button"
                          className={`uee-tabs-dropdown-item${tab === c.slug ? ' active' : ''}`}
                          onClick={() => {
                            handleTabChange(c.slug);
                            setMoreCatsOpen(false);
                          }}
                        >
                          <span>{c.name}</span>
                          {tab === c.slug && <span className="cat-check">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              {t('home.loadingPieces')}
            </div>
          ) : (
            <>
              <div className="uee-product-grid" ref={revealGrid}>
                {displayProducts.map((p) => (
                  <ProductCard key={p.slug} product={p} showStars={true} />
                ))}
              </div>

              <div style={{ textAlign: 'center', marginTop: 42 }}>
                <Link
                  to="/boutique"
                  className="btn-primary"
                  style={{ padding: '15px 38px', fontSize: 14.5, display: 'inline-block' }}
                >
                  {t('home.discoverAll', { n: displayProducts.length })}
                </Link>
              </div>
            </>
          )}
        </div>
      </section>


      {/* =========================================================================
          SECTION 5 : DOUBLE SPOTLIGHT — L'ÉCRIN SIGNATURE ET L'OFFRE PRIVILÈGE
          ========================================================================= */}
      <section className="uee-section" style={{ background: '#FAF8F5' }} ref={revealSpotlight}>
        <div className="container">
          <div className="ml-spotlight-duo">

            {/* CARTE 1 : L'ÉCRIN SIGNATURE MAISON LIÁN */}
            <div className="ml-box-card">
              <div>
                <span className="ml-box-kicker">✦ {t('home.overview.signatureBox') || 'EXPÉRIENCE PRÊT-À-OFFRIR'}</span>
                <h3>{t('home.overview.signatureBoxTitle') || "L'Écrin Signature ET Emballage Prestige"}</h3>
                <p className="ml-box-desc">
                  {t('home.overview.signatureBoxText') ||
                    "Chaque bijou est délicatement déposé dans notre coffret signature en velours orné d'un ruban de satin, accompagné de son certificat d'authenticité et de garantie."}
                </p>
                <img
                  src="/images/signature_gift_box.jpg"
                  alt={t('home.boxAlt')}
                  className="ml-box-preview-img"
                  loading="lazy"
                />
                <div className="ml-box-features">
                  <div className="ml-box-feat">
                    <span className="chk">✓</span>
                    <span>{t('home.overview.signatureFeature1') || "Coffret velours d'exception offert pour chaque commande"}</span>
                  </div>
                  <div className="ml-box-feat">
                    <span className="chk">✓</span>
                    <span>{t('home.overview.signatureFeature2') || "Ruban de satin noué à la main ET carte personnalisable"}</span>
                  </div>
                  <div className="ml-box-feat">
                    <span className="chk">✓</span>
                    <span>{t('home.overview.signatureFeature3') || "Protection maximale pour une expédition sécurisée"}</span>
                  </div>
                </div>
              </div>

              <Link to="/boutique" className="btn-primary" style={{ textAlign: 'center', marginTop: 12 }}>
                {t('home.overview.exploreCollections') || 'Explorer nos parures'} ➔
              </Link>
            </div>

            {/* CARTE 2 : OFFRE PRIVILÈGE SAISON NUPTIALE ET COUNTDOWN */}
            <div className="ml-promo-card">
              <div>
                <span className="ml-promo-kicker">{t('home.privateSale')}</span>
                <h3>{t('home.overview.weddingOffer') || "Privilège Saison Nuptiale — Jusqu'à -20%"}</h3>
                <p className="ml-promo-desc">
                  {t('home.overview.weddingOfferText') ||
                    "Profitez d'offres exclusives et de remises d'exception sur une sélection raffinée d'accessoires et parures pour votre cérémonie."}
                </p>

                <div className="ml-countdown-wrap">
                  <div className="ml-cd-box">
                    <div className="cd-num">{String(timeLeft.days).padStart(2, '0')}</div>
                    <div className="cd-label">{t('home.promo.days') || 'Jours'}</div>
                  </div>
                  <div className="ml-cd-box">
                    <div className="cd-num">{String(timeLeft.hours).padStart(2, '0')}</div>
                    <div className="cd-label">{t('home.promo.hours') || 'Heures'}</div>
                  </div>
                  <div className="ml-cd-box">
                    <div className="cd-num">{String(timeLeft.min).padStart(2, '0')}</div>
                    <div className="cd-label">{t('home.promo.min') || 'Min'}</div>
                  </div>
                  <div className="ml-cd-box">
                    <div className="cd-num">{String(timeLeft.sec).padStart(2, '0')}</div>
                    <div className="cd-label">{t('home.secondsShort')}</div>
                  </div>
                </div>
              </div>

              <Link to="/boutique" className="btn-primary" style={{ textAlign: 'center' }}>
                {t('home.overview.discoverSelection') || 'Accéder à la sélection privée'} ➔
              </Link>
            </div>

          </div>
        </div>
      </section>



      {/* =========================================================================
          SECTION 7 : AVIS CLIENTES ET TÉMOIGNAGES VÉRIFIÉS
          ========================================================================= */}
      <section className="uee-section" style={{ background: '#FAF8F5' }}>
        <div className="container">
          <div className="uee-section-head" style={{ marginBottom: 28 }}>
            <div>
              <span className="section-kicker">{t('home.trustKicker')}</span>
              <h2>{t('home.overview.customerReviewsTitle') || "Ce que nos mariées disent de nous"}</h2>
            </div>
          </div>

          <div className="testi-grid" ref={revealTestis}>
            {testimonials.map((tm) => (
              <div className="testi-card" key={tm.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Stars value={tm.rating} />
                  <span className="t-verified">{t('home.verifiedPurchase')}</span>
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
      </section>

      {/* =========================================================================
          SECTION 8 : CLUB PRIVILÈGE ET NEWSLETTER VIP
          ========================================================================= */}
      <section className="uee-newsletter" ref={revealNewsletter}>
        <div className="container nl-flex">
          <div>
            <h3>{t('home.newsletter.title') || "Rejoignez le Cercle Privilège Maison Lián"}</h3>
            <p>{t('home.newsletter.text') || "Recevez nos invitations aux ventes privées, nos nouveautés et 10% offerts sur votre première commande."}</p>
          </div>
          {subscribed ? (
            <p className="nl-thanks">{t('home.newsletter.thanks') || "Merci ! Votre code de bienvenue vous a été envoyé par e-mail."}</p>
          ) : (
            <form className="uee-nl-form" onSubmit={(e) => { e.preventDefault(); setSubscribed(true); }}>
              <input
                type="email"
                required
                placeholder={t('home.newsletter.placeholder') || "Votre adresse e-mail"}
                aria-label={t('auth.email')}
              />
              <button type="submit">{t('home.newsletter.subscribe') || "Rejoindre"}</button>
            </form>
          )}
        </div>
      </section>

      {/* =========================================================================
          SECTION 9 : BANDEAU PAIEMENT SÉCURISÉ ET CONFIANCE
          ========================================================================= */}
      <section className="trust-section">
        <div className="container trust-flex">
          <div className="trust-badges">
            <span className="trust-badge">
              <IconTruck />
              <span><strong>{t('home.footerShipping')}</strong> {t('home.footerShippingDelay')}</span>
            </span>
            <span className="trust-badge">
              <IconShield />
              <span><strong>{t('home.footerCertificate')}</strong> {t('home.footerIncluded')}</span>
            </span>
            <span className="trust-badge">
              <IconCard />
              <span><strong>{t('product.securePayment')}</strong> SSL 256-bit</span>
            </span>
          </div>
          <div className="pay-icons">
            <span className="pi">VISA</span>
            <span className="pi">MC</span>
            <span className="pi">PayPal</span>
            <span className="pi">Stripe</span>
            <span className="pi">Apple Pay</span>
          </div>
        </div>
      </section>

      {/* TOAST D'ACTIVITÉ EN DIRECT (DISCRET ET FERMABLE) */}
      {!toastDismissed && (
        <div className="live-toast" role="status" aria-live="polite">
          <div className="lt-dot"></div>
          <div className="lt-content" style={{ flex: 1 }}>
            <div className="lt-title">✦ {t('home.liveOrders.title') || 'Commande récente'}</div>
            <div className="lt-item">{liveToasts[activeToast].name}</div>
            <div className="lt-sub">{liveToasts[activeToast].loc} • {liveToasts[activeToast].time}</div>
          </div>
          <button
            type="button"
            onClick={() => setToastDismissed(true)}
            aria-label={t('common.close')}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}


    </main>
  );
}

