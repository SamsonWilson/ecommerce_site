import { useState } from 'react';
import { I } from './icons.jsx';
import { PageHead, Panel } from './ui.jsx';

const INITIAL = [
  { code: 'fr', name: 'Français', native: 'Français', progress: 100, active: true },
  { code: 'en', name: 'Anglais', native: 'English', progress: 100, active: true },
  { code: 'zh', name: 'Chinois', native: '中文', progress: 100, active: true },
];

// Avancement par zone de contenu (interface vs contenus produits)
const SCOPES = [
  { label: "Interface du site (clés i18n)", fr: 100, en: 100, zh: 100 },
  { label: 'Contenus produits (nom, description)', fr: 100, en: 0, zh: 0 },
  { label: 'Pages éditoriales (FAQ, livraison)', fr: 100, en: 0, zh: 0 },
];

export default function Languages() {
  const [langs, setLangs] = useState(INITIAL);
  const [defaultLang, setDefaultLang] = useState('fr');

  const toggle = (code) =>
    setLangs((l) => l.map((x) => (x.code === code ? { ...x, active: !x.active } : x)));

  return (
    <>
      <PageHead title="Gestion des langues" subtitle="Langues publiées sur la boutique et avancement des traductions">
        <button className="btn-admin primary">{I.plus}Ajouter une langue</button>
      </PageHead>

      <div className="admin-row cols-2-1">
        <Panel title="Langues du site">
          <table className="admin-table">
            <thead>
              <tr><th>Langue</th><th>Code</th><th>Traduction</th><th>Par défaut</th><th>Publiée</th></tr>
            </thead>
            <tbody>
              {langs.map((l) => (
                <tr key={l.code}>
                  <td>
                    <div className="cell-main">{l.name}</div>
                    <div className="cell-sub">{l.native}</div>
                  </td>
                  <td className="cell-sub">{l.code}</td>
                  <td style={{ minWidth: 160 }}>
                    <div className="admin-progress"><span style={{ width: `${l.progress}%` }} /></div>
                    <span className="cell-sub">{l.progress}%</span>
                  </td>
                  <td>
                    <input
                      type="radio"
                      name="default-lang"
                      checked={defaultLang === l.code}
                      onChange={() => setDefaultLang(l.code)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`admin-switch ${l.active ? 'on' : ''}`}
                      onClick={() => toggle(l.code)}
                      aria-label={`Publier ${l.name}`}
                    ><i /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Avancement par contenu">
          <table className="admin-table">
            <thead><tr><th>Périmètre</th><th>FR</th><th>EN</th><th>ZH</th></tr></thead>
            <tbody>
              {SCOPES.map((s) => (
                <tr key={s.label}>
                  <td className="cell-main" style={{ fontWeight: 500 }}>{s.label}</td>
                  {['fr', 'en', 'zh'].map((c) => (
                    <td key={c}>
                      <span className={s[c] === 100 ? 'status paid' : 'status pending'}>{s[c]}%</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cell-sub" style={{ marginTop: 14, lineHeight: 1.6 }}>
            Les contenus produits ne sont pas encore traduisibles en base :
            cela nécessite <strong>django-parler</strong> côté backend (§5.3).
            Les traductions chinoises doivent être relues par un locuteur natif avant publication (§12).
          </p>
        </Panel>
      </div>
    </>
  );
}
