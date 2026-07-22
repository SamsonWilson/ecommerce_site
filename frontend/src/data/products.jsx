// Données produits factices pour les maquettes. Les « visuels » sont des
// tracés SVG (line art) repris des maquettes, en attendant les vraies photos.

const fig = (stroke, children) => (
  <svg viewBox="0 0 200 220" fill="none" stroke={stroke} strokeWidth="1.3">{children}</svg>
);

// Catalogue « Style chinois » (page catégorie)
export const catalogProducts = [
  {
    slug: 'epingle-phenix-cinabre', cat: 'Épingles', name: 'Épingle Phénix Cinabre',
    priceNew: '128 €', priceOld: '160 €', badge: '-20%', moq: 'MOQ grossiste : 12 pièces',
    figure: fig('#B91C14', <><path d="M100 30 C 70 70, 70 130, 100 170 C130 130,130 70,100 30Z"/><path d="M100 170 L 100 205"/></>),
  },
  {
    slug: 'eventail-brode-pivoine', cat: 'Éventails', name: 'Éventail Brodé Pivoine',
    priceNew: '72 €', moq: 'MOQ grossiste : 12 pièces',
    figure: fig('#7C1F2C', <path d="M50 110 h100 M60 90 q 40 -30 80 0 M60 130 q 40 30 80 0"/>),
  },
  {
    slug: 'peigne-laque-rouge', cat: 'Épingles & peignes', name: 'Peigne Laque Rouge',
    priceNew: '79 €', priceOld: '88 €', badge: '-10%', moq: 'MOQ grossiste : 12 pièces',
    figure: fig('#7C1F2C', <path d="M70 40 L 130 40 M 100 40 L 100 190 M70 100 L130 100"/>),
  },
  {
    slug: 'bracelet-jade-or', cat: 'Bracelets', name: 'Bracelet Jade & Or',
    priceNew: '104 €', moq: 'MOQ grossiste : 24 pièces',
    figure: fig('#7C1F2C', <path d="M100 40 v140 M70 60 h60 M70 100 h60 M70 140 h60"/>),
  },
  {
    slug: 'pendants-perle-jade', cat: "Boucles d'oreilles", name: 'Pendants Perle de Jade',
    priceNew: '68 €', moq: 'MOQ grossiste : 24 paires',
    figure: fig('#7C1F2C', <><circle cx="100" cy="80" r="30"/><path d="M100 110 v90"/></>),
  },
  {
    slug: 'tiare-xiuhe-doree', cat: 'Diadèmes & tiares', name: 'Tiare Xiuhe Dorée',
    priceNew: '142 €', priceOld: '168 €', badge: '-15%', moq: 'MOQ grossiste : 12 pièces',
    figure: fig('#7C1F2C', <path d="M60 100 q 40 -60 80 0 q -40 60 -80 0Z"/>),
  },
  {
    slug: 'epingle-double-bonheur', cat: 'Épingles & peignes', name: 'Épingle Double Bonheur',
    priceNew: '98 €', moq: 'MOQ grossiste : 12 pièces',
    figure: fig('#7C1F2C', <path d="M60 80 h80 M60 130 h80 M100 60 v100"/>),
  },
  {
    slug: 'eventail-soie-rouge', cat: 'Éventails', name: 'Éventail Soie Rouge',
    priceNew: '66 €', moq: 'MOQ grossiste : 12 pièces',
    figure: fig('#7C1F2C', <path d="M70 60 q 30 -20 60 0 q -30 100 -60 0Z"/>),
  },
];

// Meilleures ventes (accueil) — avec note en étoiles
export const bestSellers = [
  {
    slug: 'epingle-phenix-cinabre', cat: 'Style chinois', name: 'Épingle Phénix Cinabre',
    priceNew: '128 €', priceOld: '160 €', badge: '-20%', moq: 'MOQ grossiste : 12 pièces', rating: 4.5,
    figure: fig('#B91C14', <><path d="M100 30 C 70 70, 70 130, 100 170 C130 130,130 70,100 30Z"/><path d="M100 170 L 100 205"/></>),
  },
  {
    slug: 'diademe-perles-douces', cat: 'Romance occidentale', name: 'Diadème Perles Douces',
    priceNew: '96 €', moq: 'MOQ grossiste : 12 pièces', rating: 5,
    figure: fig('#7C1F2C', <><path d="M60 60 q 40 -20 80 0"/><path d="M60 60 q 0 60 40 90 q 40 -30 40 -90"/></>),
  },
  {
    slug: 'boucles-larme-cristal', cat: 'Romance occidentale', name: 'Boucles Larme de Cristal',
    priceNew: '54 €', priceOld: '64 €', badge: '-15%', moq: 'MOQ grossiste : 24 paires', rating: 4.5,
    figure: fig('#7C1F2C', <path d="M70 60 L 130 60 M 70 60 C 70 120, 100 160,100 190 M130 60 C130 120,100 160,100 190"/>),
  },
  {
    slug: 'eventail-brode-pivoine', cat: 'Style chinois', name: 'Éventail Brodé Pivoine',
    priceNew: '72 €', moq: 'MOQ grossiste : 12 pièces', rating: 5,
    figure: fig('#7C1F2C', <path d="M50 110 h100 M60 90 q 40 -30 80 0 M60 130 q 40 30 80 0"/>),
  },
];

// Produits associés (fiche produit)
export const relatedProducts = catalogProducts.slice(1, 5);

// Map slug -> visuel SVG. Permet aux produits venus de l'API de réutiliser
// l'illustration correspondante (les slugs de l'API sont alignés sur le mock).
export const figureBySlug = Object.fromEntries(
  [...catalogProducts, ...bestSellers].map((p) => [p.slug, p.figure])
);

export const defaultFigure = fig('#B0894A', <circle cx="100" cy="110" r="55" />);
