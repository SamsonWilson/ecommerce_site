import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import fr from './locales/fr.json';
import zh from './locales/zh.json';

export const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'zh', label: '中文', name: '中文' },
];

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('lang') : null;
const initialLng = savedLang && ['en', 'fr', 'zh'].includes(savedLang) ? savedLang : 'en';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      zh: { translation: zh },
    },
    lng: initialLng,
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr', 'zh'],
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'lang',
    },
    interpolation: { escapeValue: false },
  });

// Synchronisation de <html lang>
const applyLang = (lng) => { document.documentElement.lang = lng || 'en'; };
applyLang(i18n.resolvedLanguage || initialLng || 'en');
i18n.on('languageChanged', (lng) => {
  applyLang(lng);
  try {
    localStorage.setItem('lang', lng);
  } catch {}
});

export default i18n;
