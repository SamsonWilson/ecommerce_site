import { api } from './api.js';

// Paiement en ligne : redirection vers la page hébergée par Airwallex. Le
// numéro de carte n'est jamais saisi sur ce site. Le SDK n'est téléchargé
// qu'au moment de payer, pour ne pas alourdir le reste du site.
const LOCALES = { fr: 'fr', en: 'en', zh: 'zh' };

export async function redirectToProvider(params) {
  if (params.provider !== 'airwallex') {
    throw new Error(`Prestataire inconnu : ${params.provider}`);
  }
  const { init } = await import('@airwallex/components-sdk');
  const locale = LOCALES[params.locale] || 'en';
  const { payments } = await init({ env: params.env, enabledElements: ['payments'], locale });
  payments.redirectToCheckout({
    env: params.env,
    intent_id: params.intent_id,
    client_secret: params.client_secret,
    currency: params.currency,
    country_code: params.country_code || undefined,
    successUrl: params.success_url,
    cancelUrl: params.cancel_url,
    locale,
  });
}

// Ouvre une tentative de paiement pour une commande, puis redirige.
export async function startOnlinePayment(reference, token) {
  const params = await api.startPayment({ reference, token });
  await redirectToProvider(params);
}

export const paymentReturnPath = (reference, token, extra = {}) =>
  `/commande/paiement?${new URLSearchParams({ ref: reference, token, ...extra })}`;

// Statuts où l'argent est encaissé.
export const PAID_STATUSES = ['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED'];
