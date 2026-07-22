import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth.js';
import { I } from './icons.jsx';

// Navigation en deux pôles métier (B2C / B2B) + un socle commun.
const NAV = [
  {
    label: 'Pilotage',
    items: [{ to: '/gestion', end: true, icon: I.dashboard, name: 'Tableau de bord' }],
  },
  {
    label: 'Détail — B2C',
    items: [
      { to: '/gestion/commandes', icon: I.bag, name: 'Commandes' },
      { to: '/gestion/clients', icon: I.users, name: 'Clients' },
      { to: '/gestion/promotions', icon: I.percent, name: 'Promotions' },
    ],
  },
  {
    label: 'Gros — B2B',
    items: [
      { to: '/gestion/comptes-pro', icon: I.store, name: 'Comptes pro' },
      { to: '/gestion/paliers', icon: I.moq, name: 'Paliers tarifaires' },
      { to: '/gestion/devis', icon: I.quote, name: 'Devis' },
    ],
  },
  {
    label: 'Commun',
    items: [
      { to: '/gestion/produits', icon: I.tag, name: 'Catalogue' },
      { to: '/gestion/categories', icon: I.layers, name: 'Catégories' },
      { to: '/gestion/langues', icon: I.globe, name: 'Langues' },
      // Stratégie hybride : le CRUD lourd se fait dans Django Admin.
      { href: '/admin/', icon: I.settings, name: 'Django Admin', external: true },
    ],
  },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
    : 'Administrateur';
  const initial = (displayName || 'A').charAt(0).toUpperCase();

  const signOut = async () => {
    await logout();
    navigate('/gestion/connexion', { replace: true });
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="mark">ML</span>
          <span className="word">Maison Lián<small>Administration</small></span>
        </div>

        <nav className="admin-nav">
          {NAV.map((group) => (
            <div key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map((it) => (
                it.external ? (
                  <a key={it.href} href={it.href} target="_blank" rel="noreferrer">
                    {it.icon}{it.name}<span className="nav-ext">↗</span>
                  </a>
                ) : (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.end}
                    className={({ isActive }) => (isActive ? 'active' : undefined)}
                  >
                    {it.icon}{it.name}
                    {it.badge && <span className="nav-badge">{it.badge}</span>}
                  </NavLink>
                )
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <span className="av">{initial}</span>
          <div style={{ minWidth: 0 }}>
            <div className="name">{displayName}</div>
            <div className="role">Administration</div>
          </div>
          <button type="button" className="admin-logout" onClick={signOut} title="Se déconnecter">
            {I.logout}
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <div className="admin-topbar">
          <div className="admin-search">
            {I.search}
            <input type="text" placeholder="Rechercher une commande, un client, un produit..." />
          </div>
          <div className="admin-top-actions">
            <span className="admin-lang">🌐 FR</span>
            <span className="admin-bell-wrap">{I.bell}<span className="dot"></span></span>
            <div className="admin-profile"><span className="av">A</span></div>
          </div>
        </div>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
