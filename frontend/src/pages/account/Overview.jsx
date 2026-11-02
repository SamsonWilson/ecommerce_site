import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/auth.js';
import { useCart } from '../../store/cart.js';
import { useWishlistCount } from '../../store/wishlist.js';
import {
  IconBag, IconCheck, IconHeart, IconPackage, IconShield, IconStore, IconChat,
} from '../../components/icons.jsx';

export default function Overview() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);
  const cartCount = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const wishCount = useWishlistCount();

  const profile = user?.profile;
  const isPro = profile?.account_type === 'WHOLESALE';
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || (user?.email ? user.email.split('@')[0] : t('account.defaultClient', 'Client'));

  return (
    <div className="acc-dashboard">
      {/* =========================================================================
          HERO DE CONCIERGERIE & BIENVENUE CLIENT
          ========================================================================= */}
      <section className="acc-hero">
        <div className="acc-hero-copy">
          <span className="eyebrow">{t('account.overview.conciergeEyebrow', '✦ BRIDAL CONCIERGE AREA ✦')}</span>
          <h1>
            {t('account.overview.welcomeTitle', { name: user?.first_name || fullName, defaultValue: `Welcome to your space, ${user?.first_name || fullName}` })}
          </h1>
          <p>
            {t('account.overview.welcomeSub', 'Find your bridal jewelry selections, live order tracking, and exclusive Maison Lián benefits.')}
          </p>
          <div className="hero-badges">
            <span className="hero-badge">{t('account.overview.badgeDelivery', 'Secure 48h Shipping')}</span>
            <span className="hero-badge muted">
              {isPro ? t('account.overview.badgePro', 'Certified Wholesale Partner') : t('account.overview.badgeRetail', 'Bridal Privilege Account')}
            </span>
            <span className="hero-badge accent">{t('account.overview.badgeAdvisors', 'Dedicated Advisors 7d/7')}</span>
          </div>
        </div>

        <div className="acc-hero-panel">
          <div className="mini-pill">
            <span className="mini-dot" />
            {t('account.overview.verifiedActive', 'Verified & active account')}
          </div>
          <div className="hero-metric">
            <strong>{isPro ? t('account.overview.statusB2B', 'Wholesale B2B') : t('account.overview.privilegeClientBadge', 'Privilege Customer')}</strong>
            <span>{isPro ? t('account.overview.proRateActive', 'Wholesale Rates Active') : t('account.overview.memberTitle', 'Maison Lián Member')}</span>
          </div>
          <div className="acc-hero-actions">
            <Link to="/compte/boutique" className="btn-premium">
              {t('account.overview.exploreShopBtn', 'Explore the shop ➔')}
            </Link>
            <Link to="/compte/profil" className="btn-secondary">
              {t('account.overview.manageProfileBtn', 'Manage my profile')}
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          GRILLE DE STATISTIQUES & ACCÈS RAPIDES
          ========================================================================= */}
      <div className="acc-stat-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <Link to="/compte/boutique" className="acc-stat-card stat-cart">
          <div className="stat-icon"><IconBag /></div>
          <div className="stat-copy">
            <span className="stat-label">{t('account.overview.cartLabel', 'Current Cart')}</span>
            <strong>{cartCount}</strong>
            <small>{cartCount > 0 ? t('account.overview.cartItemsToValidate', { count: cartCount, defaultValue: `${cartCount} item(s) to checkout` }) : t('account.overview.cartEmpty', 'Your cart is empty')}</small>
          </div>
        </Link>

        <Link to="/compte/favoris" className="acc-stat-card stat-fav">
          <div className="stat-icon"><IconHeart /></div>
          <div className="stat-copy">
            <span className="stat-label">{t('account.overview.wishlistLabel', 'My Wishlist')}</span>
            <strong>{wishCount}</strong>
            <small>{wishCount > 0 ? t('account.overview.wishlistSaved', { count: wishCount, defaultValue: `${wishCount} piece(s) saved` }) : t('account.overview.noWishlist', 'No favorites saved')}</small>
          </div>
        </Link>

        <Link to="/compte/commandes" className="acc-stat-card stat-cart" style={{ borderColor: 'rgba(212, 175, 55, 0.2)' }}>
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #FAF4E8, #F5ECE0)' }}>
            <IconPackage />
          </div>
          <div className="stat-copy">
            <span className="stat-label">{t('account.overview.ordersLabel', 'My Orders')}</span>
            <strong>{t('account.overview.ordersTrack', 'Tracking')}</strong>
            <small>{t('account.overview.ordersHistory', 'History & deliveries')}</small>
          </div>
        </Link>

        <Link to={isPro ? '/compte/pro' : '/compte/profil'} className="acc-stat-card stat-account">
          <div className="stat-icon"><IconShield /></div>
          <div className="stat-copy">
            <span className="stat-label">{t('account.overview.statusLabel', 'Client Status')}</span>
            <strong style={{ fontSize: 16 }}>{isPro ? t('account.overview.statusB2B', 'Wholesale B2B') : t('account.overview.statusRetail', 'Retail Customer')}</strong>
            <small>{isPro ? t('account.overview.discountsUpTo40', 'Discounts up to -40%') : t('account.overview.ceremonyPerks', 'Ceremony benefits')}</small>
          </div>
        </Link>
      </div>

      {/* =========================================================================
          BLOC CENTRAL : PROFIL & ACTIONS CONCIERGERIE
          ========================================================================= */}
      <div className="acc-content-grid">
        {/* CARTE PROFIL & COORDONNÉES */}
        <div className="acc-card acc-card-main">
          <div className="card-head">
            <h2>{t('account.overview.profileDetailsTitle', 'Profile & Details')}</h2>
            <span className={`pill ${isPro ? 'ship' : 'paid'}`}>
              {isPro ? t('account.overview.proAccountBadge', 'B2B Wholesale Account') : t('account.overview.privilegeClientBadge', 'Privilege Customer')}
            </span>
          </div>

          <div className="profile-preview">
            <div className="avatar-ring">
              {(fullName || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3>{fullName}</h3>
              <p>{user?.email || '—'}</p>
            </div>
          </div>

          <div className="info-grid compact-grid" style={{ marginTop: 24 }}>
            <div className="info-item">
              <div className="lbl">{t('account.overview.accountName', 'Account Name')}</div>
              <div className="vlu">{fullName}</div>
            </div>
            <div className="info-item">
              <div className="lbl">{t('account.overview.emailAddress', 'Email address')}</div>
              <div className="vlu">{user?.email || '—'}</div>
            </div>
            <div className="info-item">
              <div className="lbl">{t('account.overview.loginMethod', 'Login method')}</div>
              <div className="vlu">{user?.auth_provider === 'GOOGLE' ? t('account.overview.googleVerified', 'Verified Google Account') : t('account.overview.emailPassword', 'Email & password')}</div>
            </div>
            <div className="info-item">
              <div className="lbl">{t('account.overview.accessStatus', 'Access status')}</div>
              <div className="vlu">{isPro ? t('account.overview.proApplied', 'Professional (Discounts applied)') : t('account.overview.retailStandard', 'Retail customer (Standard)')}</div>
            </div>
            {isPro && (
              <div className="info-item full-width">
                <div className="lbl">{t('account.overview.companyLabel', 'Company / Boutique')}</div>
                <div className="vlu">{profile?.company_name || '—'}</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #ECE7DE' }}>
            <Link to="/compte/profil" className="ml-category-cta">
              {t('account.overview.editProfileLink', 'Edit my personal details ➔')}
            </Link>
          </div>
        </div>

        {/* CARTE ACTIONS RAPIDES */}
        <div className="acc-card acc-card-side">
          <div className="card-head">
            <h2>{t('account.overview.conciergeActionsTitle', 'Concierge Actions')}</h2>
          </div>

          <div className="quick-list">
            <Link to="/compte/commandes" className="quick-item">
              <span className="quick-icon"><IconPackage /></span>
              <span>
                <strong>{t('account.overview.actionOrdersTitle', 'My Orders & Deliveries')}</strong>
                <small>{t('account.overview.actionOrdersSub', 'Track shipments and invoices')}</small>
              </span>
            </Link>

            <Link to="/compte/boutique" className="quick-item">
              <span className="quick-icon"><IconStore /></span>
              <span>
                <strong>{t('account.overview.actionCatalogTitle', 'Maison Lián Catalog')}</strong>
                <small>{t('account.overview.actionCatalogSub', 'Explore our new creations')}</small>
              </span>
            </Link>

            <Link to="/contact" className="quick-item">
              <span className="quick-icon"><IconChat /></span>
              <span>
                <strong>{t('account.overview.actionContactTitle', 'Contact the Atelier')}</strong>
                <small>{t('account.overview.actionContactSub', 'Bridal advice & custom orders')}</small>
              </span>
            </Link>

            <Link to="/compte/pro" className="quick-item">
              <span className="quick-icon"><IconShield /></span>
              <span>
                <strong>{t('account.overview.actionProTitle', 'Wholesale & B2B Space')}</strong>
                <small>{isPro ? t('account.overview.actionProSubActive', 'Active wholesale pricing') : t('account.overview.actionProSubCreate', 'Create a reseller account')}</small>
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ENGAGEMENTS & SÉRÉNITÉ MAISON LIÁN
          ========================================================================= */}
      <div className="acc-card acc-card-bottom">
        <div className="card-head">
          <h2>{t('account.overview.guaranteesTitle', 'Maison Lián Guarantees & Commitments')}</h2>
          <span className="muted-badge">{t('account.overview.serenityBadge', 'Ceremony Peace of Mind')}</span>
        </div>

        <div className="checklist">
          <div className="check-item">
            <span className="check-icon"><IconCheck /></span>
            <div>
              <strong>{t('account.overview.g1Title', 'Complimentary Signature Gift Box & Wrapping')}</strong>
              <small>{t('account.overview.g1Text', 'Each piece of jewelry is carefully arranged in its ready-to-gift velvet presentation box with a satin ribbon.')}</small>
            </div>
          </div>

          <div className="check-item">
            <span className="check-icon"><IconCheck /></span>
            <div>
              <strong>{t('account.overview.g2Title', 'Certificate of Authenticity & 18K Gilding')}</strong>
              <small>{t('account.overview.g2Text', 'Each piece is meticulously inspected in our workshop before dispatch within 48h.')}</small>
            </div>
          </div>

          <div className="check-item">
            <span className="check-icon"><IconCheck /></span>
            <div>
              <strong>{t('account.overview.g3Title', '30-Day Returns & Exchanges')}</strong>
              <small>{t('account.overview.g3Text', 'Adjust your accessories in complete peace of mind to harmonize your wedding dress and bridal hairstyle.')}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
