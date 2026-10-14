import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api.js';
import { useAuth } from '../../store/auth.js';
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

const ROLE_DEFAULT_SECTIONS = {
  ADMIN: ['dashboard', 'orders', 'customers', 'promotions', 'b2b', 'catalog', 'deliveries', 'staff'],
  MANAGER: ['dashboard', 'orders', 'customers', 'promotions', 'b2b', 'catalog', 'deliveries'],
  CATALOG: ['dashboard', 'catalog'],
  SALES: ['dashboard', 'b2b', 'customers', 'orders'],
  SUPPORT: ['dashboard', 'orders', 'customers'],
  DELIVERY: ['deliveries'],
};

const DEFAULT_SECTIONS_CATALOG = [
  { key: 'dashboard', label: 'Tableau de bord', route: '/gestion', desc: "Vue d'ensemble et statistiques" },
  { key: 'orders', label: 'Commandes & Ventes', route: '/gestion/commandes', desc: 'Commandes clients et encaissements caisse' },
  { key: 'customers', label: 'Clients', route: '/gestion/clients', desc: 'Gestion du fichier clients' },
  { key: 'promotions', label: 'Promotions', route: '/gestion/promotions', desc: 'Codes promo et remises' },
  { key: 'b2b', label: 'Comptes Pro & Paliers', route: '/gestion/comptes-pro', desc: 'Tarifs professionnels et B2B' },
  { key: 'catalog', label: 'Catalogue & Stocks', route: '/gestion/produits', desc: 'Produits, stocks, inventaire, catégories' },
  { key: 'deliveries', label: 'Livraisons & Courses', route: '/gestion/livraisons', desc: 'Tournées et statut des livraisons' },
  { key: 'staff', label: 'Équipe', route: '/gestion/equipe', desc: 'Gestion des accès et employés' },
];

const EMPTY = {
  email: '', first_name: '', last_name: '', password: '',
  role: 'SUPPORT', phone: '', job_title: '', delivery_zone: '', vehicle: '',
};

const fullName = (e) => [e.first_name, e.last_name].filter(Boolean).join(' ') || '—';

