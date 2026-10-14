import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { I } from './icons.jsx';
import { PageHead, Panel, Toolbar } from './ui.jsx';
import { catalogProducts, bestSellers } from '../../data/products.jsx';
import { api } from '../../lib/api.js';
import { productsFromApi } from '../../lib/catalog.js';

// Combinaison des produits locaux et API
const ALL_CATALOG_PRODUCTS = Array.from(
  new Map(
    [...catalogProducts, ...bestSellers].map((item) => [item.slug, { slug: item.slug, name: item.name, price: item.priceNew }])
  ).values()
);

const INITIAL_PROMOS = [
  {
    id: 1,
    code: 'PRINTEMPS20',
    label: 'Collection printemps',
    type: '%',
    value: '20',
    minAmount: 0,
    maxUses: 500,
    scope: 'Catalogue entier',
    selectedProducts: [],
    start: '2026-07-01',
    end: '2026-08-31',
    uses: 142,
    active: true,
    status: ['paid', 'Active'],
  },
  {
    id: 2,
    code: 'PHENIX15',
    label: 'Offre spéciale Épingle Phénix',
    type: '%',
    value: '15',
    minAmount: 0,
    maxUses: 100,
    scope: 'Produits spécifiques',
    selectedProducts: ['epingle-phenix-cinabre', 'tiare-xiuhe-doree'],
    start: '2026-08-01',
    end: '2026-09-30',
    uses: 48,
    active: true,
    status: ['paid', 'Active'],
  },
  {
    id: 3,
    code: 'BIENVENUE10',
    label: 'Première commande client',
    type: '%',
    value: '10',
    minAmount: 50,
    maxUses: 1000,
    scope: 'Nouveaux clients',
    selectedProducts: [],
    start: '2026-01-01',
    end: '2026-12-31',
    uses: 618,
    active: true,
    status: ['paid', 'Active'],
  },
  {
    id: 4,
    code: 'GROS30',
    label: 'Programme grossiste B2B',
    type: '%',
    value: '30',
    minAmount: 300,
    maxUses: 100,
    scope: 'Comptes pro validés',
    selectedProducts: [],
    start: '2026-06-01',
    end: '2026-08-31',
    uses: 27,
    active: true,
    status: ['paid', 'Active'],
  },
  {
    id: 5,
    code: 'PORT0',
    label: 'Livraison offerte dès 150€',
    type: '€',
    value: '6.90',
    minAmount: 150,
    maxUses: 200,
    scope: 'Dès 150 €',
    selectedProducts: [],
    start: '2026-08-15',
    end: '2026-09-15',
    uses: 89,
    active: true,
    status: ['pending', 'Planifiée'],
  },
];

const SCOPE_OPTIONS = [
  'Catalogue entier',
  'Produits spécifiques',
  'Nouveaux clients',
  'Comptes pro validés',
  'Dès 150 €',
];

