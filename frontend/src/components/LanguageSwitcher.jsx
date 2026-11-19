import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n/config.js';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage;

  return (
    <nav className="langs" aria-label={t('common.language')}>
      {LANGUAGES.map((l, i) => (
        <span key={l.code}>
          {i > 0 && <span aria-hidden="true">|</span>}
          <button
            type="button"
            className={l.code === current ? 'active' : undefined}
            aria-current={l.code === current ? 'true' : undefined}
            onClick={() => i18n.changeLanguage(l.code)}
            title={l.name}
          >
            {l.label}
          </button>
        </span>
      ))}
    </nav>
  );
}
