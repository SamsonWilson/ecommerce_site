import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useAuth } from '../../store/auth.js';
import { useCart } from '../../store/cart.js';

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
    <>
      <div className="acc-head">
        <h1>Bonjour {user?.first_name || ''}</h1>
        <p>Retrouvez ici vos commandes, vos devis et vos informations.</p>
      </div>

      <div className="acc-tiles">
        <div className="acc-tile">
          <div className="lab">Panier en cours</div>
          <div className="val">{cartCount}</div>
        </div>
        <div className="acc-tile">
          <div className="lab">Devis en cours</div>
          <div className="val">{quotes.length}</div>
        </div>
        <div className="acc-tile">
          <div className="lab">Type de compte</div>
          <div className="val" style={{ fontSize: 17, marginTop: 9 }}>
            <span className={`pill ${isPro ? 'ship' : 'paid'}`}>
              {profile?.account_type_display || '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="card-box">
        <div className="card-title">Vos informations</div>
        <table className="simple-table">
          <tbody>
            <tr><td style={{ color: 'var(--muted)' }}>E-mail</td><td>{user?.email}</td></tr>
            <tr><td style={{ color: 'var(--muted)' }}>Nom</td>
              <td>{[user?.first_name, user?.last_name].filter(Boolean).join(' ') || '—'}</td></tr>
            <tr><td style={{ color: 'var(--muted)' }}>Connexion</td>
              <td>{user?.auth_provider === 'GOOGLE' ? 'Compte Google' : 'E-mail et mot de passe'}</td></tr>
            {isPro && (
              <tr><td style={{ color: 'var(--muted)' }}>Société</td><td>{profile?.company_name || '—'}</td></tr>
            )}
          </tbody>
        </table>
        <Link to="/compte/profil" className="btn-primary" style={{ display: 'inline-block', marginTop: 16 }}>
          Modifier mon profil
        </Link>
      </div>
    </>
  );
}
