import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEOHead from '../components/SEOHead.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { bestSellers } from '../data/products.jsx';
import { api } from '../lib/api.js';
import { productsFromApi } from '../lib/catalog.js';
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
  const [live, setLive] = useState(false);

  const [slide, setSlide] = useState(0);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    api.categories()
      .then((d) => setCats(d.results || d))
      .catch(() => setCats([]));

    api.products({ page_size: HERO_SLIDES })
      .then((d) => {
        const items = productsFromApi(d);
        if (items.length) { setHeroProducts(items); setSlide(0); }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.products({ page_size: 8, category: tab || undefined })
      .then((d) => {
        if (!alive) return;
        setProducts(productsFromApi(d));
        setLive(true);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tab]);

  const tabs = [{ slug: '', name: t('home.bestSellers.all') },
    ...cats.slice(0, 3).map((c) => ({ slug: c.slug, name: c.name }))];

  const slides = heroProducts.slice(0, HERO_SLIDES);
  const featured = slides[slide] || slides[0];
  const step = (d) => setSlide((s) => (s + d + slides.length) % (slides.length || 1));

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
    { av: 'M', text: t('home.testimonials.t3'), name: 'Mei L.', loc: 'Vancouver, Canada', rating: 4.5 },
  ];

  return (
    <>
      <SEOHead
        title="Accessoires de Mariage & Haute Coiffure Chinoise"
        description="Collection exclusive d'accessoires de mariage d'inspiration traditionnelle chinoise et occidentale. Vente au détail et tarifs professionnels B2B."
        schema={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Maison Lian",
          "url": "https://maisonlian.com",
          "logo": "https://maisonlian.com/assets/hero.png"
        }}
      />
      {/* HERO */}
      <section className="uee-hero">
        <button type="button" className="slider-arrow left" aria-label={t('home.hero.previous')}
          onClick={() => step(-1)}>
          <IconChevronLeft />
        </button>
        <button type="button" className="slider-arrow right" aria-label={t('home.hero.next')}
          onClick={() => step(1)}>
          <IconChevronRight />
        </button>
        <div className="container">
          <div>
            <span className="sale-tag">{t('home.hero.badge')}</span>
            <h1>{t('home.hero.title1')} <em>&amp;</em> {t('home.hero.title2')}</h1>
            <p>{featured ? featured.name : t('home.hero.subtitle')}</p>
            <div className="uee-hero-cta">
              <Link to={featured ? `/produit/${featured.slug}` : '/boutique'} className="btn-primary">
                {t('home.hero.buyNow')}
              </Link>
              <Link to="/pro" className="btn-outline">{t('home.hero.wholesalePrices')}</Link>
            </div>
          </div>
          <div className="uee-hero-art">
            <div className="disc">
              {featured?.image ? (
                <img className="hero-photo" src={featured.image} alt={featured.name} />
              ) : featured?.figure || (
                <svg className="figure" viewBox="0 0 200 220" fill="none" stroke="#B91C14" strokeWidth="1.4">
                  <path d="M100 20 C 75 55, 60 110, 100 165 C 140 110, 125 55, 100 20 Z"/>
                  <path d="M100 165 L 100 205" strokeWidth="2"/>
                  <path d="M78 85 C 62 78, 48 85, 46 105"/>
                  <path d="M122 85 C 138 78, 152 85, 154 105"/>
                </svg>
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
              aria-label={`${i + 1}`} onClick={() => setSlide(i)} />
          ))}
        </div>
      </section>

      {/* USP */}
      <section className="usp-row">
        <div className="container usp-grid">
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
      </section>

      {/* MOMENTS */}
      <section className="uee-section">
        <div className="container">
          <div className="uee-section-head"><h2>{t('home.moments.heading')}</h2></div>
          <div className="cat-grid">
            {shelves.map((m) => (
              <Link
                className="cat-item"
                to={m.slug ? `/boutique?category=${m.slug}` : '/boutique'}
                key={m.slug || m.name}
              >
                <span className="ci-icon">{m.icon}</span>
                <span className="ci-name">{m.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* MEILLEURES VENTES */}
      <section className="uee-section" style={{ background: '#fff' }}>
        <div className="container">
          <div className="uee-section-head">
            <h2>{t('home.bestSellers.heading')}</h2>
            <div className="uee-tabs">
              {tabs.map((c) => (
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
          <div className="uee-product-grid">
            {products.map((p) => (
              <ProductCard key={p.slug} product={p} showStars={!live} />
            ))}
          </div>
          {loading && products.length === 0 && (
            <p className="uee-grid-note">{t('common.loading')}</p>
          )}
          {!loading && products.length === 0 && (
            <p className="uee-grid-note">{t('home.bestSellers.empty')}</p>
          )}
        </div>
      </section>

      {/* PROMO BANNER */}
      <section className="uee-section">
        <div className="container">
          <div className="promo-banner">
            <div>
              <h3>{t('home.promo.title')}</h3>
              <p>{t('home.promo.text')}</p>
              <div className="promo-countdown">
                <div><div className="cd-num">03</div><div className="cd-label">{t('home.promo.days')}</div></div>
                <div><div className="cd-num">14</div><div className="cd-label">{t('home.promo.hours')}</div></div>
                <div><div className="cd-num">52</div><div className="cd-label">{t('home.promo.min')}</div></div>
              </div>
            </div>
            <Link to="/pro" className="btn-primary">{t('home.promo.createPro')}</Link>
          </div>
        </div>
      </section>

      {/* TÉMOIGNAGES */}
      <section className="uee-section" style={{ background: '#fff' }}>
        <div className="container">
          <div className="uee-section-head"><h2>{t('home.testimonials.heading')}</h2></div>
          <div className="testi-grid">
            {testimonials.map((tm) => (
              <div className="testi-card" key={tm.name}>
                <Stars value={tm.rating} />
                <p className="t-text">{tm.text}</p>
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

      {/* TRUST / PAYMENTS */}
      <section className="trust-section">
        <div className="container trust-flex">
          <div className="trust-badges">
            <span className="trust-badge"><IconShield />{t('home.trust.secure')}</span>
            <span className="trust-badge"><IconTruck />{t('home.trust.shipping')}</span>
            <span className="trust-badge"><IconCheck />{t('home.trust.returns')}</span>
          </div>
          <div className="pay-icons">
            <span className="pi">VISA</span><span className="pi">MC</span><span className="pi">PayPal</span><span className="pi">Stripe</span><span className="pi">AMEX</span>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="uee-newsletter">
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
    </>
  );
}
