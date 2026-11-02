import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n/config.js';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || 'en').slice(0, 2).toLowerCase();

  const [published, setPublished] = useState(() => {
    try {
      const saved = localStorage.getItem('published_langs');
      return saved ? JSON.parse(saved) : ['en', 'fr', 'zh'];
    } catch {
      return ['en', 'fr', 'zh'];
    }
  });

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem('published_langs');
        if (saved) setPublished(JSON.parse(saved));
      } catch { }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const activeLangs = LANGUAGES.filter((l) => published.includes(l.code));
  const listToDisplay = activeLangs.length ? activeLangs : LANGUAGES;

  return (
    <nav className="langs" aria-label={t('common.language', 'Language')}>
      {listToDisplay.map((l, i) => (
        <span key={l.code}>
          {i > 0 && <span aria-hidden="true">|</span>}
          <button
            type="button"
            className={l.code === current ? 'active' : undefined}
            aria-current={l.code === current ? 'true' : undefined}
            onClick={() => i18n.changeLanguage(l.code)}
          >
            {l.label}
          </button>
        </span>
      ))}
    </nav>
  );
}
