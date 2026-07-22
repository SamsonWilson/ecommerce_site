// Point d'entrée de l'administration : chargé à la demande (lazy) depuis App.jsx.
// Servi sur /gestion — /admin reste réservé à Django Admin (stratégie hybride).
import { Route, Routes } from 'react-router-dom';
import '../../styles/admin.css';

import AdminLayout from './AdminLayout.jsx';
import AdminLogin from './AdminLogin.jsx';
import RequireAdmin from './RequireAdmin.jsx';
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

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="connexion" element={<AdminLogin />} />

      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />

          {/* Détail — B2C */}
          <Route path="commandes" element={<Orders />} />
          <Route path="clients" element={<Customers />} />
          <Route path="promotions" element={<Promotions />} />

          {/* Gros — B2B */}
          <Route path="comptes-pro" element={<ProAccounts />} />
          <Route path="paliers" element={<PriceTiers />} />
          <Route path="devis" element={<Quotes />} />

          {/* Socle commun */}
          <Route path="produits" element={<Products />} />
          <Route path="categories" element={<Categories />} />
          <Route path="langues" element={<Languages />} />
        </Route>
      </Route>
    </Routes>
  );
}
