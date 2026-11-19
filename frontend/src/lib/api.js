import i18n from '../i18n/config.js';

// Client API centralisé (cf. ARCHITECTURE.md §3 : aucun fetch dispersé).
// Base relative "/api/v1" -> tout passe par le reverse proxy nginx :
// l'URL du backend n'apparaît jamais dans le navigateur.
const BASE = import.meta.env.VITE_API_URL || '/api/v1';

let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;

// Un seul rafraîchissement à la fois : si trois appels tombent en 401 en même
// temps, ils attendent le même échange de jeton au lieu d'en lancer trois.
let refreshing = null;

async function refreshAccessToken() {
  if (!refreshing) {
    refreshing = request('/auth/refresh/', { method: 'POST' })
      .then(({ access }) => { setAccessToken(access); return access; })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

async function request(path, { method = 'GET', body, auth = false, retry = true } = {}) {
  // Un FormData (téléversement de photo) part tel quel : c'est le navigateur
  // qui pose le Content-Type avec la frontière multipart.
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = isForm ? {} : { 'Content-Type': 'application/json' };
  // Le serveur renvoie le catalogue dans la langue du visiteur.
  headers['Accept-Language'] = i18n.resolvedLanguage || 'fr';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    credentials: 'include', // envoie/reçoit le cookie httpOnly de refresh
    body: isForm ? body : (body ? JSON.stringify(body) : undefined),
  });

  // Le jeton d'accès ne vit que 15 minutes. Un formulaire rempli tranquillement
  // dépasse ce délai : plutôt que d'échouer, on rejoue l'appel une fois avec un
  // jeton frais obtenu via le cookie de refresh.
  if (res.status === 401 && auth && retry) {
    try {
      await refreshAccessToken();
      return await request(path, { method, body, auth, retry: false });
    } catch {
      /* refresh impossible : on laisse remonter le 401 d'origine */
    }
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw Object.assign(new Error('Erreur API'), { status: res.status, data });
  }
  return data;
}

const qs = (params = {}) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  ).toString();
  return s ? `?${s}` : '';
};

/** Traduit le catalogue lot par lot jusqu'à ce qu'il ne reste rien à faire. */
export async function translatePending(onProgress) {
  let result;
  do {
    result = await api.adminRunTranslations();
    onProgress?.(result);
  } while (result.translated > 0 && result.remaining > 0);
  return result;
}

/** Traduit des textes qui ne sont pas stockés sur le serveur. Renvoie `{ zh: {...}, en: {...} }`. */
export async function translateTexts(texts) {
  const entries = await Promise.all(['zh', 'en'].map(async (lang) => {
    const { translations } = await api.adminTranslateTexts(lang, texts);
    return [lang, translations];
  }));
  return Object.fromEntries(entries);
}

