import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/auth.js';
import { I } from './icons.jsx';
import { useTheme } from './ThemeContext.jsx';
import { api } from '../../lib/api.js';
import { eur } from '../../data/cart.jsx';

const ALL_LANGUAGES = [
  { code: 'en', name: 'English', label: 'EN' },
  { code: 'fr', name: 'Français', label: 'FR' },
  { code: 'zh', name: '中文', label: 'ZH' },
];

export default function AdminLayout() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  const { isDark } = useTheme();

  // GESTION DE LA LANGUE
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  const [publishedLangs, setPublishedLangs] = useState(() => {
    try {
      const saved = localStorage.getItem('published_langs');
      return saved ? JSON.parse(saved) : ['en', 'fr'];
    } catch {
      return ['en', 'fr'];
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('published_langs');
        if (saved) setPublishedLangs(JSON.parse(saved));
      } catch { }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const currentLangCode = ((i18n.resolvedLanguage || i18n.language || 'fr').slice(0, 2)).toLowerCase();
  const currentLangLabel = currentLangCode.toUpperCase();
  const availableLangs = ALL_LANGUAGES.filter((l) => publishedLangs.includes(l.code));
  const listLangs = availableLangs.length > 0 ? availableLangs : ALL_LANGUAGES.slice(0, 2);

  // GESTION DES NOTIFICATIONS DE COMMANDES & DEVIS
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('admin_read_notifs') || '[]');
    } catch {
      return [];
    }
  });

  // Fermeture des popovers lors d'un clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    if (diff < 60) return t('common.justNow', 'Just now');
    if (diff < 3600) return t('common.minutesAgo', { count: Math.floor(diff / 60), defaultValue: `${Math.floor(diff / 60)} min ago` });
    if (diff < 86400) return t('common.hoursAgo', { count: Math.floor(diff / 3600), defaultValue: `${Math.floor(diff / 3600)} h ago` });
    return date.toLocaleDateString(i18n.language === 'en' ? 'en-US' : i18n.language === 'zh' ? 'zh-CN' : 'fr-FR');
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
          <button type="button" className="admin-logout" onClick={signOut} title={t('account.layout.logout', 'Sign out')} aria-label={t('account.layout.logout', 'Sign out')}>
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

          <div className="admin-top-actions">
            {/* SÉLECTEUR DE LANGUE EN DROPDOWN */}
            <div className="admin-lang-dropdown-wrap" ref={langRef}>
              <button
                type="button"
                className={`admin-lang-btn ${langOpen ? 'active' : ''}`}
                onClick={() => setLangOpen((prev) => !prev)}
                title="Changer de langue"
                aria-expanded={langOpen}
                aria-haspopup="true"
              >
                <span className="admin-lang-icon">{I.translate}</span>
                <span className="admin-lang-code">{currentLangLabel}</span>
              </button>

              {langOpen && (
                <div className="admin-lang-menu" role="menu">
                  {listLangs.map((item) => {
                    const isSelected = item.code === currentLangCode;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        className={`admin-lang-option ${isSelected ? 'selected' : ''}`}
                        role="menuitem"
                        onClick={() => {
                          i18n.changeLanguage(item.code);
                          setLangOpen(false);
                        }}
                      >
                        <span className="admin-lang-name">{item.name}</span>
                        <span className="admin-lang-badge">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* BOUTON DE NOTIFICATION CLIQUEABLE ET POPOVER */}
            <div className="admin-notif-wrap" ref={notifRef}>
              <div
                className="admin-bell-wrap"
                onClick={() => setNotifOpen((prev) => !prev)}
                title="Notifications des commandes et devis"
              >
                {I.bell}
                {unreadCount > 0 && <span className="count-badge">{unreadCount}</span>}
              </div>

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
            </div>

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
