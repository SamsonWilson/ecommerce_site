import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import { useCartCount } from '../store/cart.js';
import { useWishlistCount } from '../store/wishlist.js';
import {
  IconPhone, IconMail, IconFacebook, IconInstagram, IconPinterest,
  IconSearch, IconUser, IconHeart, IconBag, IconMenu, IconFlag,
} from './icons.jsx';

function TopBar() {
  const { t } = useTranslation();
  return (
    <div className="top-bar">
      <div className="container">
        <div className="tb-left">
          <span><IconPhone />+33 1 84 25 00 00</span>
          <span><IconMail />contact@maisonlian.com</span>
        </div>
        <div className="tb-right">
          <LanguageSwitcher />
          <span>|</span><span>EUR €</span><span>|</span>
          <Link to="/compte/pro">{t('topbar.wholesale')}</Link>
          <div className="tb-social">
            <a href="#" aria-label="Facebook"><IconFacebook /></a>
            <a href="#" aria-label="Instagram"><IconInstagram /></a>
            <a href="#" aria-label="Pinterest"><IconPinterest /></a>
          </div>
        </div>
      </div>
    </div>
  );
}

function SiteHeader({ onToggleMenu, mobileMenuOpen, onToggleSearch, mobileSearchOpen }) {
  const { t } = useTranslation();
  const count = useCartCount();
  const wishCount = useWishlistCount();

  return (
    <header className="uee">
      <div className="container uee-head-row">
        <button
          className="mobile-burger-btn"
          onClick={onToggleMenu}
          aria-label="Toggle navigation menu"
        >
          <IconMenu />
        </button>

        <Link to="/" className="uee-logo">
          <span className="mark">ML</span>
          <span className="word">MAISON <span>LIÁN</span></span>
        </Link>

        <div className="uee-search">
          <select defaultValue="all">
            <option value="all">{t('header.allCategories')}</option>
            <option>{t('nav.ceremony')}</option>
            <option>{t('nav.reception')}</option>
            <option>{t('nav.chinese')}</option>
          </select>
          <input type="text" placeholder={t('header.searchPlaceholder')} />
          <button aria-label={t('header.searchPlaceholder')}><IconSearch /></button>
        </div>

        <div className="uee-actions">
          <button className="mobile-search-btn" onClick={onToggleSearch} aria-label="Search">
            <IconSearch />
          </button>
          <Link className="uee-action" to="/compte">
            <IconUser />
            <span>{t('header.account')}</span>
          </Link>
          <Link className="uee-action" to="/compte/favoris">
            <IconHeart />
            <span>{t('header.favorites')}</span>
            {wishCount > 0 && <span className="badge">{wishCount}</span>}
          </Link>
          <Link className="uee-action" to="/panier">
            <IconBag />
            <span>{t('header.cart')}</span>
            {count > 0 && <span className="badge">{count}</span>}
          </Link>
          <Link to="/compte/pro" className="uee-quote-btn">{t('header.requestQuote')}</Link>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="mobile-search-bar container">
          <div className="uee-search mobile-search-inner">
            <input type="text" placeholder={t('header.searchPlaceholder')} autoFocus />
            <button aria-label={t('header.searchPlaceholder')}><IconSearch /></button>
          </div>
        </div>
      )}
    </header>
  );
}

function SiteNav({ onToggleMenu }) {
  const { t } = useTranslation();
  return (
    <nav className="uee-nav">
      <div className="container">
        <button onClick={onToggleMenu} className="uee-nav-cat">
          <IconMenu />
          <span>{t('nav.allCategories')}</span>
          <span className="cat-arrow">›</span>
        </button>
        <ul>
          <li><NavLink to="/" end>{t('nav.home')}</NavLink></li>
          <li><NavLink to="/boutique">{t('nav.ceremony')}</NavLink></li>
          <li><NavLink to="/boutique">{t('nav.reception')}</NavLink></li>
          <li><NavLink to="/boutique">{t('nav.chinese')}</NavLink></li>
          <li><NavLink to="/nouveautes">{t('nav.new')}</NavLink></li>
          <li><NavLink to="/compte/pro">{t('nav.wholesalers')}</NavLink></li>
          <li><NavLink to="/contact">{t('nav.contact')}</NavLink></li>
        </ul>
        <span className="promo-flag"><IconFlag />{t('nav.freeShipping')}</span>
      </div>
    </nav>
  );
}

