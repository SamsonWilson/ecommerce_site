import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from './AuthShell.jsx';
import SocialLogins from '../../components/SocialLogins.jsx';
import { api, setAccessToken } from '../../lib/api.js';
import { useAuth } from '../../store/auth.js';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const googleSignup = async (credential) => {
    try {
      await useAuth.getState().loginGoogle(credential);
      navigate('/compte');
    } catch {
      setError(t('auth.googleRegisterFailed'));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    const f = e.target;
    if (f.password1.value !== f.password2.value) {
      setError(t('auth.passwordMismatch'));
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
      setError(d.email?.[0] || d.password1?.[0] || d.non_field_errors?.[0] || t('auth.registerFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell activeTab="inscription">
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="first_name">{t('common.firstName')}</label>
          <input
            id="first_name"
            name="first_name"
            autoComplete="given-name"
            placeholder={t('auth.firstNameHint')}
          />
        </div>

        <div className="field">
          <label htmlFor="email">{t('auth.email')}</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t('auth.emailHint')}
          />
        </div>

        <div className="field">
          <label htmlFor="password1">{t('auth.password')}</label>
          <input
            id="password1"
            name="password1"
            type="password"
            required
            autoComplete="new-password"
            placeholder={t('auth.passwordHint')}
          />
        </div>

        <div className="field">
          <label htmlFor="password2">{t('auth.confirmPassword')}</label>
          <input
            id="password2"
            name="password2"
            type="password"
            required
            autoComplete="new-password"
            placeholder={t('auth.confirmPasswordHint')}
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
          {busy ? t('auth.creating') : t('auth.createAccount')}
        </button>
      </form>

      <SocialLogins onGoogle={googleSignup} label={t('auth.orSignUpWith')} />

      <p className="auth-alt" style={{ marginTop: 22 }}>
        {t('auth.alreadyClient')}{' '}
        <Link to="/compte/connexion" style={{ fontWeight: 700 }}>{t('auth.signInLink')}</Link>
      </p>
    </AuthShell>
  );
}