export default function Promotions() {
  const { t } = useTranslation();
  const [promos, setPromos] = useState(INITIAL_PROMOS);
  const [availableProducts, setAvailableProducts] = useState(ALL_CATALOG_PRODUCTS);
  const [filter, setFilter] = useState('Toutes');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [prodSearchModal, setProdSearchModal] = useState('');

  // Charger les produits réels depuis l'API en arrière-plan
  useEffect(() => {
    api
      .products()
      .then((data) => {
        const parsed = productsFromApi(data);
        if (parsed && parsed.length > 0) {
          const apiItems = parsed.map((p) => ({
            slug: p.slug,
            name: p.name,
            price: p.priceNew || `${p.price} €`,
          }));
          const combined = Array.from(
            new Map([...ALL_CATALOG_PRODUCTS, ...apiItems].map((item) => [item.slug, item])).values()
          );
          setAvailableProducts(combined);
        }
      })
      .catch(() => {});
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    label: '',
    type: '%',
    value: '15',
    minAmount: '0',
    maxUses: '0',
    scope: 'Catalogue entier',
    selectedProducts: [],
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    active: true,
  });

  const FILTERS = [
    { value: 'Toutes', label: t('admin.promotions.filterAll', 'Toutes') },
    { value: 'Active', label: t('admin.promotions.filterActive', 'Actives') },
    { value: 'Planifiée', label: t('admin.promotions.filterScheduled', 'Planifiées') },
    { value: 'Expirée', label: t('admin.promotions.filterExpired', 'Expirées') },
    { value: 'Désactivée', label: 'Désactivées' },
  ];

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleOpenCreate = () => {
    setEditingPromo(null);
    setProdSearchModal('');
    setFormData({
      code: `ML-${Math.floor(100 + Math.random() * 900)}`,
      label: '',
      type: '%',
      value: '15',
      minAmount: '0',
      maxUses: '0',
      scope: 'Catalogue entier',
      selectedProducts: [],
      start: new Date().toISOString().split('T')[0],
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (promo) => {
    setEditingPromo(promo);
    setProdSearchModal('');
    setFormData({
      code: promo.code,
      label: promo.label,
      type: promo.type,
      value: promo.value,
      minAmount: promo.minAmount || '0',
      maxUses: promo.maxUses || '0',
      scope: promo.scope || 'Catalogue entier',
      selectedProducts: promo.selectedProducts || [],
      start: promo.start,
      end: promo.end,
      active: promo.active,
    });
    setIsModalOpen(true);
  };

  const handleGenerateCode = () => {
    const prefixes = ['LIAN', 'PROMO', 'SOLDE', 'FLASH', 'MARIAGE'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setFormData((prev) => ({ ...prev, code: `${prefix}${num}` }));
  };

  const handleToggleProductSelection = (slug) => {
    setFormData((prev) => {
      const exists = prev.selectedProducts.includes(slug);
      const nextProds = exists
        ? prev.selectedProducts.filter((s) => s !== slug)
        : [...prev.selectedProducts, slug];
      return { ...prev, selectedProducts: nextProds };
    });
  };

  const handleSelectAllProducts = () => {
    setFormData((prev) => ({
      ...prev,
      selectedProducts: availableProducts.map((p) => p.slug),
    }));
  };

  const handleDeselectAllProducts = () => {
    setFormData((prev) => ({
      ...prev,
      selectedProducts: [],
    }));
  };

  const handleToggleActive = (id) => {
    setPromos((list) =>
      list.map((p) => {
        if (p.id === id) {
          const nextActive = !p.active;
          let nextStatus = nextActive ? ['paid', 'Active'] : ['new', 'Désactivée'];
          return { ...p, active: nextActive, status: nextStatus };
        }
        return p;
      })
    );
    showToast('Statut de la promotion mis à jour');
  };

  const handleRemove = (id) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette promotion ?')) {
      setPromos((list) => list.filter((p) => p.id !== id));
      showToast('Promotion supprimée avec succès');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.code.trim()) return;

    if (formData.scope === 'Produits spécifiques' && formData.selectedProducts.length === 0) {
      alert('Veuillez sélectionner au moins un produit pour cette promotion spécifique.');
      return;
    }

    let status = ['paid', 'Active'];
    const today = new Date().toISOString().split('T')[0];
    if (!formData.active) {
      status = ['new', 'Désactivée'];
    } else if (formData.start > today) {
      status = ['pending', 'Planifiée'];
    } else if (formData.end < today) {
      status = ['new', 'Expirée'];
    }

    if (editingPromo) {
      setPromos((list) =>
        list.map((p) =>
          p.id === editingPromo.id
            ? {
                ...p,
                code: formData.code.trim().toUpperCase(),
                label: formData.label,
                type: formData.type,
                value: formData.value,
                minAmount: Number(formData.minAmount) || 0,
                maxUses: Number(formData.maxUses) || 0,
                scope: formData.scope,
                selectedProducts: formData.scope === 'Produits spécifiques' ? formData.selectedProducts : [],
                start: formData.start,
                end: formData.end,
                active: formData.active,
                status,
              }
            : p
        )
      );
      showToast(`Promotion ${formData.code.toUpperCase()} modifiée`);
    } else {
      const newPromo = {
        id: Date.now(),
        code: formData.code.trim().toUpperCase(),
        label: formData.label || 'Offre spéciale',
        type: formData.type,
        value: formData.value,
        minAmount: Number(formData.minAmount) || 0,
        maxUses: Number(formData.maxUses) || 0,
        scope: formData.scope,
        selectedProducts: formData.scope === 'Produits spécifiques' ? formData.selectedProducts : [],
        start: formData.start,
        end: formData.end,
        uses: 0,
        active: formData.active,
        status,
      };
      setPromos((list) => [newPromo, ...list]);
      showToast(`Promotion ${newPromo.code} créée avec succès !`);
    }

    setIsModalOpen(false);
  };

  // Filter rows
  const rows = promos.filter((p) => {
    const matchFilter =
      filter === 'Toutes' ||
      (filter === 'Active' && p.status && p.status[1] === 'Active') ||
      (filter === 'Planifiée' && p.status && p.status[1] === 'Planifiée') ||
      (filter === 'Expirée' && p.status && p.status[1] === 'Expirée') ||
      (filter === 'Désactivée' && p.status && p.status[1] === 'Désactivée');

    const sLower = search.trim().toLowerCase();
    const matchSearch =
      sLower === '' ||
      (p.code && p.code.toLowerCase().includes(sLower)) ||
      (p.label && p.label.toLowerCase().includes(sLower)) ||
      (p.scope && p.scope.toLowerCase().includes(sLower));

    return matchFilter && matchSearch;
  });

  const filteredModalProducts = availableProducts.filter((p) =>
    (p.name || '').toLowerCase().includes((prodSearchModal || '').toLowerCase())
  );

  // Calculate statistics
  const totalActive = promos.filter((p) => p.status && p.status[1] === 'Active').length;
  const totalUses = promos.reduce((sum, p) => sum + (p.uses || 0), 0);

  return (
    <>
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#0F172A',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 8,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          <span style={{ color: 'var(--green, #1FA971)' }}>✓</span> {toastMsg}
        </div>
      )}

      <PageHead
        title={t('admin.promotions.title', 'Gestion des promotions')}
        subtitle={`${totalActive} ${t('admin.promotions.activePromos', 'promotions actives actuellement')}`}
      >
        <button className="btn-admin primary" onClick={handleOpenCreate}>
          {I.plus} {t('admin.promotions.createPromo', 'Créer une promotion')}
        </button>
      </PageHead>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-icon" style={{ background: '#FDE9E8', color: 'var(--red)' }}>
              {I.percent}
            </span>
          </div>
          <div className="kpi-label">Total Promotions</div>
          <div className="kpi-value">{promos.length}</div>
          <div className="kpi-trend up">
            {I.up} {totalActive} actives
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-icon" style={{ background: '#E6F7EF', color: 'var(--green)' }}>
              {I.check}
            </span>
          </div>
          <div className="kpi-label">Promotions Actives</div>
          <div className="kpi-value">{totalActive}</div>
          <div className="kpi-trend up">En cours de validité</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-icon" style={{ background: '#E9F0FE', color: 'var(--blue)' }}>
              {I.bag2}
            </span>
          </div>
          <div className="kpi-label">Utilisations Totales</div>
          <div className="kpi-value">{totalUses}</div>
          <div className="kpi-trend up">Commandes bénéficiaires</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-top">
            <span className="kpi-icon" style={{ background: '#FFF6E3', color: 'var(--amber)' }}>
              {I.euro}
            </span>
          </div>
          <div className="kpi-label">Impact Commercial</div>
          <div className="kpi-value">-18,4 %</div>
          <div className="kpi-trend up">Taux moyen de conversion</div>
        </div>
      </div>

      <Panel>
        <Toolbar>
          <div className="admin-field" style={{ maxWidth: 300 }}>
            {I.search}
            <input
              type="text"
              placeholder="Rechercher un code ou libellé..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select className="admin-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <span className="admin-count">
            {rows.length} {t('admin.promotions.promosCount', 'promotion(s)')}
          </span>
        </Toolbar>

        <div className="table-responsive admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.promotions.tableCode', 'Code')}</th>
                <th>{t('admin.promotions.tableDiscount', 'Remise')}</th>
                <th>{t('admin.promotions.tableScope', 'Portée & Produits')}</th>
                <th>Conditions</th>
                <th>{t('admin.promotions.tablePeriod', 'Période')}</th>
                <th>{t('admin.promotions.tableUses', 'Utilisations')}</th>
                <th>Actif</th>
                <th>{t('admin.promotions.tableStatus', 'Statut')}</th>
                <th>{t('admin.promotions.tableActions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const isSpecific = p.scope === 'Produits spécifiques';
                const selectedNames = (p.selectedProducts || []).map(
                  (slug) => availableProducts.find((ap) => ap.slug === slug)?.name || slug
                );

                return (
                  <tr key={p.id}>
                    <td>
                      <div
                        className="cell-main"
                        style={{ fontFamily: 'monospace', fontSize: 14, letterSpacing: '0.05em', color: 'var(--navy)' }}
                      >
                        {p.code}
                      </div>
                      <div className="cell-sub">{p.label}</div>
                    </td>
                    <td>
                      <span className={`tag-pill ${p.type === '%' ? 'tier-2' : 'tier-1'}`} style={{ fontWeight: 700 }}>
                        {p.type === '%' ? `-${p.value} %` : `-${p.value} €`}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 12.5 }}>{p.scope}</div>
                      {isSpecific && selectedNames.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {selectedNames.slice(0, 2).map((name) => (
                            <span
                              key={name}
                              style={{
                                background: '#EFF6FF',
                                color: '#1D4ED8',
                                fontSize: 11,
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontWeight: 500,
                              }}
                            >
                              {name}
                            </span>
                          ))}
                          {selectedNames.length > 2 && (
                            <span
                              style={{
                                background: '#F1F5F9',
                                color: '#475569',
                                fontSize: 11,
                                padding: '2px 6px',
                                borderRadius: 4,
                                fontWeight: 600,
                              }}
                            >
                              +{selectedNames.length - 2} autres
                            </span>
                          )}
                        </div>
                      ) : isSpecific ? (
                        <span style={{ fontSize: 11, color: 'var(--red)' }}>Aucun produit lié</span>
                      ) : null}
                    </td>
                    <td className="cell-sub">
                      {p.minAmount > 0 ? `Min. ${p.minAmount} €` : 'Sans minimum'}
                      {p.maxUses > 0 ? ` • Max ${p.maxUses}` : ''}
                    </td>
                    <td className="cell-sub">
                      {p.start} → {p.end}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{p.uses}</span>
                      {p.maxUses > 0 && <span style={{ color: 'var(--muted)', fontSize: 11 }}> / {p.maxUses}</span>}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`admin-switch ${p.active ? 'on' : ''}`}
                        onClick={() => handleToggleActive(p.id)}
                        title={p.active ? 'Désactiver' : 'Activer'}
                      >
                        <i />
                      </button>
                    </td>
                    <td>
                      <span className={`status ${p.status ? p.status[0] : 'paid'}`}>{p.status ? p.status[1] : 'Active'}</span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title={t('admin.promotions.edit', 'Modifier')}
                          onClick={() => handleOpenEdit(p)}
                          aria-label={t('admin.promotions.edit', 'Modifier')}
                          style={{ cursor: 'pointer' }}
                        >
                          {I.pencil}
                        </button>
                        <button
                          type="button"
                          className="icon-btn reject"
                          title={t('admin.promotions.delete', 'Supprimer')}
                          onClick={() => handleRemove(p.id)}
                          aria-label={t('admin.promotions.delete', 'Supprimer')}
                          style={{ cursor: 'pointer' }}
                        >
                          {I.trash}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan="9" className="admin-empty">
                    {t('admin.promotions.empty', 'Aucune promotion ne correspond à la recherche.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Modal de Création / Modification */}
      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="admin-modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18, color: 'var(--navy)', fontWeight: 700 }}>
                {editingPromo ? 'Modifier la promotion' : 'Créer une nouvelle promotion'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="admin-form" style={{ padding: 24, overflowY: 'auto', maxHeight: '80vh' }}>
              <div className="prod-grid">
                <div>
                  <label>Code Promotionnel *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      required
                      placeholder="EX: ETE2026"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                    />
                    <button
                      type="button"
                      className="btn-admin ghost"
                      onClick={handleGenerateCode}
                      style={{ padding: '0 12px', whiteSpace: 'nowrap', fontSize: 12 }}
                      title="Générer un code aléatoire"
                    >
                      Générer
                    </button>
                  </div>
                </div>

                <div>
                  <label>Libellé / Description</label>
                  <input
                    type="text"
                    placeholder="Ex: Offre spéciale Épingle Phénix -20%"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  />
                </div>

                <div>
                  <label>Type de réduction</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="%">Pourcentage (%)</option>
                    <option value="€">Montant fixe (€)</option>
                  </select>
                </div>

                <div>
                  <label>Valeur de la réduction *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Ex: 20"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  />
                </div>

                <div className="full">
                  <label>Portée de la réduction *</label>
                  <select
                    value={formData.scope}
                    onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                    style={{ fontWeight: 600, color: formData.scope === 'Produits spécifiques' ? 'var(--blue)' : 'inherit' }}
                  >
                    {SCOPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SÉLECTEUR DE PRODUITS SPÉCIFIQUES */}
                {formData.scope === 'Produits spécifiques' && (
                  <div className="full" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <strong style={{ fontSize: 13, color: 'var(--navy)' }}>
                          Sélectionner les produits éligibles ({formData.selectedProducts.length} sélectionné(s))
                        </strong>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                          Cochez les articles auxquels cette réduction s'applique
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={handleSelectAllProducts}
                          style={{ background: '#E2E8F0', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Tout cocher
                        </button>
                        <button
                          type="button"
                          onClick={handleDeselectAllProducts}
                          style={{ background: '#E2E8F0', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Tout décocher
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Filtrer les produits par nom..."
                      value={prodSearchModal}
                      onChange={(e) => setProdSearchModal(e.target.value)}
                      style={{ marginBottom: 12, fontSize: 12 }}
                    />

                    <div
                      style={{
                        maxHeight: 180,
                        overflowY: 'auto',
                        background: '#fff',
                        border: '1px solid #E2E8F0',
                        borderRadius: 6,
                        padding: 8,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                        gap: 8,
                      }}
                    >
                      {filteredModalProducts.map((prod) => {
                        const isChecked = formData.selectedProducts.includes(prod.slug);
                        return (
                          <label
                            key={prod.slug}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '6px 10px',
                              borderRadius: 6,
                              background: isChecked ? '#EFF6FF' : '#F9FAFB',
                              border: isChecked ? '1px solid #BFDBFE' : '1px solid #F1F5F9',
                              cursor: 'pointer',
                              fontSize: 12,
                              margin: 0,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleProductSelection(prod.slug)}
                              style={{ width: 'auto', margin: 0 }}
                            />
                            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: isChecked ? 600 : 400 }}>
                              {prod.name}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{prod.price}</span>
                          </label>
                        );
                      })}
                      {filteredModalProducts.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 12, color: 'var(--muted)', fontSize: 12 }}>
                          Aucun produit trouvé.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label>Panier Minimum (€)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = Pas de minimum"
                    value={formData.minAmount}
                    onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                  />
                </div>

                <div>
                  <label>Limite d'utilisations max</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = Utilisations illimitées"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  />
                </div>

                <div>
                  <label>Date de début</label>
                  <input
                    type="date"
                    required
                    value={formData.start}
                    onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                  />
                </div>

                <div>
                  <label>Date de fin</label>
                  <input
                    type="date"
                    required
                    value={formData.end}
                    onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                  />
                </div>

                <div className="full">
                  <label>Statut initial</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <button
                      type="button"
                      className={`admin-switch ${formData.active ? 'on' : ''}`}
                      onClick={() => setFormData({ ...formData, active: !formData.active })}
                    >
                      <i />
                    </button>
                    <span style={{ fontWeight: 600, fontSize: 13, color: formData.active ? 'var(--green)' : 'var(--muted)' }}>
                      {formData.active ? 'Promotion Active' : 'Désactivée'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                <button type="button" className="btn-admin ghost" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-admin primary">
                  {editingPromo ? 'Enregistrer les modifications' : 'Créer la promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
