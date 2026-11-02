import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/auth.js';

// Restaure la session depuis le cookie httpOnly, puis protège l'espace client.
export default function RequireAuth() {
  const { t } = useTranslation();
  const { status, bootstrap } = useAuth();
  const location = useLocation();

  useEffect(() => { bootstrap(); }, [bootstrap]);

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="acc-empty" style={{ padding: '90px 20px' }}>
        {t('account.shop.loadingSession', 'Loading your account…')}
      </div>
    );
  }
  if (status === 'anonymous') {
    return <Navigate to="/compte/connexion" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
