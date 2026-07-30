import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SiteLayout from './components/SiteLayout.jsx';
import Home from './pages/Home.jsx';
import Category from './pages/Category.jsx';
import Product from './pages/Product.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderConfirmation from './pages/OrderConfirmation.jsx';
import Contact from './pages/Contact.jsx';
import Faq from './pages/Faq.jsx';
import Shipping from './pages/Shipping.jsx';
import NotFound from './pages/NotFound.jsx';

// Espace client — coquille autonome, indépendante de la boutique
import RequireAuth from './pages/account/RequireAuth.jsx';
import AccountLayout from './pages/account/AccountLayout.jsx';
import Overview from './pages/account/Overview.jsx';
import MyOrders from './pages/account/MyOrders.jsx';
import MyQuotes from './pages/account/MyQuotes.jsx';
import Profile from './pages/account/Profile.jsx';
import ProAccess from './pages/account/ProAccess.jsx';
import Wishlist from './pages/Wishlist.jsx';
import Login from './pages/account/Login.jsx';
import Register from './pages/account/Register.jsx';
import OAuthCallback from './pages/account/OAuthCallback.jsx';
import ForgotPassword from './pages/account/ForgotPassword.jsx';
import ResetPassword from './pages/account/ResetPassword.jsx';
import Shop from './pages/account/Shop.jsx';
import AccountCart from './pages/account/AccountCart.jsx';

// L'admin a sa propre feuille de style ; on la charge à la demande (routes /gestion/*)
// pour éviter de mêler ses styles à ceux de la boutique.
const AdminRoutes = lazy(() => import('./pages/admin/AdminRoutes.jsx'));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ---------- Boutique ---------- */}
        <Route element={<SiteLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/boutique" element={<Category />} />
          <Route path="/nouveautes" element={<Category title="Nouveautés" count={36} />} />
          <Route path="/promotions" element={<Category title="Promotions" count={24} />} />
          <Route path="/produit/:slug" element={<Product />} />
          <Route path="/pro" element={<Navigate to="/compte/pro" replace />} />

          {/* Tunnel d'achat */}
          <Route path="/panier" element={<Cart />} />
          <Route path="/checkout" element={<Navigate to="/compte/checkout" replace />} />
          <Route path="/commande/confirmee" element={<OrderConfirmation />} />

          {/* Contenu / aide */}
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/livraison" element={<Shipping />} />

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* ---------- Authentification (plein écran, sans habillage boutique) ---------- */}
        <Route path="/compte/connexion" element={<Login />} />
        <Route path="/compte/inscription" element={<Register />} />
        <Route path="/compte/connexion/callback" element={<OAuthCallback />} />
        <Route path="/compte/mot-de-passe-oublie" element={<ForgotPassword />} />
        <Route path="/compte/mot-de-passe/:uid/:token" element={<ResetPassword />} />

        {/* ---------- Espace client (protégé, coquille autonome) ---------- */}
        <Route element={<RequireAuth />}>
          <Route path="/compte" element={<AccountLayout />}>
            <Route index element={<Overview />} />
            <Route path="boutique" element={<Shop />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="commandes" element={<MyOrders />} />
            <Route path="devis" element={<MyQuotes />} />
            <Route path="favoris" element={<Wishlist />} />
            <Route path="profil" element={<Profile />} />
            <Route path="pro" element={<ProAccess />} />
          </Route>
        </Route>
        {/* Ancien lien public des favoris */}
        <Route path="/favoris" element={<Navigate to="/compte/favoris" replace />} />

        {/* ---------- Administration ---------- */}
        <Route
          path="/gestion/*"
          element={
            <Suspense fallback={<div style={{ padding: 40 }}>Chargement…</div>}>
              <AdminRoutes />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
