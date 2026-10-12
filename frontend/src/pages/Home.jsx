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
  IconChevronLeft, IconChevronRight, IconTruck, IconCard, IconChat,
  IconShield, Stars,
} from '../components/icons.jsx';

export default function Home() {
  const { t, i18n } = useTranslation();

  const [products, setProducts] = useState(bestSellers);
  const [cats, setCats] = useState([]);
  const [tab, setTab] = useState('');
  const [loading, setLoading] = useState(false);

  const [slide, setSlide] = useState(0);
  const [subscribed, setSubscribed] = useState(false);
  const [toastDismissed, setToastDismissed] = useState(false);

  // Compte à rebours promotionnel réactif
  const [timeLeft, setTimeLeft] = useState({ days: 3, hours: 14, min: 52, sec: 0 });
  const timerRef = useRef(null);

  // Activité récente / commande en direct
  const [activeToast, setActiveToast] = useState(0);
  const liveToasts = [
    { name: t('home.liveOrders.item1') || 'Épingle Chinoise Dorée & Perles', loc: t('home.liveOrders.locParis') || 'Paris, France', time: t('home.liveOrders.time2min') || 'Il y a 2 min' },
    { name: t('home.liveOrders.item2') || 'Peigne de Mariée Fleur de Lys', loc: t('home.liveOrders.locLyon') || 'Lyon, France', time: t('home.liveOrders.time5min') || 'Il y a 5 min' },
    { name: t('home.liveOrders.item3') || 'Diadème Princesse Cristal', loc: t('home.liveOrders.locBrussels') || 'Bruxelles, Belgique', time: t('home.liveOrders.time12min') || 'Il y a 12 min' },
  ];

  // Scroll reveal animations
  const revealHero = useReveal({ threshold: 0.05 });
  const revealUsp = useRevealChildren({ stagger: 90 });
  const revealCats = useRevealChildren({ stagger: 80 });
  const revealGrid = useRevealChildren({ stagger: 70 });
  const revealSpotlight = useReveal();
  const revealCraft = useRevealChildren({ stagger: 90 });
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

    api.products({ page_size: 12 })
      .then((d) => {
        const items = productsFromApi(d);
        if (items && items.length) {
          setProducts(items);
        }
      })
      .catch(() => { });
  }, []);

  // Filtrage par onglet
  const handleTabChange = (categorySlug) => {
    setTab(categorySlug);
    if (!categorySlug) {
      api.products({ page_size: 12 })
        .then((d) => setProducts(productsFromApi(d)))
        .catch(() => { });
      return;
    }
    setLoading(true);
    api.products({ page_size: 12, category: categorySlug })
      .then((d) => {
        const items = productsFromApi(d);
        if (items && items.length) {
          setProducts(items);
        } else {
          // Filtrage local gracieux si l'API retourne vide
          setProducts(bestSellers.filter(p => p.cat?.toLowerCase().includes(categorySlug.toLowerCase())));
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  };

  // Diapositives Hero Haute Parure
  const heroSlides = [
    {
      badge: "✦ HAUTE JOAILLERIE & ORNEMENTS NUPTIAUX ✦",
      title1: t('home.hero.title1') || "Accessoires de Mariage",
      title2: t('home.hero.title2') || "Héritage Impérial",
      desc: "Collection d'exception de parures nuptiales, bijoux et coiffures traditionnelles impériales façonnées à la main pour une célébration d'une élégance inoubliable.",
      image: '/images/hero_phoenix_crown.jpg',
      alt: "Couronne Impériale & Parure Nuptiale Maison Lián",
      pills: ["💎 Fait Main & Dorure 18K", "✨ Pièce Signée • Édition Limitée"],
      price: "Dès 128 €",
      link: "/boutique",
    },
    {
      badge: "✦ HAUTE COIFFURE & ORNEMENTS ✦",
      title1: "Peignes Phénix",
      title2: "Épingles de Soie",
      desc: "Ornements précieux, peignes sculptés et épingles traditionnelles ornées de fleurs ciselées et pampilles dorées pour magnifier la chevelure de la mariée.",
      image: '/images/bridal_hairpin.jpg',
      alt: "Peigne & Épingles Nuptiales Traditionnelles",
      pills: ["🌸 Fleurs Ciselées & Jade", "🕊️ Pampilles Royales"],
      price: "Dès 68 €",
      link: "/boutique?category=ceremonie",
    },
    {
      badge: "✦ ÉCRIN PRESTIGE & CADEAU ✦",
      title1: "L'Écrin Signature",
      title2: "Maison Lián",
      desc: "Chaque bijou est soigneusement disposé dans notre coffret velours signature prêt-à-offrir, accompagné de son certificat d'authenticité et ruban satiné.",
      image: '/images/signature_gift_box.jpg',
      alt: "Écrin Velours Signature & Certificat de Garantie",
      pills: ["🎁 Coffret Velours Offert", "📜 Certificat Numéroté"],
      price: "Offert dès 150 €",
      link: "/boutique",
    },
  ];

  const currentHero = heroSlides[slide] || heroSlides[0];
  const stepSlide = (delta) => setSlide((s) => (s + delta + heroSlides.length) % heroSlides.length);

  // 4 Piliers de Confiance / Réassurance
  const usps = [
    { icon: <IconTruck />, title: t('home.usp.worldwide') || "Livraison Gratuite", sub: "Offerte dès 150 € • Suivi express 48h" },
    { icon: <IconShield />, title: t('home.usp.quality') || "Savoir-Faire Artisanal", sub: "Finitions dorées & pièces vérifiées" },
    { icon: <IconCard />, title: t('home.usp.secure') || "Paiement Sécurisé", sub: "CB, PayPal, Stripe & 3x sans frais" },
    { icon: <IconChat />, title: t('home.usp.support') || "Conseils Dédiés 7j/7", sub: "Accompagnement mariée & sur-mesure" },
  ];

  // 4 Univers & Collections Phares
  const categoryCards = [
    {
      badge: "PARURES DE REINE",
      name: "Bijoux & Parures Nuptiales",
      sub: "Colliers impériaux, boucles d'oreilles & bracelets d'or fin.",
      image: '/images/hero_phoenix_crown.jpg',
      link: '/boutique?category=bijous',
      cta: "Explorer la collection",
    },
    {
      badge: "HAUTE COIFFURE",
      name: "Peignes & Épingles Phénix",
      sub: "Ornements de cheveux traditionnels, cinabre et perles d'eau douce.",
      image: '/images/bridal_hairpin.jpg',
      link: '/boutique?category=ceremonie',
      cta: "Découvrir les peignes",
    },
    {
      badge: "PRESTIGE CÉRÉMONIE",
      name: "Diadèmes & Tiares Royales",
      sub: "Couronnes d'exception étincelantes pour sublimer le grand jour.",
      image: '/images/hero_phoenix_crown.jpg',
      link: '/boutique?category=reception',
      cta: "Voir les diadèmes",
    },
    {
      badge: "PRÊT-À-OFFRIR",
      name: "Écrins & Coffrets Signatures",
      sub: "Écrins en velours avec certificat d'authenticité et ruban satiné.",
      image: '/images/signature_gift_box.jpg',
      link: '/boutique',
      cta: "Découvrir l'écrin",
    },
  ];

  // Fusion harmonieuse des produits du backend avec le catalogue d'inspiration pour une vitrine abondante et équilibrée
  const displayProducts = [
    ...products,
    ...bestSellers.filter(b => !products.some(p => p.slug === b.slug)),
    ...catalogProducts.filter(c => !products.some(p => p.slug === c.slug) && !bestSellers.some(b => b.slug === c.slug)),
  ].slice(0, 8);

  // Avis clientes vérifiés
  const testimonials = [
    { av: 'C', text: t('home.testimonials.t1') || "La parure était encore plus spectaculaire qu'en photo. Finitions impeccables et envoi ultra soigné.", name: 'Camille R.', loc: 'Lyon, France', rating: 5 },
    { av: 'S', text: t('home.testimonials.t2') || "Pour notre boutique nuptiale, l'accompagnement et la qualité des peignes sont au-delà de nos attentes.", name: 'Sophie M. — Boutique Ivoire', loc: 'Bruxelles, Belgique', rating: 5 },
    { av: 'M', text: t('home.testimonials.t3') || "Le peigne phénix a fait l'admiration de tous nos invités. Un trésor d'artisanat que je garderai toute ma vie.", name: 'Mei L.', loc: 'Vancouver, Canada', rating: 5 },
  ];

  return (
    <main className="ml-home-wrap">
      <SEOHead
        title="Accessoires de Mariage & Haute Coiffure Chinoise | Maison Lián"
        description="Collection exclusive de bijoux nuptiaux et coiffures traditionnelles chinoises impériales façonnées à la main. Vente au détail et créations d'exception."
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
              <span className="sale-tag" style={{ margin: 0 }}>
                <span style={{ color: '#FFD700' }}>✦</span> {currentHero.badge}
              </span>
            </div>

            <h1>{currentHero.title1} <em>&amp;</em> {currentHero.title2}</h1>
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
            <div className="hero-pill p1">{currentHero.pills[0]}</div>
            <div className="hero-pill p2">{currentHero.pills[1]}</div>
            <div className="disc pg-fade" key={slide}>
              <img
                className="hero-photo"
                src={currentHero.image}
                alt={currentHero.alt}
                loading="eager"
              />
              <div className="price-float">
                <div className="pf-old">Édition Cérémonie</div>
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
              aria-label={`Slide ${i + 1}`}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>
      </section>

      {/* =========================================================================
          SECTION 2 : BARRE DE RÉASSURANCE & PRESTIGE (IMMEDIATEMENT SOUS LE HERO)
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
          SECTION 3 : UNIVERS & COLLECTIONS PHARES DE LA MAISON
          ========================================================================= */}
      <section className="uee-section" style={{ background: '#FAF8F5' }}>
        <div className="container">
          <div className="uee-section-head">
            <div>
              <span className="section-kicker">✦ UNIVERS DE MARIAGE</span>
              <h2>Explorez nos Collections Royales</h2>
            </div>
            <Link to="/boutique" className="see-all">
              <span>Voir tout le catalogue</span>
              <IconChevronRight />
            </Link>
          </div>

          <div className="ml-categories-grid" ref={revealCats}>
            {categoryCards.map((c) => (
              <Link to={c.link} key={c.name} className="ml-category-card">
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
        </div>
      </section>

      {/* =========================================================================
          SECTION 4 : SÉLECTION D'EXCEPTION (PRODUITS VEDETTES AVEC FILTRES)
          ========================================================================= */}
      <section className="uee-section">
        <div className="container">
          <div className="uee-section-head">
            <div>
              <span className="section-kicker">✦ SÉLECTION D'EXCEPTION</span>
              <h2>{t('home.overview.generalCatalog') || 'Les Trésors de la Saison'}</h2>
            </div>

            <div className="uee-tabs">
              <button
                type="button"
                className={`uee-tab${tab === '' ? ' active' : ''}`}
                onClick={() => handleTabChange('')}
              >
                {t('home.overview.allTreasures') || 'Tous les trésors'}
              </button>
              {cats.map((c) => (
                <button
                  key={c.slug || c.id}
                  type="button"
                  className={`uee-tab${tab === c.slug ? ' active' : ''}`}
                  onClick={() => handleTabChange(c.slug)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
              Chargement des pièces d'exception...
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
                  Découvrir toutes nos créations ({displayProducts.length}+ pièces) ➔
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* =========================================================================
          SECTION 5 : DOUBLE SPOTLIGHT — L'ÉCRIN SIGNATURE & L'OFFRE PRIVILÈGE
          ========================================================================= */}
      <section className="uee-section" style={{ background: '#FAF8F5' }} ref={revealSpotlight}>
        <div className="container">
          <div className="ml-spotlight-duo">

            {/* CARTE 1 : L'ÉCRIN SIGNATURE MAISON LIÁN */}
            <div className="ml-box-card">
              <div>
                <span className="ml-box-kicker">✦ {t('home.overview.signatureBox') || 'EXPÉRIENCE PRÊT-À-OFFRIR'}</span>
                <h3>{t('home.overview.signatureBoxTitle') || "L'Écrin Signature & Emballage Prestige"}</h3>
                <p className="ml-box-desc">
                  {t('home.overview.signatureBoxText') ||
                    "Chaque bijou est délicatement déposé dans notre coffret signature en velours orné d'un ruban de satin, accompagné de son certificat d'authenticité et de garantie."}
                </p>
                <img
                  src="/images/signature_gift_box.jpg"
                  alt="Écrin velours signature et certificat d'authenticité"
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
                    <span>{t('home.overview.signatureFeature2') || "Ruban de satin noué à la main & carte personnalisable"}</span>
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

            {/* CARTE 2 : OFFRE PRIVILÈGE SAISON NUPTIALE & COUNTDOWN */}
            <div className="ml-promo-card">
              <div>
                <span className="ml-promo-kicker">✦ VENTE PRIVÉE NUPTIALE</span>
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
                    <div className="cd-label">Sec</div>
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
          SECTION 6 : L'HÉRITAGE ARTISANAL & LES ENGAGEMENTS MAISON LIÁN
          ========================================================================= */}
      <section className="uee-section">
        <div className="container">
          <div className="uee-section-head">
            <div>
              <span className="section-kicker">✦ ATELIER & TRADITION</span>
              <h2>L'Excellence Artisanale au Cœur de Votre Jour J</h2>
            </div>
            <Link to="/contact" className="see-all">
              <span>Nous contacter</span>
              <IconChevronRight />
            </Link>
          </div>

          <div className="ml-craft-grid" ref={revealCraft}>
            <div className="ml-craft-card">
              <span className="ml-craft-icon"><IconShield /></span>
              <h3>Dorure d'Art &amp; Métaux Nobles</h3>
              <p>
                Nos pièces sont ouvragées avec une dorure à l'or fin 18 carats et des alliages hypoallergéniques conçus pour un port léger et éclatant tout au long de votre célébration.
              </p>
              <Link to="/boutique" className="ml-craft-link">
                Découvrir l'orfèvrerie ➔
              </Link>
            </div>

            <div className="ml-craft-card">
              <span className="ml-craft-icon"><IconChat /></span>
              <h3>Conseil &amp; Créations Sur-Mesure</h3>
              <p>
                De l'ajustement des peignes à la coordination de parures complètes pour cortège, nos conseillers joailliers vous accompagnent pas à pas dans vos préparatifs.
              </p>
              <Link to="/contact" className="ml-craft-link">
                Prendre rendez-vous ➔
              </Link>
            </div>

            <div className="ml-craft-card">
              <span className="ml-craft-icon"><IconTruck /></span>
              <h3>{t('home.overview.wholesaleAccounts') || "Espace Professionnels & Boutiques"}</h3>
              <p>
                {t('home.overview.wholesaleText') ||
                  "Tarifs grossistes dégressifs jusqu'à -40%, commande rapide et expédition express pour les boutiques de robes de mariée et salons partenaires."}
              </p>
              <Link to="/compte/pro" className="ml-craft-link">
                {t('home.overview.discoverProSpace') || "Découvrir l'Espace Pro"} ➔
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7 : AVIS CLIENTES & TÉMOIGNAGES VÉRIFIÉS
          ========================================================================= */}
      <section className="uee-section" style={{ background: '#FAF8F5' }}>
        <div className="container">
          <div className="uee-section-head" style={{ marginBottom: 28 }}>
            <div>
              <span className="section-kicker">✦ EXPÉRIENCE &amp; CONFIANCE</span>
              <h2>{t('home.overview.customerReviewsTitle') || "Ce que nos mariées disent de nous"}</h2>
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
      </section>

      {/* =========================================================================
          SECTION 8 : CLUB PRIVILÈGE & NEWSLETTER VIP
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
                aria-label="Adresse e-mail"
              />
              <button type="submit">{t('home.newsletter.subscribe') || "Rejoindre"}</button>
            </form>
          )}
        </div>
      </section>

      {/* =========================================================================
          SECTION 9 : BANDEAU PAIEMENT SÉCURISÉ & CONFIANCE
          ========================================================================= */}
      <section className="trust-section">
        <div className="container trust-flex">
          <div className="trust-badges">
            <span className="trust-badge">
              <IconTruck />
              <span><strong>Expédition soignée</strong> sous 48h</span>
            </span>
            <span className="trust-badge">
              <IconShield />
              <span><strong>Certificat d'authenticité</strong> inclus</span>
            </span>
            <span className="trust-badge">
              <IconCard />
              <span><strong>Paiement sécurisé</strong> SSL 256-bit</span>
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
            aria-label="Fermer"
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