export default function Employees() {
  const { t } = useTranslation();
  const currentUser = useAuth((s) => s.user);

  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sectionsCatalog, setSectionsCatalog] = useState(DEFAULT_SECTIONS_CATALOG);
  const [form, setForm] = useState(EMPTY);
  const [formSections, setFormSections] = useState(ROLE_DEFAULT_SECTIONS.SUPPORT);
  const [showCustomPerms, setShowCustomPerms] = useState(false);
  const [customPermsModified, setCustomPermsModified] = useState(false);

  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [reset, setReset] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal de gestion des permissions / pages autorisées
  const [permStaff, setPermStaff] = useState(null);
  const [permSections, setPermSections] = useState([]);
  const [permBusy, setPermBusy] = useState(false);
  const [permSuccess, setPermSuccess] = useState(false);
  const [permError, setPermError] = useState('');

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
    api.adminStaffSections()
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) {
          setSectionsCatalog(d);
        }
      })
      .catch(() => {});
  }, []);

  const firstError = (data) => {
    if (!data) return null;
    const key = Object.keys(data)[0];
    const value = data[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const handleRoleChange = (newRole) => {
    setForm((prev) => ({ ...prev, role: newRole }));
    if (!customPermsModified) {
      setFormSections(ROLE_DEFAULT_SECTIONS[newRole] || []);
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setError('');
    setNotice(null);
    try {
      const payload = { ...form };
      if (customPermsModified || showCustomPerms) {
        payload.custom_sections = formSections;
      }
      const created = await api.adminCreateStaff(payload);
      setNotice({ email: created.email, password: created.generated_password });
      setForm(EMPTY);
      setCustomPermsModified(false);
      setShowCustomPerms(false);
      setFormSections(ROLE_DEFAULT_SECTIONS.SUPPORT);
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

  // Ouvre le panneau/modal de configuration des pages autorisées
  const openPermModal = (staff) => {
    setPermStaff(staff);
    setPermSections(
      staff.custom_sections && staff.custom_sections.length > 0
        ? [...staff.custom_sections]
        : [...(staff.sections || [])]
    );
    setPermSuccess(false);
    setPermError('');
    setError('');
  };

  const savePermissions = async () => {
    if (!permStaff) return;
    setPermBusy(true);
    setPermError('');
    setError('');
    try {
      await api.adminSetStaffSections(permStaff.id, permSections);
      setPermSuccess(true);
      await load();
      setTimeout(() => {
        setPermStaff(null);
        setPermSuccess(false);
      }, 700);
    } catch (err) {
      const msg = firstError(err.data) || err.message || "Impossible d'enregistrer les accès aux pages.";
      setPermError(msg);
      setError(msg);
    } finally {
      setPermBusy(false);
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

      {/* Modal de configuration des accès et pages autorisées */}
      {permStaff && (
        <div className="admin-modal-backdrop" onClick={() => !permBusy && setPermStaff(null)}>
          <div className="admin-modal staff-perm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="staff-perm-header">
              <div>
                <h3 className="staff-perm-title">
                  {I.shield}
                  <span>Accès aux pages & permissions</span>
                </h3>
                <div className="staff-perm-subtitle">
                  <span style={{ fontWeight: 600, color: 'var(--text-head)' }}>{fullName(permStaff)}</span>
                  <span>({permStaff.email})</span>
                  <span className={`tag-pill ${ROLE_TONE[permStaff.role] || ''}`} style={{ fontSize: 11 }}>
                    {permStaff.role_label || permStaff.role}
                  </span>
                  {permStaff.custom_sections && permStaff.custom_sections.length > 0 && (
                    <span className="staff-perm-badge-custom">⚙️ Personnalisé</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => !permBusy && setPermStaff(null)}
                style={{ background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)' }}
                title="Fermer"
              >
                ✕
              </button>
            </div>

            <div className="staff-perm-quickbar">
              <div className="staff-perm-count">
                <strong>{permSections.length}</strong> / {sectionsCatalog.length} page(s) autorisée(s)
              </div>
              <div className="staff-perm-actions">
                <button
                  type="button"
                  className="btn-admin ghost"
                  style={{ fontSize: 11, padding: '4px 10px' }}
                  onClick={() => setPermSections(sectionsCatalog.map((s) => s.key))}
                >
                  Tout autoriser
                </button>
                <button
                  type="button"
                  className="btn-admin ghost"
                  style={{ fontSize: 11, padding: '4px 10px' }}
                  onClick={() => setPermSections([])}
                >
                  Tout retirer
                </button>
                <button
                  type="button"
                  className="btn-admin ghost"
                  style={{ fontSize: 11, padding: '4px 10px' }}
                  onClick={() => setPermSections(ROLE_DEFAULT_SECTIONS[permStaff.role] || [])}
                >
                  Rétablir défaut ({permStaff.role_label || permStaff.role})
                </button>
              </div>
            </div>

            <div className="staff-perm-body">
              {permError && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  ⚠️ <strong>Erreur :</strong> {permError}
                </div>
              )}

              {currentUser?.email === permStaff.email && !permSections.includes('staff') && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 16,
                  fontSize: 12.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  ⚠️ <strong>Attention :</strong> Vous configurez votre propre compte. Si vous retirez la page "Équipe", vous ne pourrez plus gérer les accès.
                </div>
              )}

              <div className="staff-perm-grid">
                {sectionsCatalog.map((sec) => {
                  const isChecked = permSections.includes(sec.key);
                  return (
                    <div
                      key={sec.key}
                      className={`staff-perm-card ${isChecked ? 'is-active' : ''}`}
                      onClick={() => {
                        setPermSections((prev) =>
                          prev.includes(sec.key)
                            ? prev.filter((k) => k !== sec.key)
                            : [...prev, sec.key]
                        );
                      }}
                    >
                      <input
                        type="checkbox"
                        className="staff-perm-check"
                        checked={isChecked}
                        onChange={() => {}} // Géré par le clic sur le conteneur
                      />
                      <div className="staff-perm-info">
                        <div className="staff-perm-name-row">
                          <span className="staff-perm-name">{sec.label}</span>
                          <span className="staff-perm-route">{sec.route}</span>
                        </div>
                        <div className="staff-perm-desc">{sec.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="staff-perm-footer">
              <button
                type="button"
                className="btn-admin ghost"
                onClick={() => setPermStaff(null)}
                disabled={permBusy}
              >
                Annuler
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {permSuccess && (
                  <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                    ✓ Enregistré !
                  </span>
                )}
                <button
                  type="button"
                  className="btn-admin primary"
                  onClick={savePermissions}
                  disabled={permBusy}
                >
                  {permBusy ? 'Enregistrement…' : 'Enregistrer les accès'}
                </button>
              </div>
            </div>
          </div>
        </div>
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

          <div className="admin-table-scroll">
            <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.employees.tableEmployee', 'Employé')}</th>
                <th>{t('admin.employees.tableRole', 'Rôle')}</th>
                <th>{t('admin.employees.tableAccess', 'Accès & Pages')}</th>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                      <button
                        type="button"
                        className="staff-access-pill-btn"
                        onClick={() => openPermModal(r)}
                        title="Configurer les pages autorisées pour cet employé"
                      >
                        {I.shield}
                        <span>{r.sections.length} page(s)</span>
                      </button>
                      {r.custom_sections && r.custom_sections.length > 0 ? (
                        <span className="staff-perm-badge-custom" title="Accès personnalisés pour cet employé">
                          ⚙️ Personnalisé
                        </span>
                      ) : (
                        <span className="staff-perm-badge-default" title="Accès standards hérités du rôle">
                          Rôle standard
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`status ${r.is_active ? 'paid' : 'new'}`}>
                      {r.is_active ? t('admin.employees.statusActive', 'Actif') : t('admin.employees.statusDisabled', 'Désactivé')}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        title="Configurer les accès aux pages"
                        onClick={() => openPermModal(r)}
                        style={{ color: 'var(--navy)' }}
                      >
                        {I.shield}
                      </button>
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
        </div>
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
              onChange={(e) => handleRoleChange(e.target.value)}>
              {roles.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>

            {/* Personnalisation des pages pour le nouvel employé */}
            <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <button
                type="button"
                className="btn-admin ghost"
                style={{ width: '100%', justifyContent: 'space-between', fontSize: 12.5 }}
                onClick={() => setShowCustomPerms(!showCustomPerms)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {I.shield}
                  {showCustomPerms ? 'Masquer la personnalisation' : 'Personnaliser les pages accessibles'}
                </span>
                <span style={{ fontWeight: 600 }}>
                  {formSections.length} page(s)
                </span>
              </button>

              {showCustomPerms && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto', padding: '4px 2px' }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                    <button
                      type="button"
                      className="btn-admin ghost"
                      style={{ fontSize: 11, padding: '2px 8px' }}
                      onClick={() => { setCustomPermsModified(true); setFormSections(sectionsCatalog.map((s) => s.key)); }}
                    >
                      Tout cocher
                    </button>
                    <button
                      type="button"
                      className="btn-admin ghost"
                      style={{ fontSize: 11, padding: '2px 8px' }}
                      onClick={() => { setCustomPermsModified(true); setFormSections([]); }}
                    >
                      Tout décocher
                    </button>
                    <button
                      type="button"
                      className="btn-admin ghost"
                      style={{ fontSize: 11, padding: '2px 8px' }}
                      onClick={() => { setCustomPermsModified(false); setFormSections(ROLE_DEFAULT_SECTIONS[form.role] || []); }}
                    >
                      Défaut du rôle
                    </button>
                  </div>
                  {sectionsCatalog.map((sec) => (
                    <label
                      key={sec.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        cursor: 'pointer',
                        padding: '6px 8px',
                        borderRadius: 6,
                        background: formSections.includes(sec.key) ? 'rgba(30, 41, 59, 0.04)' : 'transparent',
                        border: formSections.includes(sec.key) ? '1px solid var(--navy)' : '1px solid var(--line)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formSections.includes(sec.key)}
                        onChange={(e) => {
                          setCustomPermsModified(true);
                          setFormSections((prev) =>
                            e.target.checked ? [...prev, sec.key] : prev.filter((k) => k !== sec.key)
                          );
                        }}
                      />
                      <span style={{ fontWeight: formSections.includes(sec.key) ? 600 : 400 }}>{sec.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--muted)', fontFamily: 'monospace' }}>{sec.route}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

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
