import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth.js';
import {
  IconPackage, IconUser, IconHeart, IconStore, IconArrowLeft, IconPdf, IconLock,
} from '../../components/icons.jsx';

// Coquille autonome de l'espace client : en-tête et navigation propres,
// indépendants de la boutique (comme l'administration sur /gestion).
export default function AccountLayout() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const name = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
    : '';
  const initial = (name || 'C').charAt(0).toUpperCase();
  const isPro = user?.profile?.account_type === 'WHOLESALE';

  const signOut = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const link = ({ isActive }) => (isActive ? 'active' : undefined);

  return (
    <div className="acc-shell">
      <header className="acc-top">
        <div className="acc-top-inner">
          <Link to="/" className="acc-logo">
            <span className="mark">ML</span>
            <span className="word">MAISON <span>LIÁN</span></span>
          </Link>

          <Link to="/" className="back"><IconArrowLeft />Retour à la boutique</Link>

          <div className="acc-user">
            <span className="av">{initial}</span>
            <div className="who">
              <b>{name}</b>
              <span>{isPro ? 'Compte professionnel' : 'Compte particulier'}</span>
            </div>
            <button type="button" className="acc-logout" onClick={signOut} title="Se déconnecter">
              <IconLock />
            </button>
          </div>
        </div>
      </header>

      <div className="acc-body">
        <nav className="acc-nav">
          <NavLink to="/compte" end className={link}><IconUser />Vue d'ensemble</NavLink>
          <NavLink to="/compte/commandes" className={link}><IconPackage />Mes commandes</NavLink>
          <NavLink to="/compte/devis" className={link}><IconPdf />Mes devis</NavLink>
          <NavLink to="/compte/favoris" className={link}><IconHeart />Mes favoris</NavLink>
          <div className="sep" />
          <NavLink to="/compte/profil" className={link}><IconUser />Mon profil</NavLink>
          <NavLink to="/compte/pro" className={link}><IconStore />Accès grossiste</NavLink>
        </nav>

        <main><Outlet /></main>
      </div>
    </div>
  );
}
