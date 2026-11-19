import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHead, Panel } from './ui.jsx';
import { api, translatePending } from '../../lib/api.js';
import { LANGUAGES } from '../../i18n/config.js';

const TARGETS = ['zh', 'en'];

const flatKeys = (tree, prefix = '') =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? flatKeys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );

const percent = (done, total) => (total ? Math.round((done / total) * 100) : 100);

function Progress({ value }) {
  return <span className={value === 100 ? 'status paid' : 'status pending'}>{value}%</span>;
}

export default function Languages() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.adminTranslations()
      .then(setStatus)
      .catch(() => setError(t('admin.languages.loadError')));
  }, [t]);

  const translate = async () => {
    setRunning(true);
    setError('');
    try {
      await translatePending(setStatus);
    } catch (err) {
      setError(err.data?.detail || t('admin.languages.runError'));
    } finally {
      setRunning(false);
    }
  };

  // Couverture réelle de l'interface : les clés de fr.json présentes dans chaque langue.
  const interfaceCoverage = useMemo(() => {
    const keys = flatKeys(i18n.getDataByLanguage('fr').translation);
    return Object.fromEntries(TARGETS.map((lang) => [
      lang,
      percent(keys.filter((key) => i18n.getResource(lang, 'translation', key) !== undefined).length, keys.length),
    ]));
  }, [i18n]);

  return (
    <>
      <PageHead title={t('admin.languages.title')} subtitle={t('admin.languages.subtitle')} />

      {error && <div className="alert-box alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="admin-row cols-2-1">
        <Panel
          title={t('admin.languages.catalogTitle')}
          action={(
            <button
              type="button"
              className="btn-admin primary"
              onClick={translate}
              disabled={running || status?.remaining === 0}
            >
              {running ? t('admin.languages.running') : t('admin.languages.run')}
            </button>
          )}
        >
          {status && (
            <p className="cell-sub" style={{ marginBottom: 14 }}>
              {status.engine === 'claude' ? t('admin.languages.engineClaude') : t('admin.languages.engineFree')}
            </p>
          )}
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.languages.content')}</th>
                  <th>{t('admin.languages.count')}</th>
                  {TARGETS.map((lang) => <th key={lang}>{lang.toUpperCase()}</th>)}
                </tr>
              </thead>
              <tbody>
                {status?.scopes.map((scope) => (
                  <tr key={scope.model}>
                    <td className="cell-main">{t(`admin.languages.models.${scope.model}`)}</td>
                    <td>{scope.total}</td>
                    {TARGETS.map((lang) => (
                      <td key={lang}><Progress value={percent(scope.translated[lang], scope.total)} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cell-sub" style={{ marginTop: 14, lineHeight: 1.6 }}>{t('admin.languages.catalogHelp')}</p>
        </Panel>

        <Panel title={t('admin.languages.interfaceTitle')}>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.languages.language')}</th>
                  <th>{t('admin.languages.coverage')}</th>
                  <th>{t('admin.languages.active')}</th>
                </tr>
              </thead>
              <tbody>
                {LANGUAGES.map((l) => (
                  <tr key={l.code}>
                    <td className="cell-main">{l.name}</td>
                    <td><Progress value={interfaceCoverage[l.code] ?? 100} /></td>
                    <td>
                      <input
                        type="radio"
                        name="active-lang"
                        aria-label={l.name}
                        checked={i18n.resolvedLanguage === l.code}
                        onChange={() => i18n.changeLanguage(l.code)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cell-sub" style={{ marginTop: 14, lineHeight: 1.6 }}>{t('admin.languages.interfaceHelp')}</p>
        </Panel>
      </div>
    </>
  );
}
