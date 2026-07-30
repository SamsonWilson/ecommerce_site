import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { I } from './icons.jsx';
import { PageHead, Panel } from './ui.jsx';

const DEFAULT_LANGS = [
  { code: 'fr', name: 'Français', native: 'Français', progress: 100, active: true },
  { code: 'en', name: 'Anglais', native: 'English', progress: 100, active: true },
  { code: 'zh', name: 'Chinois', native: '中文', progress: 100, active: true },
];

export default function Languages() {
  const { i18n, t } = useTranslation();
  const currentLangCode = i18n.resolvedLanguage || i18n.language || 'fr';

  const [langs, setLangs] = useState(() => {
    const saved = localStorage.getItem('admin_langs_config');
    return saved ? JSON.parse(saved) : DEFAULT_LANGS;
  });

  const [notification, setNotification] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newNative, setNewNative] = useState('');

  const scopes = [
    { label: t('admin.languages.scopeInterface', 'Interface du site (clés i18n)'), fr: 100, en: 100, zh: 100 },
    { label: t('admin.languages.scopeProducts', 'Contenus produits (nom, description)'), fr: 100, en: 45, zh: 30 },
    { label: t('admin.languages.scopePages', 'Pages éditoriales (FAQ, livraison)'), fr: 100, en: 80, zh: 60 },
  ];

  // Persister la configuration des langues dans localStorage
  useEffect(() => {
    localStorage.setItem('admin_langs_config', JSON.stringify(langs));
    const activeCodes = langs.filter((l) => l.active).map((l) => l.code);
    localStorage.setItem('published_langs', JSON.stringify(activeCodes));
    window.dispatchEvent(new Event('storage'));
  }, [langs]);

  // Changer la langue globale i18n
  const handleSelectLanguage = (code) => {
    i18n.changeLanguage(code);
    const langObj = langs.find((l) => l.code === code);
    const name = langObj ? langObj.name : code;
    showToast(`Langue / Language changed: ${name} (${code.toUpperCase()})`);
  };

  // Basculer la publication d'une langue
  const toggleActive = (code) => {
    setLangs((prev) =>
      prev.map((l) => {
        if (l.code === code) {
          const nextState = !l.active;
          if (!nextState && code === currentLangCode) {
            showToast('Impossible de désactiver la langue active / Cannot disable active language!', 'warning');
            return l;
          }
          return { ...l, active: nextState };
        }
        return l;
      })
    );
  };

  // Ajouter une nouvelle langue
  const handleAddLanguage = (e) => {
    e.preventDefault();
    if (!newCode || !newName) return;

    const code = newCode.trim().toLowerCase();
    if (langs.some((l) => l.code === code)) {
      showToast('Cette langue existe déjà / Language already exists.', 'warning');
      return;
    }

    const item = {
      code,
      name: newName.trim(),
      native: newNative.trim() || newName.trim(),
      progress: 0,
      active: true,
    };

    setLangs((prev) => [...prev, item]);
    setNewCode('');
    setNewName('');
    setNewNative('');
    setShowAddForm(false);
    showToast(`Nouvelle langue "${item.name}" ajoutée.`);
  };

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  return (
    <>
      <PageHead
        title={t('admin.languages.title', 'Gestion des langues & Internationalisation')}
        subtitle={t('admin.languages.subtitle', 'Définissez la langue active, gérez les traductions et activez/désactivez les langues publiées.')}
      >
        <button
          type="button"
          className="btn-admin primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {I.plus} {showAddForm ? t('admin.languages.closeForm', 'Fermer le formulaire') : t('admin.languages.addLanguage', 'Ajouter une langue')}
        </button>
      </PageHead>

      {notification && (
        <div
          style={{
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(16,185,129,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span>✓</span>
          <span>{notification}</span>
        </div>
      )}

      {showAddForm && (
        <Panel title={t('admin.languages.addLanguage', 'Ajouter une nouvelle langue')}>
          <form onSubmit={handleAddLanguage} className="admin-row" style={{ gap: '15px', alignItems: 'flex-end', marginBottom: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Code ISO (ex: es, de, it)
              </label>
              <input
                type="text"
                required
                maxLength={5}
                placeholder="ex: es"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Nom
              </label>
              <input
                type="text"
                required
                placeholder="ex: Espagnol"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Nom Natif
              </label>
              <input
                type="text"
                placeholder="ex: Español"
                value={newNative}
                onChange={(e) => setNewNative(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
              />
            </div>
            <button type="submit" className="btn-admin primary" style={{ height: '38px' }}>
              Enregistrer
            </button>
          </form>
        </Panel>
      )}

      <div className="admin-row cols-2-1">
        <Panel title={t('admin.languages.configuredTitle', 'Langues configurées')}>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
            {t('admin.languages.configuredSubtitle', 'La langue cochée avec le bouton radio est la langue active actuelle sur votre session.')}
          </p>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.languages.tableLang', 'Langue')}</th>
                <th>{t('admin.languages.tableCode', 'Code')}</th>
                <th>{t('admin.languages.tableProgress', 'Avancement')}</th>
                <th>{t('admin.languages.tableActive', 'Langue active')}</th>
                <th>{t('admin.languages.tablePublished', 'Publiée sur le site')}</th>
              </tr>
            </thead>
            <tbody>
              {langs.map((l) => {
                const isActiveLang = currentLangCode === l.code;
                return (
                  <tr key={l.code} style={{ background: isActiveLang ? '#F0FDF4' : undefined }}>
                    <td>
                      <div className="cell-main" style={{ fontWeight: isActiveLang ? '700' : '500' }}>
                        {l.name} {isActiveLang && <span style={{ fontSize: '11px', background: '#10B981', color: '#fff', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>{t('admin.languages.activeTag', 'ACTIVE')}</span>}
                      </div>
                      <div className="cell-sub">{l.native}</div>
                    </td>
                    <td className="cell-sub">{l.code}</td>
                    <td style={{ minWidth: 140 }}>
                      <div className="admin-progress">
                        <span style={{ width: `${l.progress}%` }} />
                      </div>
                      <span className="cell-sub">{l.progress}%</span>
                    </td>
                    <td>
                      <input
                        type="radio"
                        name="active-lang"
                        checked={isActiveLang}
                        onChange={() => handleSelectLanguage(l.code)}
                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`admin-switch ${l.active ? 'on' : ''}`}
                        onClick={() => toggleActive(l.code)}
                        aria-label={`Publier ${l.name}`}
                      >
                        <i />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        <Panel title={t('admin.languages.scopeTitle', 'Avancement par périmètre')}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Périmètre</th>
                <th>FR</th>
                <th>EN</th>
                <th>ZH</th>
              </tr>
            </thead>
            <tbody>
              {scopes.map((s) => (
                <tr key={s.label}>
                  <td className="cell-main" style={{ fontWeight: 500 }}>
                    {s.label}
                  </td>
                  {['fr', 'en', 'zh'].map((c) => (
                    <td key={c}>
                      <span className={s[c] === 100 ? 'status paid' : 'status pending'}>
                        {s[c]}%
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cell-sub" style={{ marginTop: 14, lineHeight: 1.6 }}>
            {t('admin.languages.scopeSubtitle', 'Sélectionner une langue active modifie instantanément l\'interface globale via i18next.')}
          </p>
        </Panel>
      </div>
    </>
  );
}
