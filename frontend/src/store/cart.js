import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { catalogProducts } from '../data/products.jsx';

// Convertit un prix ("128 €", "156,00 €", 104) en nombre.
export const parseEuro = (s) =>
  typeof s === 'number' ? s : parseFloat(String(s).replace(',', '.').replace(/[^\d.]/g, '')) || 0;

// Le store ne conserve QUE des primitives (sérialisable dans localStorage) :
// le visuel SVG est ré-résolu à l'affichage via figureBySlug[slug].
const seedItem = (p, qty) => ({
  slug: p.slug, name: p.name, cat: p.cat, moq: p.moq, unit: parseEuro(p.priceNew), qty,
});

const seed = [
  seedItem(catalogProducts[0], 2),
  seedItem(catalogProducts[2], 1),
  seedItem(catalogProducts[3], 1),
];

export const useCart = create(
  persist(
    (set) => ({
      items: seed,

      add: (p, qty = 1) =>
        set((state) => {
          const unit = parseEuro(p.unit ?? p.priceNew);
          const i = state.items.findIndex((x) => x.slug === p.slug);
          if (i >= 0) {
            const items = [...state.items];
            items[i] = { ...items[i], qty: items[i].qty + qty };
            return { items };
          }
          return {
            items: [...state.items, { slug: p.slug, name: p.name, cat: p.cat, moq: p.moq, unit, qty }],
          };
        }),

      setQty: (slug, delta) =>
        set((state) => ({
          items: state.items.map((x) =>
            x.slug === slug ? { ...x, qty: Math.max(1, x.qty + delta) } : x
          ),
        })),

      remove: (slug) => set((state) => ({ items: state.items.filter((x) => x.slug !== slug) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'ml-cart' }
  )
);

// Nombre total d'articles (pour le badge d'en-tête).
export const useCartCount = () => useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
