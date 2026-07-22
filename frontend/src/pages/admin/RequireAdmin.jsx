import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/auth.js';

// Garde d'accès : restaure la session (cookie httpOnly), puis n'autorise
// l'administration qu'aux comptes `is_staff`.
export default function RequireAdmin() {
  const { user, status, bootstrap } = useAuth();
  const location = useLocation();

  useEffect(() => { bootstrap(); }, [bootstrap]);

  if (status === 'idle' || status === 'loading') {
    return <div className="admin-gate">Vérification de la session…</div>;
  }

  if (status === 'anonymous') {
    return <Navigate to="/gestion/connexion" replace state={{ from: location.pathname }} />;
  }

  if (!user?.is_staff) {
    return (
      <div className="admin-gate">
        <h2>Accès refusé</h2>
        <p>Ce compte n'a pas les droits d'administration.</p>
        <Navigate to="/gestion/connexion" replace />
      </div>
    );
  }

  return <Outlet />;
}
