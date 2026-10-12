import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from './AuthShell.jsx';
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
    <AuthShell activeTab="connexion">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 6, fontFamily: 'var(--display)' }}>
          Récupération de mot de passe
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.55 }}>
          Indiquez l'adresse e-mail associée à votre compte Maison Lián pour recevoir votre lien de réinitialisation sécurisé.
        </p>
      </div>

      {sent ? (
        <>
          <div style={{
            background: '#E6F7EF',
            color: '#1FA971',
            fontSize: 13.5,
            fontWeight: 600,
            padding: '14px 16px',
            borderRadius: 8,
            marginBottom: 16,
            border: '1px solid #B8EAD1'
          }}>
            ✓ Si un compte existe avec cette adresse, un e-mail vient d'être envoyé.
          </div>
          <p className="social-note" style={{ textAlign: 'left', marginBottom: 20 }}>
            Pensez à vérifier vos courriers indésirables. Le lien est valable pour une durée limitée.
          </p>
          <Link to="/compte/connexion" className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>
            Retour à la connexion
          </Link>
        </>
      ) : (
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Adresse e-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              placeholder="mariage@exemple.com"
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
            {busy ? 'Envoi en cours…' : 'Recevoir le lien de réinitialisation ➔'}
          </button>

          <p className="auth-alt" style={{ marginTop: 20 }}>
            <Link to="/compte/connexion">← Retour à la connexion</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
