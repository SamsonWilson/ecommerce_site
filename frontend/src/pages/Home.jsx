import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProductCard from '../components/ProductCard.jsx';
import { bestSellers } from '../data/products.jsx';
import {
  IconChevronLeft, IconChevronRight, IconTruck, IconCard, IconStore, IconChat,
  IconCeremony, IconGuests, IconBell, IconCamera, IconLayers, IconTag,
  IconShield, IconCheck, Stars,
} from '../components/icons.jsx';

export default function Home() {
  const { t } = useTranslation();

  const moments = [
    { icon: <IconCeremony />, name: t('home.moments.ceremony') },
    { icon: <IconGuests />, name: t('home.moments.reception') },
    { icon: <IconBell />, name: t('home.moments.dinner') },
    { icon: <IconCamera />, name: t('home.moments.photoshoot') },
    { icon: <IconLayers />, name: t('home.moments.chinese') },
    { icon: <IconTag />, name: t('home.moments.promotions') },
  ];

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
      {/* HERO */}
      <section className="uee-hero">
        <span className="slider-arrow left"><IconChevronLeft /></span>
        <span className="slider-arrow right"><IconChevronRight /></span>
        <div className="container">
          <div>
            <span className="sale-tag">{t('home.hero.badge')}</span>
            <h1>{t('home.hero.title1')} <em>&amp;</em> {t('home.hero.title2')}</h1>
            <p>{t('home.hero.subtitle')}</p>
            <div className="uee-hero-cta">
              <Link to="/produit/epingle-phenix-cinabre" className="btn-primary">{t('home.hero.buyNow')}</Link>
              <Link to="/pro" className="btn-outline">{t('home.hero.wholesalePrices')}</Link>
            </div>
          </div>
          <div className="uee-hero-art">
            <div className="disc">
              <svg className="figure" viewBox="0 0 200 220" fill="none" stroke="#B91C14" strokeWidth="1.4">
                <path d="M100 20 C 75 55, 60 110, 100 165 C 140 110, 125 55, 100 20 Z"/>
                <path d="M100 165 L 100 205" strokeWidth="2"/>
                <path d="M78 85 C 62 78, 48 85, 46 105"/>
                <path d="M122 85 C 138 78, 152 85, 154 105"/>
              </svg>
              <div className="price-float">
                <div className="pf-old">160 €</div>
                <div className="pf-new">128 €</div>
              </div>
            </div>
          </div>
        </div>
        <div className="slider-dots"><span className="active"></span><span></span><span></span></div>
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
            {moments.map((m) => (
              <Link className="cat-item" to="/boutique" key={m.name}>
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
              <button className="uee-tab active">{t('home.bestSellers.all')}</button>
              <button className="uee-tab">{t('home.bestSellers.ceremony')}</button>
              <button className="uee-tab">{t('home.bestSellers.chinese')}</button>
              <button className="uee-tab">{t('home.bestSellers.promo')}</button>
            </div>
          </div>
          <div className="uee-product-grid">
            {bestSellers.map((p) => (
              <ProductCard key={p.slug} product={p} showStars />
            ))}
          </div>
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
          <form className="uee-nl-form" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder={t('home.newsletter.placeholder')} />
            <button type="submit">{t('home.newsletter.subscribe')}</button>
          </form>
        </div>
      </section>
    </>
  );
}
