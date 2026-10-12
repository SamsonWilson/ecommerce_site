import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth.js';
import { useCart } from '../../store/cart.js';
import { useWishlistCount } from '../../store/wishlist.js';
import {
  IconPackage, IconUser, IconHeart, IconStore, IconArrowLeft,
} from '../../components/icons.jsx';

export default function AccountLayout() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const cartCount = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const wishCount = useWishlistCount();

  const name = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
    : 'Client';
  const initial = (name || 'C').charAt(0).toUpperCase();
  const isPro = user?.profile?.account_type === 'WHOLESALE';

  const signOut = async () => {
    await logout();
    navigate('/compte/connexion', { replace: true });
  };

  const link = ({ isActive }) => (isActive ? 'active' : undefined);

  return (
    <div className="acc-shell">
      {/* En-tête de l'espace client */}
      <header className="acc-top">
        <div className="acc-top-inner">
          <Link to="/compte" className="acc-logo">
            <span className="mark">ML</span>
            <span className="word">MAISON <span>LIÁN</span></span>
          </Link>

          <Link to="/" className="back">
            <IconArrowLeft />
            <span>Retourner à la boutique</span>
          </Link>

          <div className="acc-user">
            <span className="av">{initial}</span>
            <div className="who">
              <b>{name}</b>
              <span>{isPro ? 'Compte professionnel B2B' : 'Compte particulier'}</span>
            </div>
            <button
              type="button"
              className="acc-logout"
              onClick={signOut}
              title="Se déconnecter"
              aria-label="Se déconnecter"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 17, height: 17 }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Barre de navigation interne de l'espace client */}
      <nav className="acc-nav-bar">
        <div className="acc-nav-inner">
          <NavLink to="/compte" end className={link}>
            <IconUser />
            <span>Vue d'ensemble</span>
          </NavLink>
          <NavLink to="/compte/boutique" className={link}>
            <IconStore />
            <span>Boutique</span>
            {cartCount > 0 && (
              <span style={{ background: 'var(--brand-red)', color: '#fff', fontSize: '10.5px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', marginLeft: 4 }}>
                {cartCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/compte/commandes" className={link}>
            <IconPackage />
            <span>Mes commandes</span>
          </NavLink>
          <NavLink to="/compte/favoris" className={link}>
            <IconHeart />
            <span>Mes favoris</span>
            {wishCount > 0 && (
              <span style={{ background: 'var(--gold, #C5A059)', color: '#fff', fontSize: '10.5px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', marginLeft: 4 }}>
                {wishCount}
              </span>
            )}
          </NavLink>
          <div className="sep" />
          <NavLink to="/compte/profil" className={link}>
            <IconUser />
            <span>Mon profil</span>
          </NavLink>
          <NavLink to="/compte/pro" className={link}>
            <IconStore />
            <span>Accès grossiste B2B</span>
          </NavLink>
        </div>
      </nav>

      {/* Corps du tableau de bord */}
      <div className="acc-body">
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
