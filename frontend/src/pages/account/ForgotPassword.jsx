import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api.passwordReset(e.target.email.value);
      setSent(true);
    } catch {
      setError("L'envoi a échoué. Réessayez dans un instant.");
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-tabs">
          <Link to="/compte/connexion">Connexion</Link>
          <Link to="/compte/inscription">Inscription</Link>
        </div>
        <div className="auth-body">
          <h2 style={{ fontSize: 19, color: 'var(--navy)', marginBottom: 6 }}>Mot de passe oublié</h2>

          {sent ? (
            <>
              <p style={{ background: '#E6F7EF', color: '#1FA971', fontSize: 13.5, fontWeight: 600,
                          padding: '12px 14px', borderRadius: 6, margin: '14px 0' }}>
                ✓ Si un compte existe avec cette adresse, un e-mail vient d'être envoyé.
              </p>
              <p className="social-note" style={{ textAlign: 'left' }}>
                Pensez à vérifier vos courriers indésirables. Le lien n'est valable
                qu'une seule fois.
              </p>
              <Link to="/compte/connexion" className="btn-primary"
                    style={{ display: 'block', textAlign: 'center', marginTop: 16 }}>
                Retour à la connexion
              </Link>
            </>
          ) : (
            <>
              <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.6, marginBottom: 18 }}>
                Indiquez l'adresse e-mail de votre compte : nous vous enverrons un lien
                pour choisir un nouveau mot de passe.
              </p>
              <form onSubmit={submit}>
                <div className="field">
                  <label htmlFor="email">Adresse e-mail</label>
                  <input id="email" name="email" type="email" required autoFocus placeholder="vous@exemple.com" />
                </div>
                {error && <p className="social-error">{error}</p>}
                <button type="submit" className="btn-primary" disabled={busy}>
                  {busy ? 'Envoi…' : 'Recevoir le lien'}
                </button>
              </form>
              <p className="social-note" style={{ textAlign: 'left', marginTop: 16 }}>
                Vous vous êtes inscrit avec Google ou Facebook ? Votre compte n'a pas de
                mot de passe : utilisez directement le bouton correspondant sur la page
                de connexion.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
