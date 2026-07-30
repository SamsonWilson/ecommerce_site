import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../store/auth.js';

// Écran d'atterrissage de chaque section : sert aussi à rediriger un employé
// qui n'a pas accès au tableau de bord (un livreur, par exemple).
export const SECTION_HOME = {
  dashboard: '/gestion',
  orders: '/gestion/commandes',
  customers: '/gestion/clients',
  promotions: '/gestion/promotions',
  b2b: '/gestion/comptes-pro',
  catalog: '/gestion/produits',
  deliveries: '/gestion/livraisons',
  staff: '/gestion/equipe',
};

/** Première page utile pour ce rôle. */
export const landingFor = (sections = []) => {
  const first = sections.find((s) => SECTION_HOME[s]);
  return first ? SECTION_HOME[first] : '/gestion/livraisons';
};

/**
 * Filtre d'affichage : le backend refuse déjà les appels hors périmètre
 * (accounts.permissions.HasStaffSection), on évite ici d'afficher un écran
 * que l'employé ne pourrait pas alimenter.
 */
export default function Guard({ section, children }) {
  const user = useAuth((s) => s.user);
  const sections = user?.sections || [];

  if (!sections.includes(section)) {
    const home = landingFor(sections);
    if (home === window.location.pathname) {
      return <div className="admin-gate"><p>Votre rôle ne donne accès à aucune section.</p></div>;
    }
    return <Navigate to={home} replace />;
  }
  return children;
}
Guard.propTypes = { section: PropTypes.string.isRequired, children: PropTypes.node };
