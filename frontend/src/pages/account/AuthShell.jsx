import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import { IconArrowLeft, IconShield } from '../../components/icons.jsx';

export default function AuthShell({ activeTab = 'connexion', children }) {
  const { t } = useTranslation();

  return (
    <div className="ml-auth-page">
      {/* Barre supérieure de marque */}
      <header className="ml-auth-header">
        <Link to="/" className="ml-auth-brand">
          <span className="brand-logo-mark">ML</span>
          <span className="brand-title">MAISON <span>LIÁN</span></span>
        </Link>
        <Link to="/" className="ml-auth-back-link">
          <IconArrowLeft />
          <span>{t('auth.backToShop', 'Back to shop')}</span>
        </Link>
      </header>

      {/* Contenu principal divisé (Visuel prestige + Formulaire) */}
      <main className="ml-auth-main">
        <div className="ml-auth-split">
          {/* Panneau de gauche : Prestige et engagements */}
          <div className="ml-auth-promo-side">
            <div>
              <span className="ml-auth-promo-badge">{t('auth.brandBadge', '✦ FINE BRIDAL JEWELRY HOUSE ✦')}</span>
              <h2>{t('auth.title', 'Your Maison Lián Privilege Area')}</h2>
              <p>
                {t('auth.subtitle', 'The digital haven dedicated to your wedding. Track your orders live, find your favorite creations and enjoy personalized advice.')}
              </p>

              <img
                src="/images/hero_phoenix_crown.jpg"
                alt={t('auth.imgAlt', 'Maison Lián Imperial Bridal Crown')}
                className="ml-auth-img-preview"
              />

              <div className="ml-auth-perks">
                <div className="ml-auth-perk">
                  <span className="dot">✓</span>
                  <span>{t('auth.perk1', 'Careful shipping tracking & express 48h delivery')}</span>
                </div>
                <div className="ml-auth-perk">
                  <span className="dot">✓</span>
                  <span>{t('auth.perk2', 'Signature velvet case and certificate of authenticity included')}</span>
                </div>
                <div className="ml-auth-perk">
                  <span className="dot">✓</span>
                  <span>{t('auth.perk3', 'Tailored assistance for your wedding preparations 7 days a week')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Panneau de droite : Formulaire */}
          <div className="ml-auth-form-side">
            <div className="ml-auth-tabs">
              <Link to="/compte/connexion" className={activeTab === 'connexion' ? 'active' : ''}>
                {t('auth.loginTab', 'Sign In')}
              </Link>
              <Link to="/compte/inscription" className={activeTab === 'inscription' ? 'active' : ''}>
                {t('auth.registerTab', 'Create Account')}
              </Link>
            </div>

            {children}

            <div className="ml-auth-security-badge">
              <IconShield />
              <span>{t('auth.sslBadge', '100% secure connection • 256-bit SSL encryption')}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

AuthShell.propTypes = {
  activeTab: PropTypes.string,
  children: PropTypes.node.isRequired,
};
