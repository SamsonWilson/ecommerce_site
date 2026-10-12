import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell.jsx';
import SocialLogins from '../../components/SocialLogins.jsx';
import { api, setAccessToken } from '../../lib/api.js';
import { useAuth } from '../../store/auth.js';

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const googleSignup = async (credential) => {
    try {
      await useAuth.getState().loginGoogle(credential);
      navigate('/compte');
    } catch {
      setError("La connexion Google a échoué.");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    const f = e.target;
    if (f.password1.value !== f.password2.value) {
      setError('Les deux mots de passe ne correspondent pas.');
      setBusy(false);
      return;
    }
    try {
      const res = await api.register({
        email: f.email.value,
        password1: f.password1.value,
        password2: f.password2.value,
        first_name: f.first_name.value,
      });
      setAccessToken(res.access);
      useAuth.setState({ user: res.user, status: 'authenticated' });
      navigate('/compte');
    } catch (err) {
      const d = err.data || {};
      setError(d.email?.[0] || d.password1?.[0] || d.non_field_errors?.[0] || "L'inscription a échoué.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell activeTab="inscription">
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="first_name">Prénom</label>
          <input
            id="first_name"
            name="first_name"
            autoComplete="given-name"
            placeholder="Camille"
          />
        </div>

        <div className="field">
          <label htmlFor="email">Adresse e-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="mariage@exemple.com"
          />
        </div>

        <div className="field">
          <label htmlFor="password1">Mot de passe</label>
          <input
            id="password1"
            name="password1"
            type="password"
            required
            autoComplete="new-password"
            placeholder="8 caractères minimum"
          />
        </div>

        <div className="field">
          <label htmlFor="password2">Confirmer le mot de passe</label>
          <input
            id="password2"
            name="password2"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Confirmez votre mot de passe"
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
          {busy ? 'Création de votre compte…' : 'Créer mon compte Privilège ➔'}
        </button>
      </form>

      <SocialLogins onGoogle={googleSignup} label="ou s'inscrire avec" />

      <p className="auth-alt" style={{ marginTop: 22 }}>
        Déjà client ?{' '}
        <Link to="/compte/connexion" style={{ fontWeight: 700 }}>Se connecter</Link>
      </p>
    </AuthShell>
  );
}
