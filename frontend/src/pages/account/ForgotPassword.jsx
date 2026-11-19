import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AuthShell from './AuthShell.jsx';
import { api } from '../../lib/api.js';

export default function ForgotPassword() {
  const { t } = useTranslation();
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
      setError(t('auth.sendFailed'));
    } finally { setBusy(false); }
  };

  return (
    <AuthShell activeTab="connexion">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 6, fontFamily: 'var(--display)' }}>
          {t('auth.recoverTitle')}
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.55 }}>
          {t('auth.recoverText')}
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
            {t('auth.recoverSent')}
          </div>
          <p className="social-note" style={{ textAlign: 'left', marginBottom: 20 }}>
            {t('auth.recoverSpam')}
          </p>
          <Link to="/compte/connexion" className="btn-primary" style={{ display: 'block', textAlign: 'center' }}>
            {t('auth.backToLogin')}
          </Link>
        </>
      ) : (
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              placeholder={t('auth.emailHint')}
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
            {busy ? t('auth.sending') : t('auth.getLink')}
          </button>

          <p className="auth-alt" style={{ marginTop: 20 }}>
            <Link to="/compte/connexion">← {t('auth.backToLogin')}</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
