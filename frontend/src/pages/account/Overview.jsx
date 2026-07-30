import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useAuth } from '../../store/auth.js';
import { useCart } from '../../store/cart.js';
import { IconPackage, IconPdf, IconUser } from '../../components/icons.jsx';

export default function Overview() {
  const user = useAuth((s) => s.user);
  const cartCount = useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
  const [quotes, setQuotes] = useState([]);

  useEffect(() => {
    api.myQuotes().then((d) => setQuotes(d.results || d)).catch(() => {});
  }, []);

  const profile = user?.profile;
  const isPro = profile?.account_type === 'WHOLESALE';

  return (
    <div className="acc-overview">
      <div className="acc-head">
        <div className="acc-head-content">
          <h1>Bonjour, <span>{user?.first_name || 'Client'}</span></h1>
          <p>Bienvenue dans votre espace personnel. Retrouvez ici vos commandes, devis et informations.</p>
        </div>
      </div>

      <div className="acc-tiles">
        <div className="acc-tile tile-cart">
          <div className="tile-icon"><IconPackage /></div>
          <div className="tile-content">
            <div className="lab">Panier en cours</div>
            <div className="val">{cartCount}</div>
          </div>
        </div>
        <div className="acc-tile tile-quotes">
          <div className="tile-icon"><IconPdf /></div>
          <div className="tile-content">
            <div className="lab">Devis en cours</div>
            <div className="val">{quotes.length}</div>
          </div>
        </div>
        <div className="acc-tile tile-account">
          <div className="tile-icon"><IconUser /></div>
          <div className="tile-content">
            <div className="lab">Type de compte</div>
            <div className="val">
              <span className={`pill ${isPro ? 'ship' : 'paid'}`}>
                {profile?.account_type_display || 'Particulier'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="acc-info-card">
        <div className="card-title">Vos informations personnelles</div>
        <div className="info-grid">
          <div className="info-item">
            <div className="lbl">E-mail</div>
            <div className="vlu">{user?.email || '—'}</div>
          </div>
          <div className="info-item">
            <div className="lbl">Nom complet</div>
            <div className="vlu">{[user?.first_name, user?.last_name].filter(Boolean).join(' ') || '—'}</div>
          </div>
          <div className="info-item">
            <div className="lbl">Méthode de connexion</div>
            <div className="vlu">{user?.auth_provider === 'GOOGLE' ? 'Compte Google' : 'E-mail et mot de passe'}</div>
          </div>
          {isPro && (
            <div className="info-item">
              <div className="lbl">Société</div>
              <div className="vlu">{profile?.company_name || '—'}</div>
            </div>
          )}
        </div>
        
        <div className="info-actions">
          <Link to="/compte/profil" className="btn-premium">
            Modifier mon profil
          </Link>
        </div>
      </div>
    </div>
  );
}