export const api = {
  // Catalogue (public)
  products: (params) => request(`/products/${qs(params)}`),
  product: (slug) => request(`/products/${slug}/`),
  categories: () => request('/categories/'),
  colors: () => request('/colors/'),

  // Devis B2B
  // Connecté : le devis est rattaché au compte et suivi dans l'espace pro.
  createQuote: (d) => request('/quotes/', { method: 'POST', body: d, auth: true }),
  myQuotes: () => request('/quotes/', { auth: true }),

  // Back-office (exige un compte is_staff)
  adminQuotes: (params) => request(`/admin/quotes/${qs(params)}`, { auth: true }),
  adminUpdateQuote: (id, d) => request(`/admin/quotes/${id}/`, { method: 'PATCH', body: d, auth: true }),
  adminCustomers: (params) => request(`/admin/customers/${qs(params)}`, { auth: true }),
  adminApprove: (id) => request(`/admin/customers/${id}/approve/`, { method: 'POST', auth: true }),
  adminReject: (id) => request(`/admin/customers/${id}/reject/`, { method: 'POST', auth: true }),
  adminSetTier: (id, priceTier) =>
    request(`/admin/customers/${id}/`, { method: 'PATCH', body: { price_tier: priceTier }, auth: true }),
  // Seul chemin vers le statut grossiste : une décision d'administrateur.
  adminToWholesale: (id, priceTier) =>
    request(`/admin/customers/${id}/to-wholesale/`, { method: 'POST', body: { price_tier: priceTier }, auth: true }),
  adminToRetail: (id) => request(`/admin/customers/${id}/to-retail/`, { method: 'POST', auth: true }),
  // Équipe interne — réservé au rôle ADMIN (cf. accounts.permissions.IsStaffAdmin)
  adminStaff: (params) => request(`/admin/staff/${qs(params)}`, { auth: true }),
  adminStaffRoles: () => request('/admin/staff/roles/', { auth: true }),
  adminStaffSections: () => request('/admin/staff/sections/', { auth: true }),
  adminCreateStaff: (d) => request('/admin/staff/', { method: 'POST', body: d, auth: true }),
  adminUpdateStaff: (id, d) => request(`/admin/staff/${id}/`, { method: 'PATCH', body: d, auth: true }),
  adminSetStaffRole: (id, role) =>
    request(`/admin/staff/${id}/set-role/`, { method: 'POST', body: { role }, auth: true }),
  adminSetStaffSections: (id, sections) =>
    request(`/admin/staff/${id}/set-sections/`, { method: 'POST', body: { sections }, auth: true }),
  adminActivateStaff: (id) => request(`/admin/staff/${id}/activate/`, { method: 'POST', auth: true }),
  adminDeactivateStaff: (id) => request(`/admin/staff/${id}/deactivate/`, { method: 'POST', auth: true }),
  // `password` vide => le backend en génère un et le renvoie (une seule fois).
  adminResetStaffPassword: (id, password) =>
    request(`/admin/staff/${id}/reset-password/`, { method: 'POST', body: { password }, auth: true }),

  // Catalogue (back-office) — seule voie exposant les prix de gros
  adminProducts: (params) => request(`/admin/products/${qs(params)}`, { auth: true }),
  adminCreateProduct: (d) => request('/admin/products/', { method: 'POST', body: d, auth: true }),
  adminUpdateProduct: (id, d) => request(`/admin/products/${id}/`, { method: 'PATCH', body: d, auth: true }),
  adminDeleteProduct: (id) => request(`/admin/products/${id}/`, { method: 'DELETE', auth: true }),
  // Photos produit (multipart) — la première sert de vignette en boutique.
  adminUploadProductImage: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return request(`/admin/products/${id}/media/`, { method: 'POST', body: form, auth: true });
  },
  adminDeleteProductImage: (id, mediaId) =>
    request(`/admin/products/${id}/media/${mediaId}/`, { method: 'DELETE', auth: true }),

  // Gestion des stocks et historique des mouvements
  adminStock: (params) => request(`/admin/stock/${qs(params)}`, { auth: true }),
  adminAdjustStock: (id, data) => request(`/admin/stock/${id}/adjust/`, { method: 'POST', body: data, auth: true }),
  adminStockMovements: (params) => request(`/admin/stock-movements/${qs(params)}`, { auth: true }),

  // Taxonomies du catalogue (catégories, coloris, moments)
  adminCategories: () => request('/admin/categories/', { auth: true }),
  adminCreateCategory: (d) => request('/admin/categories/', { method: 'POST', body: d, auth: true }),
  adminUpdateCategory: (id, d) => request(`/admin/categories/${id}/`, { method: 'PATCH', body: d, auth: true }),
  adminDeleteCategory: (id) => request(`/admin/categories/${id}/`, { method: 'DELETE', auth: true }),

  adminColors: () => request('/admin/colors/', { auth: true }),
  adminCreateColor: (d) => request('/admin/colors/', { method: 'POST', body: d, auth: true }),
  adminUpdateColor: (id, d) => request(`/admin/colors/${id}/`, { method: 'PATCH', body: d, auth: true }),
  adminDeleteColor: (id) => request(`/admin/colors/${id}/`, { method: 'DELETE', auth: true }),

  adminPriceTiers: () => request('/admin/price-tiers/', { auth: true }),
  adminCreateTier: (d) => request('/admin/price-tiers/', { method: 'POST', body: d, auth: true }),
  adminUpdateTier: (id, d) => request(`/admin/price-tiers/${id}/`, { method: 'PATCH', body: d, auth: true }),

  // Inscription via django-allauth (envoie l'e-mail de confirmation)
  register: (d) => request('/auth/registration/', { method: 'POST', body: d }),
  login: (d) => request('/auth/login/', { method: 'POST', body: d }),
  google: (credential) => request('/auth/google/', { method: 'POST', body: { credential } }),
  socialLogin: (provider, body) => request(`/auth/${provider}/`, { method: 'POST', body }),
  // Mot de passe oublié
  passwordReset: (email) => request('/auth/password/reset/', { method: 'POST', body: { email } }),
  passwordResetConfirm: (d) => request('/auth/password/reset/confirm/', { method: 'POST', body: d }),

  refresh: () => request('/auth/refresh/', { method: 'POST' }),
  logout: () => request('/auth/logout/', { method: 'POST' }),
  me: () => request('/auth/me/', { auth: true }),
  updateMe: (d) => request('/auth/me/', { method: 'PATCH', body: d, auth: true }),

  // Panier serveur
  getCart: () => request('/cart/', { auth: true }),
  addCartItem: (d) => request('/cart/items/', { method: 'POST', body: d, auth: true }),
  updateCartItem: (id, quantity) => request(`/cart/items/${id}/`, { method: 'PATCH', body: { quantity }, auth: true }),
  removeCartItem: (id) => request(`/cart/items/${id}/`, { method: 'DELETE', auth: true }),
  syncCart: (items) => request('/cart/sync/', { method: 'POST', body: { items }, auth: true }),

  // Commandes ET Paiements
  checkout: (d) => request('/checkout/', { method: 'POST', body: d, auth: true }),
  // Frais de port calculés par le serveur (connecté : prix pro pris en compte).
  shippingCountries: () => request('/shipping/countries/'),
  shippingOptions: (d) => request('/shipping/options/', { method: 'POST', body: d, auth: true }),
  // Paiement en ligne : le serveur crée le paiement, le prestataire l'encaisse,
  // et seul son webhook signé fait passer la commande en « payée ».
  // Connecté : le virement n'est proposé qu'aux grossistes validés.
  paymentConfig: () => request('/payments/config/', { auth: true }),
  startPayment: (d) => request('/payments/start/', { method: 'POST', body: d }),
  paymentStatus: (ref, token) => request(`/payments/status/${qs({ ref, token })}`),
  myOrders: () => request('/orders/', { auth: true }),
  orderDetail: (ref) => request(`/orders/${ref}/`, { auth: true }),
  confirmOrderDelivery: (ref, pin) => request(`/orders/${ref}/confirm-delivery/`, { method: 'POST', body: { pin }, auth: true }),

  // Traduction du catalogue — `run` traduit un lot, à rappeler tant qu'il en reste.
  adminTranslations: () => request('/admin/translations/', { auth: true }),
  adminRunTranslations: () => request('/admin/translations/run/', { method: 'POST', auth: true }),
  adminTranslateTexts: (lang, texts) =>
    request('/admin/translations/texts/', { method: 'POST', body: { lang, texts }, auth: true }),

  // Administration des Commandes
  adminOrders: (params) => request(`/admin/orders/${qs(params)}`, { auth: true }),
  adminOrderDetail: (id) => request(`/admin/orders/${id}/`, { auth: true }),
  adminUpdateOrder: (id, d) => request(`/admin/orders/${id}/`, { method: 'PATCH', body: d, auth: true }),
  adminRefundOrder: (id, d) => request(`/admin/orders/${id}/refund/`, { method: 'POST', body: d, auth: true }),
  adminRecordTransfer: (id, d) => request(`/admin/orders/${id}/record-transfer/`, { method: 'POST', body: d, auth: true }),
  adminSendQuote: (id, d) => request(`/admin/quotes/${id}/send/`, { method: 'POST', body: d, auth: true }),
  // Devis ouvert par le lien secret envoyé au client (sans compte).
  quoteView: (ref, token) => request(`/quotes/view/${qs({ ref, token })}`),
  acceptQuote: (d) => request('/quotes/accept/', { method: 'POST', body: d }),
};

// Premier message lisible d'une erreur de l'API ({detail}, ou erreurs par champ).
export function apiErrorMessage(err, fallback) {
  const find = (value) => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(find).find(Boolean);
    if (value && typeof value === 'object') return find(value.detail) || Object.values(value).map(find).find(Boolean);
    return null;
  };
  return find(err?.data) || fallback;
}
