import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';
import GoogleLoginButton from './GoogleLoginButton.jsx';

// Identifiants OAuth tiers.
const FB_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;

export const OAUTH_REDIRECT = () => `${window.location.origin}/oauth/callback`;

function startOAuth(provider, authorizeUrl, params) {
  const state = `${provider}:${crypto.randomUUID()}`;
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('oauth_provider', provider);
  const qs = new URLSearchParams({
    ...params,
    redirect_uri: OAUTH_REDIRECT(),
    state,
    response_type: 'code',
  });
  window.location.href = `${authorizeUrl}?${qs}`;
}

export default function SocialLogins({ onGoogle, label }) {
  const { t } = useTranslation();
  const sepLabel = label || t('auth.orContinueWith', 'or continue with');

  return (
    <>
      <div className="social-sep">{sepLabel}</div>

      <div className="social-row">
        <div className="social-col">
          <GoogleLoginButton onSuccess={onGoogle} text="signin" />
        </div>

        <div className="social-col">
          <button
            type="button"
            className="social-btn facebook"
            disabled={!FB_APP_ID}
            title={FB_APP_ID ? t('auth.loginWithFacebook', 'Sign in with Facebook') : t('auth.fbNotConfigured', 'Facebook login not configured')}
            onClick={() => startOAuth('facebook', 'https://www.facebook.com/v19.0/dialog/oauth', {
              client_id: FB_APP_ID,
              scope: 'email,public_profile',
            })}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13 22v-9h3l1-4h-4V6.5C13 5.3 13.4 4.5 15.1 4.5H17V1.1C16.6 1 15.5 1 14.2 1 11.5 1 9.7 2.6 9.7 5.6V9H7v4h2.7v9H13Z" />
            </svg>
            <span>Facebook</span>
          </button>
        </div>
      </div>

      <p className="social-note">
        {t('auth.instagramNote', 'Instagram accounts sign in via Facebook — Meta no longer provides standalone Instagram login for third-party websites.')}
      </p>
    </>
  );
}

SocialLogins.propTypes = { onGoogle: PropTypes.func, label: PropTypes.string };
