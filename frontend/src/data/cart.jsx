// Utilitaires panier (les articles vivent désormais dans le store Zustand).
export const eur = (n) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`;

export function cartTotals(items) {
  const subtotal = items.reduce((s, it) => s + it.unit * it.qty, 0);
  const shipping = subtotal >= 150 ? 0 : 6.9;
  return { subtotal, shipping, total: subtotal + shipping };
}
