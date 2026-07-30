// Point d'entrée de l'administration : chargé à la demande (lazy) depuis App.jsx.
// Servi sur /gestion — /admin reste réservé à Django Admin (stratégie hybride).
import { Route, Routes } from 'react-router-dom';
import '../../styles/admin.css';

import AdminLayout from './AdminLayout.jsx';
import AdminLogin from './AdminLogin.jsx';
import RequireAdmin from './RequireAdmin.jsx';
import Guard from './RequireSection.jsx';
import Dashboard from './Dashboard.jsx';

// Socle commun
import Products from './Products.jsx';
import Categories from './Categories.jsx';
import Languages from './Languages.jsx';

// Pôle détail (B2C)
import Orders from './Orders.jsx';
import Customers from './Customers.jsx';
import Promotions from './Promotions.jsx';

// Pôle gros (B2B)
import ProAccounts from './ProAccounts.jsx';
import PriceTiers from './PriceTiers.jsx';
import Quotes from './Quotes.jsx';

// Équipe interne
import Deliveries from './Deliveries.jsx';
import Employees from './Employees.jsx';

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="connexion" element={<AdminLogin />} />

      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Guard section="dashboard"><Dashboard /></Guard>} />

          {/* Détail — B2C */}
          <Route path="commandes" element={<Guard section="orders"><Orders /></Guard>} />
          <Route path="clients" element={<Guard section="customers"><Customers /></Guard>} />
          <Route path="promotions" element={<Guard section="promotions"><Promotions /></Guard>} />

          {/* Gros — B2B */}
          <Route path="comptes-pro" element={<Guard section="b2b"><ProAccounts /></Guard>} />
          <Route path="paliers" element={<Guard section="b2b"><PriceTiers /></Guard>} />
          <Route path="devis" element={<Guard section="b2b"><Quotes /></Guard>} />

          {/* Équipe interne */}
          <Route path="livraisons" element={<Guard section="deliveries"><Deliveries /></Guard>} />
          <Route path="equipe" element={<Guard section="staff"><Employees /></Guard>} />

          {/* Socle commun */}
          <Route path="produits" element={<Guard section="catalog"><Products /></Guard>} />
          <Route path="categories" element={<Guard section="catalog"><Categories /></Guard>} />
          <Route path="langues" element={<Guard section="catalog"><Languages /></Guard>} />
        </Route>
      </Route>
    </Routes>
  );
}
