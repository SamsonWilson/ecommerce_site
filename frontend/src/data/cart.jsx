// Utilitaires panier (les articles vivent désormais dans le store Zustand).
// 66 € pour un montant rond, 6,90 € sinon (jamais « 6,9 € »).
export const eur = (n) => {
  const cents = Math.round(n * 100) % 100 !== 0;
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 })} €`;
};

// Les frais de port dépendent du pays et du poids : seul le serveur les
// calcule, au moment de la commande (voir shippingOptions dans lib/api.js).
export function cartTotals(items) {
  const subtotal = items.reduce((s, it) => s + it.unit * it.qty, 0);
  return { subtotal };
}
