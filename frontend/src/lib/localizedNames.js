// Le panier et les favoris gardent le nom d'un article dans le navigateur :
// on le remet dans la langue affichée au démarrage et à chaque changement.
import i18n from '../i18n/config.js';
import { api } from './api.js';
import { useCart } from '../store/cart.js';
import { useWishlist } from '../store/wishlist.js';

async function refreshSavedNames() {
  const slugs = [...new Set([...useCart.getState().items, ...useWishlist.getState().items].map((item) => item.slug))];
  const results = await Promise.allSettled(slugs.map((slug) => api.product(slug)));
  const names = Object.fromEntries(
    results.filter((r) => r.status === 'fulfilled').map(({ value }) => [value.slug, value])
  );
  const rename = (item) => {
    const product = names[item.slug];
    return product ? { ...item, name: product.name, cat: product.category?.name ?? item.cat } : item;
  };
  useCart.setState((state) => ({ items: state.items.map(rename) }));
  useWishlist.setState((state) => ({ items: state.items.map(rename) }));
}

i18n.on('languageChanged', refreshSavedNames);
refreshSavedNames();
