import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/auth.js';

// Garde d'accès : restaure la session (cookie httpOnly), puis n'autorise
// l'administration qu'aux comptes `is_staff`.
export default function RequireAdmin() {
  const { t } = useTranslation();
  const { user, status, bootstrap } = useAuth();
  const location = useLocation();

  useEffect(() => { bootstrap(); }, [bootstrap]);

  if (status === 'idle' || status === 'loading') {
    return <div className="admin-gate">{t('admin.gate.verificationDeLaSession')}</div>;
  }

  if (status === 'anonymous') {
    return <Navigate to="/gestion/connexion" replace state={{ from: location.pathname }} />;
  }

  if (!user?.is_staff) {
    return (
      <div className="admin-gate">
        <h2>{t('admin.gate.accesRefuse')}</h2>
        <p>{t('admin.gate.ceCompteNAPasLes')}</p>
        <Navigate to="/gestion/connexion" replace />
      </div>
    );
  }

  return <Outlet />;
}
