import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SocialLogins from '../../components/SocialLogins.jsx';
import { api, setAccessToken } from '../../lib/api.js';
import { useAuth } from '../../store/auth.js';

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Google crée le compte s'il n'existe pas : inscription et connexion sont
  // le même geste côté fournisseur.
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
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-tabs">
          <Link to="/compte/connexion">Connexion</Link>
          <Link to="/compte/inscription" className="active">Inscription</Link>
        </div>
        <div className="auth-body">
          <form onSubmit={submit}>
            <div className="field"><label htmlFor="first_name">Prénom</label><input id="first_name" name="first_name" /></div>
            <div className="field"><label htmlFor="email">E-mail</label><input id="email" name="email" type="email" required /></div>
            <div className="field"><label htmlFor="password1">Mot de passe</label><input id="password1" name="password1" type="password" required /></div>
            <div className="field"><label htmlFor="password2">Confirmer le mot de passe</label><input id="password2" name="password2" type="password" required /></div>

            {error && <p style={{ color: 'var(--brand-red)', fontSize: 13, marginBottom: 10 }}>{error}</p>}

            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>

          <SocialLogins onGoogle={googleSignup} label="ou s'inscrire avec" />

          <p className="auth-alt" style={{ textAlign: 'left', lineHeight: 1.6 }}>
            Votre compte vous permet de commander <strong>au détail</strong>.
            Vous êtes revendeur ? <Link to="/pro">Demandez l'accès grossiste</Link> :
            nos équipes activent les tarifs de gros après étude de votre dossier.
          </p>

          <p className="auth-alt">Déjà client ? <Link to="/compte/connexion">Se connecter</Link></p>
        </div>
      </div>
    </div>
  );
}
