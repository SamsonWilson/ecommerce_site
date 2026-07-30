import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api.js';
import { I } from './icons.jsx';
import { PageHead, Panel, Toolbar } from './ui.jsx';

const ROLE_TONE = {
  ADMIN: 'tier-2',
  MANAGER: 'tier-3',
  CATALOG: 'tier-1',
  SALES: 'tier-1',
  SUPPORT: '',
  DELIVERY: 'tier-3',
};

const EMPTY = {
  email: '', first_name: '', last_name: '', password: '',
  role: 'SUPPORT', phone: '', job_title: '', delivery_zone: '', vehicle: '',
};

const fullName = (e) => [e.first_name, e.last_name].filter(Boolean).join(' ') || '—';

export default function Employees() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [reset, setReset] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.adminStaff()
      .then((d) => setRows(d.results || d))
      .catch((e) => setError(
        e.status === 403 ? t('admin.employees.forbidden', "Seul un administrateur peut gérer l'équipe.") : t('admin.employees.loadError', 'Chargement impossible.')
      ))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    api.adminStaffRoles().then(setRoles).catch(() => setRoles([]));
  }, []);

  const firstError = (data) => {
    if (!data) return null;
    const key = Object.keys(data)[0];
    const value = data[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const create = async (e) => {
    e.preventDefault();
    setError('');
    setNotice(null);
    try {
      const created = await api.adminCreateStaff(form);
      setNotice({ email: created.email, password: created.generated_password });
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(firstError(err.data) || t('admin.employees.createError', 'Création impossible.'));
    }
  };

  const changeRole = async (id, role) => {
    setError('');
    try {
      await api.adminSetStaffRole(id, role);
      load();
    } catch (err) {
      setError(firstError(err.data) || t('admin.employees.changeRoleError', 'Changement de rôle impossible.'));
    }
  };

  const toggleActive = async (row) => {
    setError('');
    try {
      await (row.is_active ? api.adminDeactivateStaff(row.id) : api.adminActivateStaff(row.id));
      load();
    } catch (err) {
      setError(firstError(err.data) || t('admin.employees.operationError', 'Opération impossible.'));
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { password } = await api.adminResetStaffPassword(reset.id, reset.password || undefined);
      setNotice({ email: reset.email, password, reset: true });
      setReset(null);
    } catch (err) {
      setError(firstError(err.data) || t('admin.employees.resetError', 'Réinitialisation impossible.'));
    } finally {
      setBusy(false);
    }
  };

  const filtered = rows.filter((r) =>
    `${fullName(r)} ${r.email} ${r.job_title}`.toLowerCase().includes(query.toLowerCase())
  );
  const drivers = rows.filter((r) => r.role === 'DELIVERY').length;
  const isDriverForm = form.role === 'DELIVERY';

  return (
    <>
      <PageHead
        title={t('admin.employees.title', 'Équipe')}
        subtitle={`${rows.length} ${t('admin.employees.subtitleEmployees', 'employé(s)')} — ${t('admin.employees.subtitleDrivers', 'dont')} ${drivers} ${t('admin.employees.drivers', 'livreur(s)')}`}
      />

      {notice && (
        <Panel>
          <p className="cell-main">
            {notice.reset ? t('admin.employees.newPasswordFor', 'Nouveau mot de passe pour') : t('admin.employees.passwordFor', 'Mot de passe pour')} {notice.email}
          </p>
          <p className="cell-sub" style={{ marginTop: 6 }}>
            <code style={{ fontSize: 16, letterSpacing: 1 }}>{notice.password}</code>
            {' — '}{t('admin.employees.notePasswordHint', 'notez-le maintenant : il ne sera plus affiché.')}
          </p>
          <button className="btn-admin ghost" style={{ marginTop: 10 }} onClick={() => setNotice(null)}>
            {t('admin.employees.noted', "J'ai noté")}
          </button>
        </Panel>
      )}

      {reset && (
        <Panel title={`${t('admin.employees.resetPasswordTitle', 'Réinitialiser le mot de passe')} — ${fullName(reset)}`}>
          <form className="admin-form" onSubmit={resetPassword}>
            <label htmlFor="r-pwd" style={{ marginTop: 12 }}>{t('admin.employees.newPasswordOptional', 'Nouveau mot de passe (optionnel)')}</label>
            <input id="r-pwd" type="text" autoComplete="off" value={reset.password || ''}
              onChange={(e) => setReset({ ...reset, password: e.target.value })}
              placeholder={t('admin.employees.leaveEmptyGenerate', 'Laisser vide pour en générer un')} />

            <div className="row-actions" style={{ marginTop: 14 }}>
              <button className="btn-admin primary" type="submit" disabled={busy}>
                {busy ? t('admin.employees.resetting', 'Réinitialisation…') : t('admin.employees.resetBtn', 'Réinitialiser')}
              </button>
              <button className="btn-admin ghost" type="button" onClick={() => setReset(null)}>
                {t('admin.employees.cancel', 'Annuler')}
              </button>
            </div>
          </form>
        </Panel>
      )}

      <div className="admin-row cols-2-1">
        <Panel title={t('admin.employees.employeeAccounts', 'Comptes employés')}>
          <Toolbar>
            <div className="admin-field">
              {I.search}
              <input placeholder={t('admin.employees.searchPlaceholder', 'Nom, e-mail ou poste…')} value={query}
                onChange={(e) => setQuery(e.target.value)} />
            </div>
            <span className="admin-count">{filtered.length} {t('admin.employees.results', 'résultat(s)')}</span>
          </Toolbar>

          {error && <p className="admin-login-error">{error}</p>}

          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.employees.tableEmployee', 'Employé')}</th>
                <th>{t('admin.employees.tableRole', 'Rôle')}</th>
                <th>{t('admin.employees.tableAccess', 'Accès')}</th>
                <th>{t('admin.employees.tableStatus', 'Statut')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="cell-main">{fullName(r)}</div>
                    <div className="cell-sub">
                      {r.email}
                      {r.role === 'DELIVERY' && r.delivery_zone && ` · ${r.delivery_zone}`}
                    </div>
                  </td>
                  <td>
                    <select className="admin-select" value={r.role}
                      onChange={(e) => changeRole(r.id, e.target.value)}>
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={`tag-pill ${ROLE_TONE[r.role] || ''}`}>
                      {r.sections.length} {t('admin.employees.sections', 'section(s)')}
                    </span>
                  </td>
                  <td>
                    <span className={`status ${r.is_active ? 'paid' : 'new'}`}>
                      {r.is_active ? t('admin.employees.statusActive', 'Actif') : t('admin.employees.statusDisabled', 'Désactivé')}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" title={t('admin.employees.resetPasswordTitle', 'Réinitialiser le mot de passe')}
                        onClick={() => { setNotice(null); setReset({ ...r, password: '' }); }}>
                        {I.settings}
                      </button>
                      <button className="icon-btn" title={r.is_active ? t('admin.employees.deactivate', 'Désactiver') : t('admin.employees.activate', 'Réactiver')}
                        onClick={() => toggleActive(r)}>{r.is_active ? I.cross : I.check}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {loading && <tr><td colSpan="5" className="admin-empty">{t('common.loading', 'Chargement…')}</td></tr>}
              {!loading && filtered.length === 0 && !error && (
                <tr><td colSpan="5" className="admin-empty">{t('admin.employees.empty', 'Aucun employé. Créez le premier ci-contre.')}</td></tr>
              )}
            </tbody>
          </table>
        </Panel>

        <Panel title={t('admin.employees.newEmployee', 'Nouvel employé')}>
          <form className="admin-form" onSubmit={create}>
            <label htmlFor="e-email">{t('admin.employees.proEmail', 'E-mail professionnel')}</label>
            <input id="e-email" type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="prenom@maison-lian.com" />

            <label htmlFor="e-first" style={{ marginTop: 12 }}>{t('admin.employees.firstName', 'Prénom')}</label>
            <input id="e-first" value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })} />

            <label htmlFor="e-last" style={{ marginTop: 12 }}>{t('admin.employees.lastName', 'Nom')}</label>
            <input id="e-last" value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })} />

            <label htmlFor="e-role" style={{ marginTop: 12 }}>{t('admin.employees.tableRole', 'Rôle')}</label>
            <select id="e-role" className="admin-select" value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>

            <label htmlFor="e-job" style={{ marginTop: 12 }}>{t('admin.employees.jobTitle', 'Intitulé de poste')}</label>
            <input id="e-job" value={form.job_title}
              onChange={(e) => setForm({ ...form, job_title: e.target.value })}
              placeholder="Ex. Chargé de clientèle" />

            <label htmlFor="e-phone" style={{ marginTop: 12 }}>{t('admin.employees.phone', 'Téléphone')}</label>
            <input id="e-phone" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />

            {isDriverForm && (
              <>
                <label htmlFor="e-zone" style={{ marginTop: 12 }}>{t('admin.employees.deliveryZone', 'Zone de livraison')}</label>
                <input id="e-zone" value={form.delivery_zone}
                  onChange={(e) => setForm({ ...form, delivery_zone: e.target.value })}
                  placeholder="Ex. Lyon et périphérie" />

                <label htmlFor="e-vehicle" style={{ marginTop: 12 }}>{t('admin.employees.vehicle', 'Véhicule')}</label>
                <input id="e-vehicle" value={form.vehicle}
                  onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                  placeholder="Ex. Scooter" />
              </>
            )}

            <label htmlFor="e-pwd" style={{ marginTop: 12 }}>{t('admin.employees.newPasswordOptional', 'Mot de passe (optionnel)')}</label>
            <input id="e-pwd" type="text" value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={t('admin.employees.leaveEmptyGenerate', 'Laisser vide pour en générer un')} />

            <button className="btn-admin primary" type="submit" style={{ marginTop: 14 }}>
              {I.plus}{t('admin.employees.createAccount', 'Créer le compte')}
            </button>
          </form>
        </Panel>
      </div>
    </>
  );
}
