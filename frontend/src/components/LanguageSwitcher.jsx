import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n/config.js';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage || 'fr';

  const [published, setPublished] = useState(() => {
    const saved = localStorage.getItem('published_langs');
    return saved ? JSON.parse(saved) : ['fr', 'en', 'zh'];
  });

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('published_langs');
      if (saved) setPublished(JSON.parse(saved));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const activeLangs = LANGUAGES.filter((l) => published.includes(l.code));
  const listToDisplay = activeLangs.length ? activeLangs : LANGUAGES;

  return (
    <nav className="langs" aria-label="Langue">
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
