// Adaptateur entre le catalogue de l'API et la forme attendue par ProductCard.
// Un seul endroit à corriger le jour où le sérialiseur public change.
import { defaultFigure, figureBySlug } from '../data/products.jsx';

/** "128.00" -> "128 €" ; "128.50" -> "128,50 €". */
export const formatEuro = (value) => {
  if (value == null || value === '') return undefined;
  const n = parseFloat(value);
  if (Number.isNaN(n)) return undefined;
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`;
};

/** Remise affichée sur la vignette, calculée à partir des deux prix. */
const badgeFor = (price, originalPrice) => {
  const p = parseFloat(price);
  const o = parseFloat(originalPrice);
  if (!o || !p || o <= p) return undefined;
  return `-${Math.round((1 - p / o) * 100)}%`;
};

/**
 * Produit de l'API -> produit d'affichage. Le visuel est la photo téléversée
 * depuis le back-office ; à défaut, on retombe sur le tracé SVG du slug, puis
 * sur le motif générique.
 */
export const productFromApi = (p) => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  cat: p.category || undefined,
  priceNew: formatEuro(p.price),
  priceOld: formatEuro(p.original_price),
  badge: badgeFor(p.price, p.original_price),
  image: p.image || undefined,
  // Repli tant qu'aucune photo n'a été téléversée pour ce produit.
  figure: figureBySlug[p.slug] || defaultFigure,
});

export const productsFromApi = (data) => (data?.results || data || []).map(productFromApi);
