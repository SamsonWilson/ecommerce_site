import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { IconArrowLeft, IconShield } from '../../components/icons.jsx';

export default function AuthShell({ activeTab = 'connexion', children }) {
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
          <span>Retourner à la boutique</span>
        </Link>
      </header>

      {/* Contenu principal divisé (Visuel prestige + Formulaire) */}
      <main className="ml-auth-main">
        <div className="ml-auth-split">
          {/* Panneau de gauche : Prestige et engagements */}
          <div className="ml-auth-promo-side">
            <div>
              <span className="ml-auth-promo-badge">✦ MAISON DE JOAILLERIE NUPTIALE ✦</span>
              <h2>Votre Espace Privilège Maison Lián</h2>
              <p>
                L'écrin numérique dédié à votre mariage. Suivez vos parures en direct,
                retrouvez vos créations favorites et bénéficiez de conseils personnalisés.
              </p>

              <img
                src="/images/hero_phoenix_crown.jpg"
                alt="Parure de mariage impériale Maison Lián"
                className="ml-auth-img-preview"
              />

              <div className="ml-auth-perks">
                <div className="ml-auth-perk">
                  <span className="dot">✓</span>
                  <span>Suivi d'expédition soigné &amp; livraison express 48h</span>
                </div>
                <div className="ml-auth-perk">
                  <span className="dot">✓</span>
                  <span>Écrin signature velours et certificat d'authenticité inclus</span>
                </div>
                <div className="ml-auth-perk">
                  <span className="dot">✓</span>
                  <span>Accompagnement sur-mesure pour vos préparatifs 7j/7</span>
                </div>
              </div>
            </div>
          </div>

          {/* Panneau de droite : Formulaire */}
          <div className="ml-auth-form-side">
            <div className="ml-auth-tabs">
              <Link to="/compte/connexion" className={activeTab === 'connexion' ? 'active' : ''}>
                Connexion
              </Link>
              <Link to="/compte/inscription" className={activeTab === 'inscription' ? 'active' : ''}>
                Créer un compte
              </Link>
            </div>

            {children}

            <div className="ml-auth-security-badge">
              <IconShield />
              <span>Connexion 100% sécurisée • Chiffrement SSL 256-bit</span>
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
