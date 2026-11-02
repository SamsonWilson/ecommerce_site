import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api.js';

export default function ResetPassword() {
  const { t } = useTranslation();
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
      setError(t('auth.passwordMismatch', 'The two passwords do not match.'));
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
        (d.uid || d.token ? t('auth.linkExpired', "This link is no longer valid. Please request a new one.") : null) ||
        t('auth.resetFailed', 'Password reset failed.')
      );
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-body">
          <h2 style={{ fontSize: 19, color: 'var(--navy)', marginBottom: 14 }}>
            {t('auth.resetTitle', 'Choose a new password')}
          </h2>

          {done ? (
            <>
              <p style={{ background: '#E6F7EF', color: '#1FA971', fontSize: 13.5, fontWeight: 600,
                          padding: '12px 14px', borderRadius: 6 }}>
                {t('auth.passwordUpdatedRedirect', '✓ Password updated. Redirecting to sign in…')}
              </p>
            </>
          ) : (
            <form onSubmit={submit}>
              <div className="field">
                <label htmlFor="p1">{t('auth.newPasswordLabel', 'New password')}</label>
                <input id="p1" name="p1" type="password" required autoFocus autoComplete="new-password" />
              </div>
              <div className="field">
                <label htmlFor="p2">{t('auth.confirmNewPasswordLabel', 'Confirm new password')}</label>
                <input id="p2" name="p2" type="password" required autoComplete="new-password" />
              </div>
              {error && <p className="social-error">{error}</p>}
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? t('auth.saving', 'Saving…') : t('auth.submitNewPassword', 'Update password')}
              </button>
            </form>
          )}

          <p className="auth-alt">
            <Link to="/compte/mot-de-passe-oublie">{t('auth.requestNewLink', 'Request a new link')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
