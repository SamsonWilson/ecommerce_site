import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AuthShell from './AuthShell.jsx';
import SocialLogins from '../../components/SocialLogins.jsx';
import { useAuth } from '../../store/auth.js';
import { IconEye, IconEyeOff } from '../../components/icons.jsx';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const loginGoogle = useAuth((s) => s.loginGoogle);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const form = e.target;
    try {
      await login(form['l-mail'].value, form['l-pass'].value);
      navigate('/compte');
    } catch {
      setError(t('auth.invalidCredentials', 'Incorrect email or password.'));
    } finally {
      setBusy(false);
    }
  };

  const googleLogin = async (credential) => {
    try {
      await loginGoogle(credential);
      navigate('/compte');
    } catch {
      setError(t('auth.googleFailed', 'Google sign-in failed.'));
    }
  };

  return (
    <AuthShell activeTab="connexion">
      <form onSubmit={emailLogin}>
        <div className="field">
          <label htmlFor="l-mail">{t('auth.emailLabel', 'Email address')}</label>
          <input
            id="l-mail"
            name="l-mail"
            type="email"
            required
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder', 'wedding@example.com')}
          />
        </div>

        <div className="field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <label htmlFor="l-pass" style={{ margin: 0 }}>{t('auth.passwordLabel', 'Password')}</label>
            <Link
              to="/compte/mot-de-passe-oublie"
              style={{ fontSize: 12, color: 'var(--brand-red)', fontWeight: 600, textDecoration: 'none' }}
            >
              {t('auth.forgotPassword', 'Forgot password?')}
            </Link>
          </div>
          <div className="password-input-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              id="l-pass"
              name="l-pass"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder={t('auth.passwordPlaceholder', '••••••••••••')}
              style={{ width: '100%', paddingRight: 42 }}
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
              title={showPassword ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                padding: '6px',
                cursor: 'pointer',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
              }}
            >
              <span style={{ width: 18, height: 18, display: 'inline-flex' }}>
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </span>
            </button>
          </div>
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
          {busy ? t('auth.loggingIn', 'Signing in…') : t('auth.loginButton', 'Access my account ➔')}
        </button>
      </form>

      <SocialLogins onGoogle={googleLogin} label={t('auth.orContinueWith', 'or continue with')} />

      <p className="auth-alt" style={{ marginTop: 22 }}>
        {t('auth.noAccount', "Don't have an account yet?")}{' '}
        <Link to="/compte/inscription" style={{ fontWeight: 700 }}>{t('auth.createAccount', 'Create an account')}</Link>
      </p>
    </AuthShell>
  );
}
