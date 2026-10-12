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
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || (user?.email ? user.email.split('@')[0] : 'Chère Cliente');

  return (
    <div className="acc-dashboard">
      {/* =========================================================================
          HERO DE CONCIERGERIE & BIENVENUE CLIENT
          ========================================================================= */}
      <section className="acc-hero">
        <div className="acc-hero-copy">
          <span className="eyebrow">✦ ESPACE CONCIERGERIE NUPTIALE ✦</span>
          <h1>
            Bienvenue dans votre Espace, <span>{user?.first_name || fullName}</span>
          </h1>
          <p>
            Retrouvez vos sélections de parures de mariage, le suivi en direct de vos commandes
            d'exception et vos avantages privilégiés Maison Lián.
          </p>
          <div className="hero-badges">
            <span className="hero-badge">Expédition Sécurisée 48h</span>
            <span className="hero-badge muted">
              {isPro ? 'Partenaire Grossiste Certifié' : 'Compte Privilège Nuptial'}
            </span>
            <span className="hero-badge accent">Conseillers Dédiés 7j/7</span>
          </div>
        </div>

        <div className="acc-hero-panel">
          <div className="mini-pill">
            <span className="mini-dot" />
            Compte vérifié &amp; actif
          </div>
          <div className="hero-metric">
            <strong>{isPro ? 'B2B Pro' : 'Privilège'}</strong>
            <span>{isPro ? 'Tarifs Grossiste Actifs' : 'Membre Maison Lián'}</span>
          </div>
          <div className="acc-hero-actions">
            <Link to="/compte/boutique" className="btn-premium">
              Explorer la boutique ➔
            </Link>
            <Link to="/compte/profil" className="btn-secondary">
              Gérer mon profil
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
            <span className="stat-label">Panier en cours</span>
            <strong>{cartCount}</strong>
            <small>{cartCount > 0 ? `${cartCount} article(s) à valider` : 'Votre panier est vide'}</small>
          </div>
        </Link>

        <Link to="/compte/favoris" className="acc-stat-card stat-fav">
          <div className="stat-icon"><IconHeart /></div>
          <div className="stat-copy">
            <span className="stat-label">Mes Favoris</span>
            <strong>{wishCount}</strong>
            <small>{wishCount > 0 ? `${wishCount} pièce(s) sauvegardée(s)` : 'Aucun favori enregistré'}</small>
          </div>
        </Link>

        <Link to="/compte/commandes" className="acc-stat-card stat-cart" style={{ borderColor: 'rgba(212, 175, 55, 0.2)' }}>
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #FAF4E8, #F5ECE0)' }}>
            <IconPackage />
          </div>
          <div className="stat-copy">
            <span className="stat-label">Mes Commandes</span>
            <strong>Suivi</strong>
            <small>Historique &amp; livraisons</small>
          </div>
        </Link>

        <Link to={isPro ? '/compte/pro' : '/compte/profil'} className="acc-stat-card stat-account">
          <div className="stat-icon"><IconShield /></div>
          <div className="stat-copy">
            <span className="stat-label">Statut Client</span>
            <strong style={{ fontSize: 16 }}>{isPro ? 'Grossiste B2B' : 'Particulier'}</strong>
            <small>{isPro ? 'Remises jusqu’à -40%' : 'Avantages cérémonie'}</small>
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
            <h2>Profil &amp; Coordonnées</h2>
            <span className={`pill ${isPro ? 'ship' : 'paid'}`}>
              {isPro ? 'Compte Professionnel B2B' : 'Client Privilège'}
            </span>
          </div>

          <div className="profile-preview">
            <div className="avatar-ring">
              {(fullName || 'C').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3>{fullName}</h3>
              <p>{user?.email || 'Aucune adresse e-mail'}</p>
            </div>
          </div>

          <div className="info-grid compact-grid" style={{ marginTop: 24 }}>
            <div className="info-item">
              <div className="lbl">Nom du compte</div>
              <div className="vlu">{fullName}</div>
            </div>
            <div className="info-item">
              <div className="lbl">Adresse e-mail</div>
              <div className="vlu">{user?.email || '—'}</div>
            </div>
            <div className="info-item">
              <div className="lbl">Méthode de connexion</div>
              <div className="vlu">{user?.auth_provider === 'GOOGLE' ? 'Compte Google vérifié' : 'E-mail & mot de passe'}</div>
            </div>
            <div className="info-item">
              <div className="lbl">Statut d'accès</div>
              <div className="vlu">{isPro ? 'Professionnel (Remises appliquées)' : 'Particulier (Vente au détail)'}</div>
            </div>
            {isPro && (
              <div className="info-item full-width">
                <div className="lbl">Société / Boutique</div>
                <div className="vlu">{profile?.company_name || '—'}</div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #ECE7DE' }}>
            <Link to="/compte/profil" className="ml-category-cta">
              Modifier mes informations personnelles ➔
            </Link>
          </div>
        </div>

        {/* CARTE ACTIONS RAPIDES */}
        <div className="acc-card acc-card-side">
          <div className="card-head">
            <h2>Actions Conciergerie</h2>
          </div>

          <div className="quick-list">
            <Link to="/compte/commandes" className="quick-item">
              <span className="quick-icon"><IconPackage /></span>
              <span>
                <strong>Mes Commandes &amp; Livraisons</strong>
                <small>Suivre l'acheminement et factures</small>
              </span>
            </Link>

            <Link to="/compte/boutique" className="quick-item">
              <span className="quick-icon"><IconStore /></span>
              <span>
                <strong>Catalogue de la Maison</strong>
                <small>Explorer nos nouvelles créations</small>
              </span>
            </Link>

            <Link to="/contact" className="quick-item">
              <span className="quick-icon"><IconChat /></span>
              <span>
                <strong>Contacter l'Atelier</strong>
                <small>Conseils mariée &amp; sur-mesure</small>
              </span>
            </Link>

            <Link to="/compte/pro" className="quick-item">
              <span className="quick-icon"><IconShield /></span>
              <span>
                <strong>Espace Grossiste &amp; B2B</strong>
                <small>{isPro ? 'Grilles tarifaires actives' : 'Créer un compte revendeur'}</small>
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
          <h2>Garanties &amp; Engagements Maison Lián</h2>
          <span className="muted-badge">Sérénité Cérémonie</span>
        </div>

        <div className="checklist">
          <div className="check-item">
            <span className="check-icon"><IconCheck /></span>
            <div>
              <strong>Écrin Signature &amp; Emballage Cadeau Offert</strong>
              <small>Chaque bijou est soigneusement disposé dans son coffret en velours prêt-à-offrir avec ruban de satin.</small>
            </div>
          </div>

          <div className="check-item">
            <span className="check-icon"><IconCheck /></span>
            <div>
              <strong>Certificat d'Authenticité &amp; Dorure 18K</strong>
              <small>Chaque pièce est contrôlée méticuleusement à l'atelier avant expédition sous 48h.</small>
            </div>
          </div>

          <div className="check-item">
            <span className="check-icon"><IconCheck /></span>
            <div>
              <strong>Retours &amp; Échanges sous 30 Jours</strong>
              <small>Ajustez en toute tranquillité vos accessoires pour harmoniser votre tenue et coiffure de mariée.</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
