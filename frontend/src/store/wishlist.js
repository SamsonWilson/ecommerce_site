import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Favoris conservés dans le navigateur, comme le panier. Comme lui, on ne
// stocke que des primitives : le visuel SVG est ré-résolu à l'affichage.
const snapshot = (p) => ({
  slug: p.slug, name: p.name, cat: p.cat,
  priceNew: p.priceNew, priceOld: p.priceOld, badge: p.badge,
});

export const useWishlist = create(
  persist(
    (set, get) => ({
      items: [],

      /** Ajoute ou retire selon l'état courant — c'est l'action du cœur. */
      toggle: (product) =>
        set((state) => {
          const exists = state.items.some((x) => x.slug === product.slug);
          return {
            items: exists
              ? state.items.filter((x) => x.slug !== product.slug)
              : [...state.items, snapshot(product)],
          };
        }),

      remove: (slug) => set((state) => ({ items: state.items.filter((x) => x.slug !== slug) })),
      clear: () => set({ items: [] }),
      has: (slug) => get().items.some((x) => x.slug === slug),
    }),
    { name: 'ml-wishlist' }
  )
);

export const useWishlistCount = () => useWishlist((s) => s.items.length);
