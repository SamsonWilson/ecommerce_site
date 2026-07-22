import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import fr from './locales/fr.json';
import en from './locales/en.json';
import zh from './locales/zh.json';

export const LANGUAGES = [
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'zh', label: '中文', name: '中文' },
];

i18n
  .use(LanguageDetector) // détecte la langue (localStorage puis navigateur)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      zh: { translation: zh },
    },
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en', 'zh'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'lang',
    },
    interpolation: { escapeValue: false }, // React échappe déjà
  });

// Garde <html lang> synchronisé (SEO + accessibilité)
const applyLang = (lng) => { document.documentElement.lang = lng; };
applyLang(i18n.resolvedLanguage);
i18n.on('languageChanged', applyLang);

export default i18n;
