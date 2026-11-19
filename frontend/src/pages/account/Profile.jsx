import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api.js';
import { useAuth } from '../../store/auth.js';

export default function Profile() {
  const { t, i18n } = useTranslation();
  const user = useAuth((s) => s.user);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaved(false); setError(''); setBusy(true);
    const f = e.target;
    try {
      const updated = await api.updateMe({
        first_name: f.first_name.value,
        last_name: f.last_name.value,
        preferred_language: f.preferred_language.value,
        preferred_currency: f.preferred_currency.value,
      });
      useAuth.setState({ user: updated });
      i18n.changeLanguage(updated.preferred_language);
      setSaved(true);
    } catch {
      setError(t('profile.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="acc-head">
        <h1>{t('layout.profile')}</h1>
        <p>{t('profile.subtitle')}</p>
      </div>

      <div className="card-box">
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="first_name">{t('common.firstName')}</label>
              <input id="first_name" name="first_name" defaultValue={user?.first_name || ''} />
            </div>
            <div className="field">
              <label htmlFor="last_name">{t('common.lastName')}</label>
              <input id="last_name" name="last_name" defaultValue={user?.last_name || ''} />
            </div>
            <div className="field full">
              <label htmlFor="email">{t('common.email')}</label>
              {/* L'e-mail est l'identifiant du compte : non modifiable ici. */}
              <input id="email" defaultValue={user?.email || ''} disabled />
            </div>
            <div className="field">
              <label htmlFor="preferred_language">{t('common.language')}</label>
              <select id="preferred_language" name="preferred_language" defaultValue={user?.preferred_language || 'fr'}>
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="preferred_currency">{t('profile.currency')}</label>
              <select id="preferred_currency" name="preferred_currency" defaultValue={user?.preferred_currency || 'EUR'}>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="CNY">CNY (¥)</option>
              </select>
            </div>
          </div>

          {saved && <p style={{ color: '#1FA971', fontSize: 13, marginTop: 14, fontWeight: 600 }}>{t('profile.saved')}</p>}
          {error && <p style={{ color: 'var(--brand-red)', fontSize: 13, marginTop: 14 }}>{error}</p>}

          <button type="submit" className="btn-primary" style={{ marginTop: 18 }} disabled={busy}>
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </form>
      </div>
    </>
  );
}
