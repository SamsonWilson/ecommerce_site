import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/auth.js';
import { I } from './icons.jsx';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuth((s) => s.login);
  const logout = useAuth((s) => s.logout);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Retour vers la page demandée avant redirection, sinon le tableau de bord.
  const from = location.state?.from || '/gestion';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const form = e.target;
    try {
      const user = await login(form.email.value, form.password.value);
      if (!user.is_staff) {
        await logout();
        setError("Ce compte n'a pas accès à l'administration.");
        return;
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.status === 401 ? 'E-mail ou mot de passe incorrect.' : 'Connexion impossible. Réessayez.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={submit}>
        <div className="admin-login-brand">
          <span className="mark">ML</span>
          <span className="word">Maison Lián<small>Administration</small></span>
        </div>

        <h1>Connexion</h1>
        <p className="sub">Espace réservé à l'équipe.</p>

        <div className="admin-login-field">
          <label htmlFor="email">Adresse e-mail</label>
          <input id="email" name="email" type="email" autoComplete="username" required autoFocus />
        </div>

        <div className="admin-login-field">
          <label htmlFor="password">Mot de passe</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>

        {error && <p className="admin-login-error">{error}</p>}

        <button className="btn-admin primary admin-login-submit" type="submit" disabled={busy}>
          {busy ? 'Connexion…' : <>{I.check}Se connecter</>}
        </button>

        <p className="admin-login-foot">
          <Link to="/">← Retour à la boutique</Link>
        </p>
      </form>
    </div>
  );
}
