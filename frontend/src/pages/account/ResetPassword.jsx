import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';

export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    const f = e.target;
    if (f.p1.value !== f.p2.value) {
      setError('Les deux mots de passe ne correspondent pas.');
      setBusy(false);
      return;
    }
    try {
      await api.passwordResetConfirm({
        uid, token, new_password1: f.p1.value, new_password2: f.p2.value,
      });
      setDone(true);
      setTimeout(() => navigate('/compte/connexion', { replace: true }), 2200);
    } catch (err) {
      const d = err.data || {};
      // uid/token invalides = lien expiré ou déjà utilisé
      setError(
        d.new_password2?.[0] || d.new_password1?.[0] ||
        (d.uid || d.token ? "Ce lien n'est plus valable. Demandez-en un nouveau." : null) ||
        'La réinitialisation a échoué.'
      );
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-body">
          <h2 style={{ fontSize: 19, color: 'var(--navy)', marginBottom: 14 }}>
            Choisir un nouveau mot de passe
          </h2>

          {done ? (
            <>
              <p style={{ background: '#E6F7EF', color: '#1FA971', fontSize: 13.5, fontWeight: 600,
                          padding: '12px 14px', borderRadius: 6 }}>
                ✓ Mot de passe mis à jour. Redirection vers la connexion…
              </p>
            </>
          ) : (
            <form onSubmit={submit}>
              <div className="field">
                <label htmlFor="p1">Nouveau mot de passe</label>
                <input id="p1" name="p1" type="password" required autoFocus autoComplete="new-password" />
              </div>
              <div className="field">
                <label htmlFor="p2">Confirmer le mot de passe</label>
                <input id="p2" name="p2" type="password" required autoComplete="new-password" />
              </div>
              {error && <p className="social-error">{error}</p>}
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </form>
          )}

          <p className="auth-alt">
            <Link to="/compte/mot-de-passe-oublie">Demander un nouveau lien</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
