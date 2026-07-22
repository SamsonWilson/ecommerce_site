import { create } from 'zustand';
import { api, setAccessToken } from '../lib/api.js';

// Sécurité : le token d'accès reste EN MÉMOIRE (jamais dans localStorage, donc
// non exposé à une XSS). La session est restaurée au chargement via le cookie
// httpOnly de refresh, que seul le navigateur peut renvoyer au backend.
export const useAuth = create((set, get) => ({
  user: null,
  status: 'idle', // idle | loading | authenticated | anonymous

  /** Restaure la session depuis le cookie refresh (appelé au montage des zones protégées). */
  bootstrap: async () => {
    if (get().status === 'loading' || get().status === 'authenticated') return;
    set({ status: 'loading' });
    try {
      const { access } = await api.refresh();
      setAccessToken(access);
      const user = await api.me();
      set({ user, status: 'authenticated' });
    } catch {
      setAccessToken(null);
      set({ user: null, status: 'anonymous' });
    }
  },

  /** Connexion e-mail / mot de passe. Renvoie l'utilisateur. */
  login: async (email, password) => {
    const { access } = await api.login({ email, password });
    setAccessToken(access);
    const user = await api.me();
    set({ user, status: 'authenticated' });
    return user;
  },

  /** Connexion via un ID token Google (compte créé automatiquement si besoin). */
  loginGoogle: async (credential) => {
    const { access, user } = await api.google(credential);
    setAccessToken(access);
    set({ user, status: 'authenticated' });
    return user;
  },

  logout: async () => {
    try { await api.logout(); } catch { /* déjà déconnecté */ }
    setAccessToken(null);
    set({ user: null, status: 'anonymous' });
  },
}));
