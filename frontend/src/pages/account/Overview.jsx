import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/auth.js';
import { useCart } from '../../store/cart.js';
import { useWishlistCount } from '../../store/wishlist.js';
import { IconBag, IconCheck, IconHeart, IconPackage, IconShield, IconStore, IconUser } from '../../components/icons.jsx';

export default function Overview() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);
  const cartCount = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const wishCount = useWishlistCount();

  const profile = user?.profile;
  const isPro = profile?.account_type === 'WHOLESALE';
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || t('account.defaultClient');
  const completion = 78;

  return (
    <div className="acc-dashboard">
      <section className="acc-hero">
        <div className="acc-hero-copy">
          <span className="eyebrow">{t('account.overview.eyebrow')}</span>
          <h1>{t('account.overview.greeting')} <span>{user?.first_name || t('account.defaultClient')}</span></h1>
          <p>{t('account.overview.summary')}</p>
          <div className="hero-badges">
            <span className="hero-badge">{t('account.overview.fastDelivery')}</span>
            <span className="hero-badge muted">{t('account.overview.accountType', { type: isPro ? t('account.overview.professional') : t('account.overview.standard') })}</span>
            <span className="hero-badge accent">{t('account.overview.security')}</span>
          </div>
        </div>

        <div className="acc-hero-panel">
          <div className="mini-pill">
            <span className="mini-dot" />
            {t('account.overview.upToDate')}
          </div>
          <div className="hero-metric">
            <strong>{Math.min(100, completion)}%</strong>
            <span>{t('account.overview.profileComplete')}</span>
          </div>
          <div className="acc-hero-actions">
            <Link to="/compte/boutique" className="btn-premium">{t('account.overview.continueShopping')}</Link>
            <Link to="/compte/profil" className="btn-secondary">{t('account.overview.myProfile')}</Link>
          </div>
        </div>
      </section>

      <div className="acc-stat-grid">
        <Link to="/compte/boutique" className="acc-stat-card stat-cart">
          <div className="stat-icon"><IconBag /></div>
          <div className="stat-copy">
            <span className="stat-label">{t('account.overview.cart')}</span>
            <strong>{cartCount}</strong>
            <small>{cartCount > 0 ? t('account.overview.cartItems') : t('account.overview.cartEmpty')}</small>
          </div>
        </Link>

        <Link to="/compte/favoris" className="acc-stat-card stat-fav">
          <div className="stat-icon"><IconHeart /></div>
          <div className="stat-copy">
            <span className="stat-label">{t('account.overview.favorites')}</span>
            <strong>{wishCount}</strong>
            <small>{wishCount > 0 ? t('account.overview.savedItems') : t('account.overview.noFavorites')}</small>
          </div>
        </Link>

        <Link to="/compte/profil" className="acc-stat-card stat-account">
          <div className="stat-icon"><IconUser /></div>
          <div className="stat-copy">
            <span className="stat-label">{t('account.overview.account')}</span>
            <strong>{profile?.account_type_display || t('account.overview.private')}</strong>
            <small>{isPro ? t('account.overview.proActive') : t('account.overview.standardAccount')}</small>
          </div>
        </Link>
      </div>

      <div className="acc-content-grid">
        <div className="acc-card acc-card-main">
          <div className="card-head">
            <h2>{t('account.overview.profileTitle')}</h2>
            <span className={`pill ${isPro ? 'ship' : 'paid'}`}>{isPro ? t('account.overview.professional') : t('account.overview.private')}</span>
          </div>

          <div className="profile-preview">
            <div className="avatar-ring">{(fullName || 'C').charAt(0).toUpperCase()}</div>
            <div>
              <h3>{fullName}</h3>
              <p>{user?.email || t('account.overview.noEmail')}</p>
            </div>
          </div>

          <div className="progress-block">
            <div className="progress-top">
              <span>{t('account.overview.profileProgress')}</span>
              <strong>{completion}%</strong>
            </div>
            <div className="progress-bar"><span style={{ width: `${completion}%` }} /></div>
          </div>

          <div className="info-grid compact-grid">
            <div className="info-item">
              <div className="lbl">{t('account.overview.fullName')}</div>
              <div className="vlu">{fullName}</div>
            </div>
            <div className="info-item">
              <div className="lbl">{t('account.overview.loginMethod')}</div>
              <div className="vlu">{user?.auth_provider === 'GOOGLE' ? t('account.overview.googleAccount') : t('account.overview.email')}</div>
            </div>
            {isPro && (
              <div className="info-item full-width">
                <div className="lbl">{t('account.overview.company')}</div>
                <div className="vlu">{profile?.company_name || '—'}</div>
              </div>
            )}
          </div>
        </div>

        <div className="acc-card acc-card-side">
          <div className="card-head">
            <h2>{t('account.overview.quickActions')}</h2>
          </div>

          <div className="quick-list">
            <Link to="/compte/commandes" className="quick-item">
              <span className="quick-icon"><IconPackage /></span>
              <span>
                <strong>{t('account.overview.myOrders')}</strong>
                <small>{t('account.overview.trackShipments')}</small>
              </span>
            </Link>

            <Link to="/compte/boutique" className="quick-item">
              <span className="quick-icon"><IconStore /></span>
              <span>
                <strong>{t('account.overview.shop')}</strong>
                <small>{t('account.overview.discoverNews')}</small>
              </span>
            </Link>

            <Link to="/compte/pro" className="quick-item">
              <span className="quick-icon"><IconShield /></span>
              <span>
                <strong>{t('account.overview.wholesaleAccess')}</strong>
                <small>{isPro ? t('account.overview.accountActivated') : t('account.overview.createPro')}</small>
              </span>
            </Link>
          </div>
        </div>
      </div>

      <div className="acc-card acc-card-bottom">
        <div className="card-head">
          <h2>{t('account.overview.reminder')}</h2>
          <span className="muted-badge">{t('account.overview.upToDateBadge')}</span>
        </div>

        <div className="checklist">
          <div className="check-item">
            <span className="check-icon"><IconCheck /></span>
            <div>
              <strong>{cartCount > 0 ? t('account.overview.cartCount', { count: cartCount }) : t('account.overview.cartReady')}</strong>
              <small>{t('account.overview.cartNote')}</small>
            </div>
          </div>

          <div className="check-item">
            <span className="check-icon"><IconCheck /></span>
            <div>
              <strong>{wishCount > 0 ? t('account.overview.wishlistCount', { count: wishCount }) : t('account.overview.noFavorites')}</strong>
              <small>{t('account.overview.favoriteNote')}</small>
            </div>
          </div>

          <div className="check-item">
            <span className="check-icon"><IconCheck /></span>
            <div>
              <strong>{isPro ? t('account.overview.wholesaleActive') : t('account.overview.standardPrivate')}</strong>
              <small>{t('account.overview.accountNote')}</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
