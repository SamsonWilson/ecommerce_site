import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/auth.js';
import { I } from './icons.jsx';

export default function AdminLayout() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const currentLang = (i18n.resolvedLanguage || 'fr').toUpperCase();

  const NAV = [
    {
      labelKey: 'admin.nav.management',
      defaultLabel: 'Pilotage',
      items: [{ to: '/gestion', end: true, icon: I.dashboard, nameKey: 'admin.nav.dashboard', defaultName: 'Tableau de bord', section: 'dashboard' }],
    },
    {
      labelKey: 'admin.nav.b2c',
      defaultLabel: 'Détail — B2C',
      items: [
        { to: '/gestion/commandes', icon: I.bag, nameKey: 'admin.nav.orders', defaultName: 'Commandes', section: 'orders' },
        { to: '/gestion/clients', icon: I.users, nameKey: 'admin.nav.customers', defaultName: 'Clients', section: 'customers' },
        { to: '/gestion/promotions', icon: I.percent, nameKey: 'admin.nav.promotions', defaultName: 'Promotions', section: 'promotions' },
      ],
    },
    {
      labelKey: 'admin.nav.b2b',
      defaultLabel: 'Gros — B2B',
      items: [
        { to: '/gestion/comptes-pro', icon: I.store, nameKey: 'admin.nav.proAccounts', defaultName: 'Comptes pro', section: 'b2b' },
        { to: '/gestion/paliers', icon: I.moq, nameKey: 'admin.nav.tiers', defaultName: 'Paliers tarifaires', section: 'b2b' },
        { to: '/gestion/devis', icon: I.quote, nameKey: 'admin.nav.quotes', defaultName: 'Devis', section: 'b2b' },
      ],
    },
    {
      labelKey: 'admin.nav.logistics',
      defaultLabel: 'Logistique & équipe',
      items: [
        { to: '/gestion/livraisons', icon: I.truck, nameKey: 'admin.nav.deliveries', defaultName: 'Livraisons', section: 'deliveries' },
        { to: '/gestion/equipe', icon: I.users, nameKey: 'admin.nav.team', defaultName: 'Équipe', section: 'staff' },
      ],
    },
    {
      labelKey: 'admin.nav.common',
      defaultLabel: 'Commun',
      items: [
        { to: '/gestion/produits', icon: I.tag, nameKey: 'admin.nav.catalog', defaultName: 'Catalogue', section: 'catalog' },
        { to: '/gestion/categories', icon: I.layers, nameKey: 'admin.nav.categories', defaultName: 'Catégories', section: 'catalog' },
        { to: '/gestion/langues', icon: I.globe, nameKey: 'admin.nav.languages', defaultName: 'Langues', section: 'catalog' },
        { href: '/admin/', icon: I.settings, nameKey: 'admin.nav.djangoAdmin', defaultName: 'Django Admin', external: true, section: 'settings' },
      ],
    },
  ];

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
    : 'Administrateur';
  const initial = (displayName || 'A').charAt(0).toUpperCase();

  const sections = user?.sections || [];
  const nav = NAV
    .map((group) => ({ ...group, items: group.items.filter((it) => sections.includes(it.section)) }))
    .filter((group) => group.items.length > 0);

  const signOut = async () => {
    await logout();
    navigate('/gestion/connexion', { replace: true });
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="mark">ML</span>
          <span className="word">
            Maison Lián
            <small>{t('admin.nav.administration', 'Administration')}</small>
          </span>
        </div>

        <nav className="admin-nav">
          {nav.map((group) => (
            <div key={group.labelKey}>
              <div className="nav-label">{t(group.labelKey, group.defaultLabel)}</div>
              {group.items.map((it) => {
                const itemName = t(it.nameKey, it.defaultName);
                return it.external ? (
                  <a key={it.href} href={it.href} target="_blank" rel="noreferrer">
                    {it.icon}{itemName}<span className="nav-ext">↗</span>
                  </a>
                ) : (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.end}
                    className={({ isActive }) => (isActive ? 'active' : undefined)}
                  >
                    {it.icon}{itemName}
                    {it.badge && <span className="nav-badge">{it.badge}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <span className="av">{initial}</span>
          <div style={{ minWidth: 0 }}>
            <div className="name">{displayName}</div>
            <div className="role">{user?.role_display || t('admin.nav.administration', 'Administration')}</div>
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
            <input
              type="text"
              placeholder={t('admin.nav.searchPlaceholder', 'Rechercher une commande, un client, un produit...')}
            />
          </div>
          <div className="admin-top-actions">
            <span
              className="admin-lang"
              style={{ cursor: 'pointer' }}
              title="Cliquer pour changer de langue"
              onClick={() => {
                const next = currentLang === 'FR' ? 'en' : currentLang === 'EN' ? 'zh' : 'fr';
                i18n.changeLanguage(next);
              }}
            >
              🌐 {currentLang}
            </span>
            <span className="admin-bell-wrap">{I.bell}<span className="dot"></span></span>
            <div className="admin-profile"><span className="av">{initial}</span></div>
          </div>
        </div>

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
