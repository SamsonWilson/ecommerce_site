import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, setAccessToken } from '../../lib/api.js';
import { useAuth } from '../../store/auth.js';
import { OAUTH_REDIRECT } from '../../components/SocialLogins.jsx';

// Retour du fournisseur OAuth : on échange le `code` contre nos propres JWT.
export default function OAuthCallback() {
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

    if (denied) { setError('Connexion annulée.'); return; }
    if (!code || !provider) { setError('Réponse incomplète du fournisseur.'); return; }
    // Protection CSRF : le state doit correspondre à celui que nous avons émis.
    if (!state || state !== expectedState) { setError('Jeton de sécurité invalide.'); return; }

    api.socialLogin(provider, { code, callback_url: OAUTH_REDIRECT() })
      .then(async ({ access }) => {
        setAccessToken(access);
        const user = await api.me();
        useAuth.setState({ user, status: 'authenticated' });
        navigate('/compte', { replace: true });
      })
      .catch((e) => setError(e.data?.detail || 'La connexion a échoué.'));
  }, [params, navigate]);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-body" style={{ textAlign: 'center' }}>
          {error ? (
            <>
              <p className="social-error">{error}</p>
              <Link to="/compte/connexion" className="btn-primary">Retour à la connexion</Link>
            </>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Connexion en cours…</p>
          )}
        </div>
      </div>
    </div>
  );
}
