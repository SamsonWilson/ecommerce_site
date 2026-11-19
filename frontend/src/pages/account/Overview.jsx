import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/auth.js';
import { useCart } from '../../store/cart.js';
import { useWishlistCount } from '../../store/wishlist.js';
import {
  IconBag, IconCheck, IconHeart, IconPackage, IconShield, IconStore, IconUser, IconChat,
} from '../../components/icons.jsx';

export default function Overview() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);
  const cartCount = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const wishCount = useWishlistCount();

  const profile = user?.profile;
  const isPro = profile?.account_type === 'WHOLESALE';
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || (user?.email ? user.email.split('@')[0] : t('dash.dearClient'));

  return (
    <div className="acc-dashboard">
      {/* =========================================================================
          HERO DE CONCIERGERIE ET BIENVENUE CLIENT
          ========================================================================= */}
      <section className="acc-hero">
        <div className="acc-hero-copy">
          <span className="eyebrow">{t('dash.eyebrow')}</span>
          <h1>
            {t('dash.welcome')} <span>{user?.first_name || fullName}</span>
          </h1>
          <p>
            {t('dash.intro')}
          </p>
          <div className="hero-badges">
            <span className="hero-badge">{t('dash.badgeShipping')}</span>
            <span className="hero-badge muted">
              {isPro ? t('dash.certifiedPartner') : t('dash.privilegeAccount')}
            </span>
            <span className="hero-badge accent">{t('dash.badgeAdvisors')}</span>
          </div>
        </div>

        <div className="acc-hero-panel">
          <div className="mini-pill">
            <span className="mini-dot" />
            {t('dash.verified')}
          </div>
          <div className="hero-metric">
            <strong>{isPro ? 'B2B Pro' : t('dash.privilege')}</strong>
            <span>{isPro ? t('dash.wholesaleRates') : t('dash.member')}</span>
          </div>
          <div className="acc-hero-actions">
            <Link to="/compte/boutique" className="btn-premium">
              {t('dash.exploreShop')}
            </Link>
            <Link to="/compte/profil" className="btn-secondary">
              {t('dash.manageProfile')}
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          GRILLE DE STATISTIQUES ET ACCÈS RAPIDES
          ========================================================================= */}
      <div className="acc-stat-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <Link to="/compte/boutique" className="acc-stat-card stat-cart">
          <div className="stat-icon"><IconBag /></div>
          <div className="stat-copy">
            <span className="stat-label">{t('dash.currentCart')}</span>
            <strong>{cartCount}</strong>
            <small>{cartCount > 0 ? t('dash.cartCount', { n: cartCount }) : t('common.emptyCart')}</small>
          </div>
        </Link>

        <Link to="/compte/favoris" className="acc-stat-card stat-fav">
          <div className="stat-icon"><IconHeart /></div>
          <div className="stat-copy">
            <span className="stat-label">{t('dash.favourites')}</span>
            <strong>{wishCount}</strong>
            <small>{wishCount > 0 ? t('dash.wishCount', { n: wishCount }) : t('dash.noFavourite')}</small>
          </div>
        </Link>

        <Link to="/compte/commandes" className="acc-stat-card stat-cart" style={{ borderColor: 'rgba(212, 175, 55, 0.2)' }}>
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #FAF4E8, #F5ECE0)' }}>
            <IconPackage />
          </div>
          <div className="stat-copy">
            <span className="stat-label">{t('account.myOrders')}</span>
            <strong>{t('dash.tracking')}</strong>
            <small>{t('dash.history')}</small>
          </div>
        </Link>

        <Link to={isPro ? '/compte/pro' : '/compte/profil'} className="acc-stat-card stat-account">
          <div className="stat-icon"><IconShield /></div>
          <div className="stat-copy">
            <span className="stat-label">{t('dash.clientStatus')}</span>
            <strong style={{ fontSize: 16 }}>{isPro ? t('dash.b2b') : t('dash.individual')}</strong>
            <small>{isPro ? t('dash.discounts') : t('dash.perks')}</small>
          </div>
        </Link>
      </div>

      {/* =========================================================================
          BLOC CENTRAL : PROFIL ET ACTIONS CONCIERGERIE
          ========================================================================= */}
      <div className="acc-content-grid">
        {/* CARTE PROFIL ET COORDONNÉES */}
        <div className="acc-card acc-card-main">
          <div className="card-head">
            <h2>{t('dash.profileTitle')}</h2>
            <span className={`pill ${isPro ? 'ship' : 'paid'}`}>
              {isPro ? t('layout.proAccount') : t('dash.privilegeClient')}
            </span>
          </div>

          <div className="profile-preview">
            <div className="avatar-ring">
              {(fullName || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3>{fullName}</h3>
              <p>{user?.email || t('dash.noEmail')}</p>
            </div>
          </div>

          <div className="info-grid compact-grid" style={{ marginTop: 24 }}>
            <div className="info-item">
              <div className="lbl">{t('dash.accountName')}</div>
              <div className="vlu">{fullName}</div>
            </div>
            <div className="info-item">
              <div className="lbl">{t('auth.email')}</div>
              <div className="vlu">{user?.email || '—'}</div>
            </div>
            <div className="info-item">
              <div className="lbl">{t('dash.loginMethod')}</div>
              <div className="vlu">{user?.auth_provider === 'GOOGLE' ? t('dash.googleAccount') : t('dash.emailPassword')}</div>
            </div>
            <div className="info-item">
              <div className="lbl">{t('dash.accessStatus')}</div>
              <div className="vlu">{isPro ? t('dash.proAccess') : t('dash.retailAccess')}</div>
            </div>
            {isPro && (
              <div className="info-item full-width">
                <div className="lbl">{t('dash.company')}</div>
                <div className="vlu">{profile?.company_name || '—'}</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #ECE7DE' }}>
            <Link to="/compte/profil" className="ml-category-cta">
              {t('dash.editDetails')}
            </Link>
          </div>
        </div>

        {/* CARTE ACTIONS RAPIDES */}
        <div className="acc-card acc-card-side">
          <div className="card-head">
            <h2>{t('dash.actions')}</h2>
          </div>

          <div className="quick-list">
            <Link to="/compte/commandes" className="quick-item">
              <span className="quick-icon"><IconPackage /></span>
              <span>
                <strong>{t('dash.ordersDeliveries')}</strong>
                <small>{t('dash.ordersHint')}</small>
              </span>
            </Link>

            <Link to="/compte/boutique" className="quick-item">
              <span className="quick-icon"><IconStore /></span>
              <span>
                <strong>{t('dash.catalog')}</strong>
                <small>{t('dash.catalogHint')}</small>
              </span>
            </Link>

            <Link to="/contact" className="quick-item">
              <span className="quick-icon"><IconChat /></span>
              <span>
                <strong>{t('dash.contact')}</strong>
                <small>{t('dash.contactHint')}</small>
              </span>
            </Link>

            <Link to="/compte/pro" className="quick-item">
              <span className="quick-icon"><IconShield /></span>
              <span>
                <strong>{t('dash.wholesale')}</strong>
                <small>{isPro ? t('dash.priceLists') : t('dash.createReseller')}</small>
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ENGAGEMENTS ET SÉRÉNITÉ MAISON LIÁN
          ========================================================================= */}
      <div className="acc-card acc-card-bottom">
        <div className="card-head">
          <h2>{t('dash.guarantees')}</h2>
          <span className="muted-badge">{t('dash.serenity')}</span>
        </div>

        <div className="checklist">
          <div className="check-item">
            <span className="check-icon"><IconCheck /></span>
            <div>
              <strong>{t('dash.g1')}</strong>
              <small>{t('dash.g1Text')}</small>
            </div>
          </div>

          <div className="check-item">
            <span className="check-icon"><IconCheck /></span>
            <div>
              <strong>{t('dash.g2')}</strong>
              <small>{t('dash.g2Text')}</small>
            </div>
          </div>

          <div className="check-item">
            <span className="check-icon"><IconCheck /></span>
            <div>
              <strong>{t('dash.g3')}</strong>
              <small>{t('dash.g3Text')}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