function MobileDrawer({ isOpen, onClose }) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="mobile-drawer-overlay" onClick={onClose}>
      <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="mobile-drawer-header">
          <div className="uee-logo">
            <span className="mark">ML</span>
            <span className="word">MAISON <span>LIÁN</span></span>
          </div>
          <button className="mobile-drawer-close" onClick={onClose} aria-label="Close menu">✕</button>
        </div>

        <div className="mobile-drawer-body">
          <ul className="mobile-nav-list">
            <li><NavLink to="/" end onClick={onClose}>{t('nav.home')}</NavLink></li>
            <li><NavLink to="/boutique" onClick={onClose}>{t('nav.allCategories')}</NavLink></li>
            <li><NavLink to="/boutique" onClick={onClose}>{t('nav.ceremony')}</NavLink></li>
            <li><NavLink to="/boutique" onClick={onClose}>{t('nav.reception')}</NavLink></li>
            <li><NavLink to="/boutique" onClick={onClose}>{t('nav.chinese')}</NavLink></li>
            <li><NavLink to="/nouveautes" onClick={onClose}>{t('nav.new')}</NavLink></li>
            <li><NavLink to="/compte/pro" onClick={onClose}>{t('nav.wholesalers')}</NavLink></li>
            <li><NavLink to="/contact" onClick={onClose}>{t('nav.contact')}</NavLink></li>
            <li><NavLink to="/faq" onClick={onClose}>FAQ</NavLink></li>
            <li><NavLink to="/livraison" onClick={onClose}>Livraison & Retours</NavLink></li>
          </ul>

          <div className="mobile-drawer-cta">
            <Link to="/compte/pro" className="btn-primary" style={{ display: 'block', textAlign: 'center' }} onClick={onClose}>
              {t('header.requestQuote')}
            </Link>
          </div>

          <div className="mobile-drawer-footer">
            <LanguageSwitcher />
            <div className="mobile-contact">
              <div><IconPhone /> +33 1 84 25 00 00</div>
              <div><IconMail /> contact@maisonlian.com</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="uee">
      <div className="container">
        <div className="uee-footer-grid">
          <div>
            <span className="word">MAISON <span>LIÁN</span></span>
            <p className="desc">{t('footer.tagline')}</p>
            <div className="uee-footer-contact">
              <div><IconPin /><span>{t('footer.ateliers')}</span></div>
              <div><IconPhone /><span>+33 1 84 25 00 00</span></div>
            </div>
          </div>
          <div>
            <h4>{t('footer.shop')}</h4>
            <ul>
              <li><NavLink to="/boutique">{t('footer.chineseStyle')}</NavLink></li>
              <li><NavLink to="/nouveautes">{t('footer.new')}</NavLink></li>
              <li><NavLink to="/promotions">{t('footer.promotions')}</NavLink></li>
              <li><NavLink to="/compte/favoris">{t('footer.favorites')}</NavLink></li>
            </ul>
          </div>
          <div>
            <h4>{t('footer.pros')}</h4>
            <ul>
              <li><NavLink to="/compte/inscription?type=pro">{t('footer.createPro')}</NavLink></li>
              <li><NavLink to="/compte/pro">{t('footer.requestQuote')}</NavLink></li>
              <li><a href="#">{t('footer.catalogPdf')}</a></li>
            </ul>
          </div>
          <div>
            <h4>{t('footer.help')}</h4>
            <ul>
              <li><NavLink to="/livraison">{t('footer.shippingReturns')}</NavLink></li>
              <li><NavLink to="/contact">{t('footer.contact')}</NavLink></li>
              <li><NavLink to="/faq">{t('footer.faq')}</NavLink></li>
            </ul>
          </div>
          <div>
            <h4>{t('footer.follow')}</h4>
            <div className="footer-social">
              <a href="#" aria-label="Instagram"><IconInstagram /></a>
              <a href="#" aria-label="Pinterest"><IconPinterest /></a>
              <a href="#" aria-label="Facebook"><IconFacebook /></a>
            </div>
          </div>
        </div>
        <div className="uee-footer-bottom">
          <span>{t('footer.rights')}</span>
          <span>FR / EN / 中文 — {t('footer.poweredBy')}</span>
        </div>
      </div>
    </footer>
  );
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2a5 5 0 0 1 5 5c0 3-5 12-5 12S7 10 7 7a5 5 0 0 1 5-5Z"/></svg>
  );
}

export default function SiteLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <>
      <TopBar />
      <SiteHeader
        onToggleMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        mobileMenuOpen={mobileMenuOpen}
        onToggleSearch={() => setMobileSearchOpen(!mobileSearchOpen)}
        mobileSearchOpen={mobileSearchOpen}
      />
      <SiteNav onToggleMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
      <MobileDrawer isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <Outlet />
      <SiteFooter />
    </>
  );
}

