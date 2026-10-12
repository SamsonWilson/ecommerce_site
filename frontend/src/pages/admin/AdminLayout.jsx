import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/auth.js';
import { I } from './icons.jsx';
import { useTheme } from './ThemeContext.jsx';
import { api } from '../../lib/api.js';
import { eur } from '../../data/cart.jsx';

export default function AdminLayout() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const currentLang = (i18n.resolvedLanguage || 'fr').toUpperCase();
  const { toggleTheme, isDark } = useTheme();

  // GESTION DES NOTIFICATIONS DE COMMANDES & DEVIS
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('admin_read_notifs') || '[]');
    } catch {
      return [];
    }
  });

  const popoverRef = useRef(null);

  // Fermeture lors d'un clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  // Récupération automatique des commandes et devis récents
  useEffect(() => {
    let alive = true;

    const fetchNotifications = () => {
      api.adminOrders().catch(() => ({ results: [] })).then((ordersRes) => {
        if (!alive) return;
        const ordersList = Array.isArray(ordersRes) ? ordersRes : (ordersRes.results || []);

        const notifs = [];

        ordersList.slice(0, 10).forEach((o) => {
          notifs.push({
            id: `ord-${o.id || o.reference}`,
            type: 'order',
            title: `Commande #${o.reference}`,
            sub: `${o.customer_name || o.email} • ${eur(o.total_amount || 0)}`,
            date: new Date(o.created_at || Date.now()),
            link: '/gestion/commandes',
            status: o.status,
          });
        });

        notifs.sort((a, b) => b.date - a.date);
        setNotifications(notifs);
      });
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !readNotifIds.includes(n.id)).length;

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds(allIds);
    try {
      localStorage.setItem('admin_read_notifs', JSON.stringify(allIds));
    } catch { }
  };

  const markAsRead = (id) => {
    if (!readNotifIds.includes(id)) {
      const updated = [...readNotifIds, id];
      setReadNotifIds(updated);
      try {
        localStorage.setItem('admin_read_notifs', JSON.stringify(updated));
      } catch { }
    }
  };

  const formatTimeAgo = (date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    return date.toLocaleDateString('fr-FR');
  };

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
        { to: '/gestion/ventes', icon: I.euro, nameKey: 'admin.nav.sales', defaultName: 'Ventes', section: 'orders' },
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
        { to: '/gestion/stocks', icon: I.moq, nameKey: 'admin.nav.stock', defaultName: 'Stocks', section: 'catalog' },
        { to: '/gestion/stocks-rapport', icon: I.pdf, nameKey: 'admin.nav.stockReport', defaultName: 'Rapport de stock', section: 'catalog' },
        { to: '/gestion/inventaire', icon: I.check, nameKey: 'admin.nav.inventory', defaultName: 'Inventaire Physique', section: 'catalog' },
        { to: '/gestion/categories', icon: I.layers, nameKey: 'admin.nav.categories', defaultName: 'Catégories', section: 'catalog' },
        { to: '/gestion/langues', icon: I.globe, nameKey: 'admin.nav.languages', defaultName: 'Langues', section: 'catalog' },
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

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`admin-shell ${isDark ? 'dark-theme' : ''}`}>
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`admin-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="admin-brand">
          <span className="mark">ML</span>
          <span className="word">
            Maison Lián
            <small>{t('admin.nav.administration', 'Administration')}</small>
          </span>
          <button
            type="button"
            className="admin-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
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
                    onClick={() => setSidebarOpen(false)}
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
          <button
            type="button"
            className="admin-mobile-burger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar menu"
          >
            ☰
          </button>

          <div className="admin-search">
            {I.search}
            <input
              type="text"
              placeholder={t('admin.nav.searchPlaceholder', 'Rechercher une commande, un client, un produit...')}
            />
          </div>

          <div className="admin-top-actions" ref={popoverRef}>
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

            {/* BOUTON MODE CLAIR / SOMBRE */}
            <button
              type="button"
              className="admin-theme-btn"
              onClick={toggleTheme}
              title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
              aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
            >
              <span className="admin-theme-icon">{isDark ? I.sun : I.moon}</span>
              <span className="admin-theme-label">{isDark ? 'Clair' : 'Sombre'}</span>
            </button>

            {/* BOUTON DE NOTIFICATION CLIQUEABLE */}
            <div
              className="admin-bell-wrap"
              onClick={() => setNotifOpen((prev) => !prev)}
              title="Notifications des commandes et devis"
            >
              {I.bell}
              {unreadCount > 0 && <span className="count-badge">{unreadCount}</span>}
            </div>

            {/* POPOVER DES NOTIFICATIONS */}
            {notifOpen && (
              <div className="admin-notif-popover">
                <div className="admin-notif-head">
                  <h3>🔔 Notifications {unreadCount > 0 && `(${unreadCount})`}</h3>
                  {unreadCount > 0 && (
                    <button type="button" onClick={markAllAsRead}>
                      Tout marquer comme lu
                    </button>
                  )}
                </div>

                <div className="admin-notif-body">
                  {notifications.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
                      Aucune nouvelle notification pour le moment.
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isUnread = !readNotifIds.includes(n.id);
                      return (
                        <Link
                          key={n.id}
                          to={n.link}
                          className={`admin-notif-item ${isUnread ? 'unread' : ''}`}
                          onClick={() => {
                            markAsRead(n.id);
                            setNotifOpen(false);
                          }}
                        >
                          <div className={`admin-notif-icon ${n.type}`}>
                            {n.type === 'order' ? '🛒' : '📄'}
                          </div>
                          <div className="admin-notif-content">
                            <div className="admin-notif-title">
                              <span>{n.title}</span>
                              {isUnread && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E1251B' }}></span>}
                            </div>
                            <div className="admin-notif-sub">{n.sub}</div>
                            <div className="admin-notif-time">{formatTimeAgo(n.date)}</div>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>

                <div className="admin-notif-foot">
                  <Link to="/gestion/commandes" onClick={() => setNotifOpen(false)}>
                    Voir toutes les commandes →
                  </Link>
                </div>
              </div>
            )}

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

