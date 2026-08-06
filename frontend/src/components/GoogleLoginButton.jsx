import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

// Bouton « Continuer avec Google » (Google Identity Services).
// Récupère un ID token côté client et le transmet à onSuccess(credential),
// que le parent envoie à POST /api/v1/auth/google/ (vérification + création).
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function GoogleLoginButton({ onSuccess, text = 'continue_with' }) {
  const ref = useRef(null);
  const [clientId, setClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
  const [loading, setLoading] = useState(!import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!clientId) {
      fetch('/api/v1/auth/config/')
        .then((res) => res.json())
        .then((data) => {
          if (data.google_client_id) {
            setClientId(data.google_client_id);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return undefined;

    const init = () => {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => onSuccess?.(resp.credential),
        });
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'outline', size: 'large', width: 190, text,
        });
      } catch {
        setFailed(true);
      }
    };

    if (window.google?.accounts?.id) { init(); } else {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = init;
      s.onerror = () => setFailed(true);
      document.body.appendChild(s);
    }

    // Si Google refuse l'origine ou l'identifiant, le conteneur reste vide :
    // on le détecte pour afficher une piste plutôt qu'un blanc inexplicable.
    const t = setTimeout(() => {
      if (ref.current && ref.current.childElementCount === 0) setFailed(true);
    }, 2500);
    return () => clearTimeout(t);
  }, [clientId, onSuccess, text]);

  if (loading) return null;

  if (!clientId) {
    return (
      <p className="social-note">
        Connexion Google indisponible : <code>GOOGLE_CLIENT_ID</code> n'est pas
        renseigné dans le fichier <code>.env</code>.
      </p>
    );
  }

  return (
    <>
      <div ref={ref} style={{ display: 'flex', justifyContent: 'center', width: '100%' }} />
      {failed && (
        <p className="social-note">
          Le bouton Google n'a pas pu se charger. Vérifiez que l'adresse{' '}
          <code>{typeof window !== 'undefined' ? window.location.origin : ''}</code>{' '}
          figure dans les « origines JavaScript autorisées » de votre ID client Google.
        </p>
      )}
    </>
  );
}

GoogleLoginButton.propTypes = { onSuccess: PropTypes.func, width: PropTypes.number, text: PropTypes.string };
