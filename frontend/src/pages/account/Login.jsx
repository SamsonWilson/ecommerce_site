import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell.jsx';
import SocialLogins from '../../components/SocialLogins.jsx';
import { useAuth } from '../../store/auth.js';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const loginGoogle = useAuth((s) => s.loginGoogle);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const emailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const form = e.target;
    try {
      await login(form['l-mail'].value, form['l-pass'].value);
      navigate('/compte');
    } catch {
      setError('E-mail ou mot de passe incorrect.');
    } finally {
      setBusy(false);
    }
  };

  const googleLogin = async (credential) => {
    try {
      await loginGoogle(credential);
      navigate('/compte');
    } catch {
      setError('Connexion Google impossible.');
    }
  };

  return (
    <AuthShell activeTab="connexion">
      <form onSubmit={emailLogin}>
        <div className="field">
          <label htmlFor="l-mail">Adresse e-mail</label>
          <input
            id="l-mail"
            name="l-mail"
            type="email"
            required
            autoComplete="email"
            placeholder="mariage@exemple.com"
          />
        </div>

        <div className="field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <label htmlFor="l-pass" style={{ margin: 0 }}>Mot de passe</label>
            <Link
              to="/compte/mot-de-passe-oublie"
              style={{ fontSize: 12, color: 'var(--brand-red)', fontWeight: 600, textDecoration: 'none' }}
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <input
            id="l-pass"
            name="l-pass"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••••••"
          />
        </div>

        {error && (
          <p style={{
            background: 'var(--brand-red-soft)',
            color: 'var(--brand-red)',
            fontSize: 13,
            fontWeight: 600,
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            border: '1px solid rgba(192, 57, 43, 0.2)'
          }}>
            ⚠ {error}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Connexion en cours…' : 'Accéder à mon espace ➔'}
        </button>
      </form>

      <SocialLogins onGoogle={googleLogin} label="ou se connecter avec" />

      <p className="auth-alt" style={{ marginTop: 22 }}>
        Vous n'avez pas encore de compte ?{' '}
        <Link to="/compte/inscription" style={{ fontWeight: 700 }}>Créer un compte</Link>
      </p>
    </AuthShell>
  );
}
