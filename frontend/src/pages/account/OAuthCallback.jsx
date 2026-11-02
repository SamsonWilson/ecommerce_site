import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, setAccessToken } from '../../lib/api.js';
import { useAuth } from '../../store/auth.js';
import { OAUTH_REDIRECT } from '../../components/SocialLogins.jsx';

// Retour du fournisseur OAuth : on échange le `code` contre nos propres JWT.
export default function OAuthCallback() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const done = useRef(false); // StrictMode monte deux fois en dev

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const code = params.get('code');
    const state = params.get('state');
    const denied = params.get('error');
    const expectedState = sessionStorage.getItem('oauth_state');
    const provider = sessionStorage.getItem('oauth_provider');
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('oauth_provider');

    if (denied) { setError(t('auth.oauthCancelled', 'Sign-in cancelled.')); return; }
    if (!code || !provider) { setError(t('auth.oauthIncomplete', 'Incomplete response from provider.')); return; }
    // Protection CSRF : le state doit correspondre à celui que nous avons émis.
    if (!state || state !== expectedState) { setError(t('auth.oauthInvalidToken', 'Invalid security token.')); return; }

    api.socialLogin(provider, { code, callback_url: OAUTH_REDIRECT() })
      .then(async ({ access }) => {
        setAccessToken(access);
        const user = await api.me();
        useAuth.setState({ user, status: 'authenticated' });
        navigate('/compte', { replace: true });
      })
      .catch((e) => setError(e.data?.detail || t('auth.oauthFailed', 'Sign-in failed.')));
  }, [params, navigate, t]);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-body" style={{ textAlign: 'center' }}>
          {error ? (
            <>
              <p className="social-error">{error}</p>
              <Link to="/compte/connexion" className="btn-primary">{t('auth.backToLogin', 'Back to sign in')}</Link>
            </>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>{t('auth.loggingIn', 'Signing in…')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
