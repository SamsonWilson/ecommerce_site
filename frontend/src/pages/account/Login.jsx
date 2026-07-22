import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SocialLogins from '../../components/SocialLogins.jsx';
import { useAuth } from '../../store/auth.js';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const loginGoogle = useAuth((s) => s.loginGoogle);
  const [error, setError] = useState('');

  const emailLogin = async (e) => {
    e.preventDefault();
    setError('');
    const form = e.target;
    try {
      await login(form['l-mail'].value, form['l-pass'].value);
      navigate('/compte');
    } catch {
      setError('E-mail ou mot de passe incorrect.');
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
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-tabs">
          <Link to="/compte/connexion" className="active">Connexion</Link>
          <Link to="/compte/inscription">Inscription</Link>
        </div>
        <div className="auth-body">
          <form onSubmit={emailLogin}>
            <div className="field"><label htmlFor="l-mail">E-mail</label><input id="l-mail" name="l-mail" type="email" required /></div>
            <div className="field"><label htmlFor="l-pass">Mot de passe</label><input id="l-pass" name="l-pass" type="password" required /></div>
            {error && <p style={{ color: 'var(--brand-red)', fontSize: 13, marginBottom: 10 }}>{error}</p>}
            <button type="submit" className="btn-primary">Se connecter</button>
            <p className="auth-alt"><Link to="/compte/mot-de-passe-oublie">Mot de passe oublié ?</Link></p>
          </form>

          <SocialLogins onGoogle={googleLogin} />

          <p className="auth-alt">Pas encore de compte ? <Link to="/compte/inscription">Créer un compte</Link></p>
        </div>
      </div>
    </div>
  );
}
