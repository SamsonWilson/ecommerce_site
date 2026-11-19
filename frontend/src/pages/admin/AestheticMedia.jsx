import { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { I } from './icons.jsx';
import { translateTexts } from '../../lib/api.js';
import { PageHead } from './ui.jsx';
import {
  useAestheticMedia,
  getAestheticMedia,
  mediaText,
  mediaTags,
  INITIAL_AESTHETIC_MEDIA,
  TABS,
  PLACEMENT_OPTIONS,
  PRESET_TAGS,
  resetAestheticMedia,
} from '../../data/aestheticMedia.js';

const DEFAULT_FORM = {
  title: '',
  subtitle: '',
  storytelling: '',
  image: '',
  placement: 'hero',
  badge: '✦ CRÉATION IMPÉRIALE',
  cta: 'Explorer la création',
  link: '/boutique',
  tags: ['Haute Coiffure', 'Soie Impériale'],
  status: 'active',
};

export default function AestheticMedia() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const shown = (item, field) => mediaText(item, field, t, lang);
  const shownTag = (item, tag) => mediaTags(item, t, lang)[item.tags.indexOf(tag)] || tag;

  // Liste et persistance synchronisée en temps réel avec la page d'accueil
  const [mediaList, saveMediaList] = useAestheticMedia();

  // Filtres & Navigation par onglets
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTag, setSelectedTag] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'panoramic' | 'table'

  // Sélection & Panneau d'inspection latéral (Drawer)
  const [inspectedItem, setInspectedItem] = useState(null);

  // Visionneuse Lightbox Plein Écran
  const [lightboxItem, setLightboxItem] = useState(null);

  // Modal d'ajout / modification
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [customTagInput, setCustomTagInput] = useState('');
  const [imageUploadPreview, setImageUploadPreview] = useState('');
  const fileInputRef = useRef(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef(null);

  const showToast = (msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(''), 3000);
  };

  // Statistiques calculées pour le ruban compact
  const stats = useMemo(() => {
    const total = mediaList.length;
    const featured = mediaList.filter((m) => m.status === 'featured').length;
    const active = mediaList.filter((m) => m.status === 'active' || m.status === 'featured').length;
    const totalViews = mediaList.reduce((acc, m) => acc + (m.views || 0), 0);
    return { total, featured, active, totalViews };
  }, [mediaList]);

  // Filtrage combiné : Onglet actif + Recherche + Statut + Tag
  const filteredMedia = useMemo(() => {
    return mediaList.filter((item) => {
      // Filtrage par onglet d'emplacement
      if (activeTab !== 'all' && item.placement !== activeTab) return false;

      // Filtrage par statut
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;

      // Filtrage par tag sélectionné
      if (selectedTag && !item.tags.includes(selectedTag)) return false;

      // Recherche textuelle
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchSub = (item.subtitle || '').toLowerCase().includes(q);
        const matchStory = (item.storytelling || '').toLowerCase().includes(q);
        const matchTag = item.tags.some((tg) => tg.toLowerCase().includes(q));
        if (!matchTitle && !matchSub && !matchStory && !matchTag) return false;
      }
      return true;
    });
  }, [mediaList, activeTab, statusFilter, selectedTag, search]);

  // Décompte par onglet pour afficher les badges numériques
  const tabCounts = useMemo(() => {
    const counts = { all: mediaList.length };
    TABS.forEach((tb) => {
      if (tb.id !== 'all') {
        counts[tb.id] = mediaList.filter((m) => m.placement === tb.id).length;
      }
    });
    return counts;
  }, [mediaList]);

  // Gestion des actions
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      ...DEFAULT_FORM,
      placement: activeTab !== 'all' ? activeTab : 'hero',
    });
    setImageUploadPreview('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      subtitle: item.subtitle,
      storytelling: item.storytelling,
      image: item.image,
      placement: item.placement,
      badge: item.badge,
      cta: item.cta,
      link: item.link,
      tags: [...item.tags],
      status: item.status,
    });
    setImageUploadPreview(item.image);
    setModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showToast(t('admin.media.veuillezSelectionnerUnFichierImageValide'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result;
        setImageUploadPreview(base64);
        setFormData((prev) => ({ ...prev, image: base64 }));
        showToast(t('admin.media.imageChargeeAvecSucces'));
      };
      reader.readAsDataURL(file);
    }
  };

  // La médiathèque n'est pas en base : les textes sont traduits à l'enregistrement.
  const translateItem = (item) => {
    const entries = [
      ...['title', 'subtitle', 'storytelling', 'badge', 'cta'].map((field) => [field, item[field]]),
      ...(item.tags || []).map((tag, index) => [`tag${index}`, tag]),
    ].filter(([, text]) => text);
    translateTexts(Object.fromEntries(entries))
      .then((translations) => saveMediaList(
        getAestheticMedia().map((media) => (media.id === item.id ? { ...media, translations } : media))
      ))
      .catch(() => {});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast(t('admin.media.leTitreDuVisuelEstObligatoire'));
      return;
    }
    if (!formData.image.trim()) {
      showToast(t('admin.media.veuillezTeleverserUneImageOuRenseigner'));
      return;
    }

    const placementObj = PLACEMENT_OPTIONS.find((p) => p.value === formData.placement);
    const placementLabel = placementObj ? placementObj.label.split(' (')[0] : 'Vitrine';

    if (editingItem) {
      const updated = mediaList.map((m) =>
        m.id === editingItem.id
          ? {
            ...m,
            ...formData,
            placementLabel,
            translations: undefined,
          }
          : m
      );
      saveMediaList(updated);
      translateItem({ ...editingItem, ...formData });
      if (inspectedItem?.id === editingItem.id) {
        setInspectedItem({ ...inspectedItem, ...formData, placementLabel });
      }
      showToast(t('admin.media.updated', { title: formData.title }));
    } else {
      const newItem = {
        id: Date.now(),
        ...formData,
        placementLabel,
        resolution: '1920 × 1080 (HD)',
        views: 0,
        createdAt: new Date().toISOString().split('T')[0],
        palette: ['#B91C14', '#D4AF37', '#1A2942', '#FAF8F5'],
      };
      saveMediaList([newItem, ...mediaList]);
      translateItem(newItem);
      showToast(t('admin.media.added', { title: formData.title }));
    }

    setModalOpen(false);
  };

  const handleDelete = (id, title) => {
    if (window.confirm(t('admin.media.confirmDelete', { title }))) {
      const updated = mediaList.filter((m) => m.id !== id);
      saveMediaList(updated);
      if (inspectedItem?.id === id) setInspectedItem(null);
      if (lightboxItem?.id === id) setLightboxItem(null);
      showToast(t('admin.media.deleted', { title }));
    }
  };

  const handleToggleStatus = (id) => {
    const updated = mediaList.map((m) => {
      if (m.id === id) {
        const nextStatus = m.status === 'featured' ? 'active' : m.status === 'active' ? 'draft' : 'featured';
        return { ...m, status: nextStatus };
      }
      return m;
    });
    saveMediaList(updated);
    if (inspectedItem?.id === id) {
      const item = updated.find((m) => m.id === id);
      setInspectedItem(item);
    }
    showToast(t('admin.media.statutDexpositionActualise'));
  };

  const handleCopyLink = (imgUrl) => {
    const fullUrl = imgUrl.startsWith('http') ? imgUrl : `${window.location.origin}${imgUrl}`;
    navigator.clipboard?.writeText(fullUrl);
    showToast(t('admin.media.lienDuVisuelCopieDansLe'));
  };

  const handleResetDefaults = () => {
    if (window.confirm(t('admin.media.reinitialiserLaMediathequeAvecLes6'))) {
      resetAestheticMedia();
      setInspectedItem(null);
      showToast(t('admin.media.mediathequeReinitialiseeAvecSucces'));
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(mediaList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mediatheque_esthetique_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(t('admin.media.exportJsonTelechargeAvecSucces'));
  };

  const handleAddTag = (tag) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((tag) => tag !== tagToRemove) }));
  };

  return (
    <div className="admin-page-content aesthetic-media-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="aesthetic-toast">
          <span className="toast-icon">✦</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          1. EN-TÊTE ÉPURÉ AVEC ACTIONS REGROUPÉES
          ========================================================================= */}
      <PageHead
        title={t('admin.media.mediathequeEsthetiqueBannieres')}
        subtitle={t('admin.media.orchestrezVosVisuelsDartisanatImperialBannieres')}
      >
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={handleExportJSON}
          title={t('admin.media.exporterEnJson')}
        >
          {I.download} {t('admin.media.export')}
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={handleResetDefaults}
          title={t('admin.media.restaurerLaSelectionImperialeOfficielle')}
        >
          {t('admin.stockReport.reset')}
        </button>
        <a
          href="/#galerie-esthetique"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-btn live-store-head-btn"
          title={t('admin.media.ouvrirLaPageDAccueilDe')}
        >
          <span>{t('admin.media.voirSurLAccueil')}</span>
          <span className="live-arr">➔</span>
        </a>
        <button
          type="button"
          className="admin-btn admin-btn-primary aesthetic-glow-btn"
          onClick={handleOpenAdd}
        >
          {I.plus} {t('admin.media.newVisual')}
        </button>
      </PageHead>

      {/* =========================================================================
          BANNIÈRE DE SYNCHRONISATION EN DIRECT AVEC LA PAGE PRINCIPALE
          ========================================================================= */}
      <div className="aesthetic-live-sync-banner">
        <div className="live-banner-left">
          <span className="live-pulse-container">
            <span className="live-pulse-wave" />
            <span className="live-pulse-core" />
          </span>
          <div className="live-banner-content">
            <span className="live-status-tag">{t('admin.media.diffusionEnDirect')}</span>
            <span className="live-banner-sub">
              {t('admin.media.liveHint')}
            </span>
          </div>
        </div>
        <div className="live-banner-right">
          <span className="live-status-pill">
            <span className="pill-dot" /> {t('admin.media.synced')}
          </span>
        </div>
      </div>

      {/* =========================================================================
          2. RUBAN DE STATISTIQUES COMPACT (Prend peu de hauteur pour libérer l'espace)
          ========================================================================= */}
      <div className="aesthetic-ribbon-bar">
        <div className="ribbon-metric">
          <span className="metric-dot gold" />
          <span className="metric-val">{stats.total}</span>
          <span className="metric-lbl">{t('admin.media.visuelsEnregistres')}</span>
        </div>
        <div className="ribbon-sep" />
        <div className="ribbon-metric">
          <span className="metric-dot red" />
          <span className="metric-val">{stats.featured}</span>
          <span className="metric-lbl">{t('admin.media.bannieresEnVedetteHero')}</span>
        </div>
        <div className="ribbon-sep" />
        <div className="ribbon-metric">
          <span className="metric-dot green" />
          <span className="metric-val">{stats.active}</span>
          <span className="metric-lbl">{t('admin.media.visuelsActifsEnBoutique')}</span>
        </div>
        <div className="ribbon-sep" />
        <div className="ribbon-metric">
          <span className="metric-dot blue" />
          <span className="metric-val">{stats.totalViews.toLocaleString('fr-FR')}</span>
          <span className="metric-lbl">{t('admin.media.impressionsVitrine')}</span>
        </div>
      </div>

      {/* =========================================================================
          3. BARRE DE NAVIGATION PAR ONGLETS (Hero, Spotlight, Lookbook, Packaging)
          ========================================================================= */}
      <div className="aesthetic-tabs-bar">
        {TABS.map((tab) => {
          const count = tabCounts[tab.id] || 0;
          return (
            <button
              key={tab.id}
              type="button"
              className={`aesthetic-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{t(`admin.media.tabs.${tab.id}`, tab.label)}</span>
              <span className="tab-badge">{count}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          4. BARRE DE CONTRÔLE SUR UNE SEULE LIGNE (Recherche, Filtre Statut & Mode Vue)
          ========================================================================= */}
      <div className="aesthetic-controls-row">
        {/* Recherche instantanée */}
        <div className="controls-search-wrap">
          <span className="search-icon">{I.search}</span>
          <input
            type="text"
            className="controls-search-input"
            placeholder={t('admin.media.rechercherParTitreMatiereOrJade')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearch('')}
              title={t('admin.media.effacer')}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtre par statut */}
        <div className="controls-filter-wrap">
          <select
            className="controls-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{t('admin.media.tousLesStatuts')}</option>
            <option value="featured">{t('admin.media.enVedettePrioriteHero')}</option>
            <option value="active">{t('admin.media.actifEnLigne')}</option>
            <option value="draft">{t('admin.media.enReserveBrouillon')}</option>
          </select>
        </div>

        {/* Tags rapides déroulants */}
        <div className="controls-filter-wrap">
          <select
            className="controls-select"
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
          >
            <option value="">{t('admin.media.tousLesUniversMatieres')}</option>
            {PRESET_TAGS.map((tag, index) => (
              <option key={tag} value={tag}>
                #{t(`admin.media.presetTags.${index}`, tag)}
              </option>
            ))}
          </select>
        </div>

        {/* Commutateur de mode d'affichage (Grille / Panoramique / Liste) */}
        <div className="controls-view-mode">
          <button
            type="button"
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title={t('admin.media.grilleVisuelleEpuree')}
          >
            {I.layers}
            <span className="view-lbl">{t('admin.media.grille')}</span>
          </button>
          <button
            type="button"
            className={`view-btn ${viewMode === 'panoramic' ? 'active' : ''}`}
            onClick={() => setViewMode('panoramic')}
            title={t('admin.media.apercuBannieresPanoramiques169')}
          >
            {I.eye}
            <span className="view-lbl">{t('admin.media.bannieres')}</span>
          </button>
          <button
            type="button"
            className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title={t('admin.media.listeTabulaireDetaillee')}
          >
            {I.bag}
            <span className="view-lbl">{t('admin.media.tableau')}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          5. CONTENU PRINCIPAL SELON LE MODE CHOISI
          ========================================================================= */}

      {/* MODE 1 : GRILLE VISUELLE ÉPURÉE (IMAGE FIRST) */}
      {viewMode === 'grid' && (
        <div className="aesthetic-clean-grid">
          {filteredMedia.length === 0 ? (
            <div className="aesthetic-empty-card">
              <div className="empty-sparkle">✦</div>
              <h3>{t('admin.media.aucunVisuelTrouveDansCetOnglet')}</h3>
              <p>{t('admin.media.essayezDeReinitialiserVosFiltresOu')}</p>
              <button
                type="button"
                className="admin-btn admin-btn-primary aesthetic-glow-btn"
                onClick={handleOpenAdd}
              >
                {I.plus} Ajouter une création
              </button>
            </div>
          ) : (
            filteredMedia.map((item) => (
              <div
                key={item.id}
                className={`clean-visual-card status-${item.status} ${inspectedItem?.id === item.id ? 'is-inspected' : ''}`}
              >
                {/* Zone Image avec ratio élégant */}
                <div
                  className="clean-card-thumb"
                  onClick={() => setInspectedItem(item)}
                  title={t('admin.media.cliquerPourInspecterLesDetails')}
                >
                  <img src={item.image} alt={shown(item, 'title')} className="thumb-img" loading="lazy" />
                  <div className="thumb-gradient" />

                  {/* Badges d'angle */}
                  <div className="thumb-badges-top">
                    <span className="thumb-pill-placement">{t(`admin.media.placements.${item.placement}`, item.placementLabel)}</span>
                    <button
                      type="button"
                      className={`thumb-pill-status ${item.status} clickable`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(item.id);
                      }}
                      title={t('admin.media.cliquerPourChangerLeStatutEn')}
                    >
                      {item.status === 'featured' && t('admin.media.statusFeatured')}
                      {item.status === 'active' && t('admin.media.statusOnlineHome')}
                      {item.status === 'draft' && t('admin.media.statusHiddenDraft')}
                    </button>
                  </div>

                  {/* Bouton loupe plein écran rapide */}
                  <button
                    type="button"
                    className="thumb-zoom-quick"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxItem(item);
                    }}
                    title={t('admin.media.pleinEcranHauteResolution')}
                  >
                    {I.eye}
                  </button>
                </div>

                {/* Corps de la carte */}
                <div className="clean-card-body">
                  <div className="clean-prestige-row">
                    <span className="clean-prestige-tag">{shown(item, 'badge')}</span>
                    {item.status !== 'draft' ? (
                      <span className="clean-live-indicator live" title={t('admin.media.diffuseEnDirectSurLaPage')}>
                        <span className="live-dot" /> {t('admin.media.liveOnHome')}
                      </span>
                    ) : (
                      <span className="clean-live-indicator draft" title={t('admin.media.brouillonMasqueDeLaBoutique')}>
                        <span className="draft-dot" /> {t('admin.media.hiddenFromHome')}
                      </span>
                    )}
                  </div>
                  <h3
                    className="clean-title"
                    onClick={() => setInspectedItem(item)}
                    title={shown(item, 'title')}
                  >
                    {shown(item, 'title')}
                  </h3>
                  <p className="clean-sub">{shown(item, 'subtitle')}</p>

                  {/* Tags esthétiques condensés */}
                  <div className="clean-tags-condensed">
                    {item.tags.slice(0, 3).map((tg) => (
                      <span
                        key={tg}
                        className="clean-tag"
                        onClick={() => setSelectedTag(tg)}
                        title={t('admin.media.filterBy', { tag: tg })}
                      >
                        #{shownTag(item, tg)}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span
                        className="clean-tag more"
                        onClick={() => setInspectedItem(item)}
                      >
                        +{item.tags.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Nuancier discret */}
                  {item.palette && (
                    <div className="clean-swatches-row">
                      {item.palette.map((col, idx) => (
                        <span
                          key={idx}
                          className="clean-swatch"
                          style={{ backgroundColor: col }}
                          title={t('admin.media.colorTitle', { code: col })}
                          onClick={() => {
                            navigator.clipboard?.writeText(col);
                            showToast(t('admin.media.codeCopied', { code: col }));
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Barre d'action basse de la carte */}
                  <div className="clean-card-footer">
                    <button
                      type="button"
                      className="clean-inspect-btn"
                      onClick={() => setInspectedItem(item)}
                      title={t('admin.media.inspecterLeContePoetiqueEtLes')}
                    >
                      {t('admin.media.detailsStory')}
                    </button>

                    <div className="clean-actions-cluster">
                      <button
                        type="button"
                        className="icon-action-btn"
                        onClick={() => handleCopyLink(item.image)}
                        title={t('admin.media.copierLeLienDirectDeL')}
                      >
                        {I.copy}
                      </button>
                      <button
                        type="button"
                        className="icon-action-btn edit"
                        onClick={() => handleOpenEdit(item)}
                        title={t('admin.media.modifierCeVisuel')}
                      >
                        {I.pencil}
                      </button>
                      <button
                        type="button"
                        className="icon-action-btn delete"
                        onClick={() => handleDelete(item.id, item.title)}
                        title={t('admin.media.supprimer')}
                      >
                        {I.trash}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODE 2 : APERÇU BANNIÈRES PANORAMIQUES VITRINE */}
      {viewMode === 'panoramic' && (
        <div className="aesthetic-panoramic-view">
          {filteredMedia.map((item) => (
            <div key={item.id} className="panoramic-preview-card">
              <div
                className="panoramic-stage"
                style={{ backgroundImage: `url(${item.image})` }}
                onClick={() => setLightboxItem(item)}
              >
                <div className="panoramic-shade" />
                <div className="panoramic-content-box">
                  <span className="panoramic-prestige-badge">{shown(item, 'badge')}</span>
                  <h2 className="panoramic-hero-title">{shown(item, 'title')}</h2>
                  <p className="panoramic-hero-sub">{shown(item, 'subtitle')}</p>
                  <div className="panoramic-hero-cta">
                    <span className="panoramic-cta-button">
                      {shown(item, 'cta')} ➔
                    </span>
                    <span className="panoramic-dest-link">
                      Destination : {item.link}
                    </span>
                  </div>
                </div>
              </div>

              <div className="panoramic-bottom-bar">
                <div className="panoramic-specs">
                  <strong>{t('admin.media.locationLabel')}</strong> {t(`admin.media.placements.${item.placement}`, item.placementLabel)} • <strong>{t('admin.media.formatLabel')}</strong> {item.resolution}
                </div>
                <div className="panoramic-bar-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary small"
                    onClick={() => handleCopyLink(item.image)}
                  >
                    {I.copy} Copier lien
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary small"
                    onClick={() => handleOpenEdit(item)}
                  >
                    {I.pencil} Modifier
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary small"
                    onClick={() => setLightboxItem(item)}
                  >
                    {I.eye} Plein écran
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODE 3 : MODE TABLEAU SYNTHÉTIQUE */}
      {viewMode === 'table' && (
        <div className="aesthetic-table-card">
          <table className="aesthetic-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>{t('admin.media.vignette')}</th>
                <th>{t('admin.media.titreAccroche')}</th>
                <th>{t('admin.media.emplacement')}</th>
                <th>{t('admin.media.universTags')}</th>
                <th>{t('admin.media.statut')}</th>
                <th style={{ textAlign: 'right' }}>{t('admin.media.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredMedia.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div
                      className="table-img-cell"
                      onClick={() => setLightboxItem(item)}
                      title={t('admin.media.agrandir')}
                    >
                      <img src={item.image} alt={shown(item, 'title')} />
                    </div>
                  </td>
                  <td>
                    <div
                      className="table-title-link"
                      onClick={() => setInspectedItem(item)}
                    >
                      {shown(item, 'title')}
                    </div>
                    <div className="table-sub-link">{shown(item, 'subtitle')}</div>
                  </td>
                  <td>
                    <span className="table-placement-pill">{t(`admin.media.placements.${item.placement}`, item.placementLabel)}</span>
                  </td>
                  <td>
                    <div className="table-tags-cell">
                      {item.tags.map((tg) => (
                        <span key={tg} className="table-tag-chip">
                          #{shownTag(item, tg)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`thumb-pill-status ${item.status} clickable`}
                      onClick={() => handleToggleStatus(item.id)}
                      title={t('admin.media.cliquerPourChangerLeStatutEn')}
                    >
                      {item.status === 'featured' && t('admin.media.statusFeatured')}
                      {item.status === 'active' && t('admin.media.statusOnline')}
                      {item.status === 'draft' && t('admin.media.statusHidden')}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions-cell">
                      <button
                        type="button"
                        className="table-btn-icon"
                        onClick={() => setInspectedItem(item)}
                        title={t('admin.media.details')}
                      >
                        {I.eye}
                      </button>
                      <button
                        type="button"
                        className="table-btn-icon"
                        onClick={() => handleOpenEdit(item)}
                        title={t('admin.media.modifier')}
                      >
                        {I.pencil}
                      </button>
                      <button
                        type="button"
                        className="table-btn-icon delete"
                        onClick={() => handleDelete(item.id, item.title)}
                        title={t('admin.media.supprimer')}
                      >
                        {I.trash}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          6. VOLET D'INSPECTION LATÉRAL (DRAWER DÉTAILLÉ)
          ========================================================================= */}
      {inspectedItem && (
        <div className="aesthetic-drawer-backdrop" onClick={() => setInspectedItem(null)}>
          <div className="aesthetic-drawer-panel" onClick={(e) => e.stopPropagation()}>
            {/* Entête du volet */}
            <div className="drawer-head">
              <div className="drawer-title-group">
                <span className="drawer-kicker">{t('admin.media.ficheDartisanatMetadonnees')}</span>
                <h3>{shown(inspectedItem, 'title')}</h3>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setInspectedItem(null)}
              >
                ✕
              </button>
            </div>

            {/* Contenu déroulant du volet */}
            <div className="drawer-body">
              {/* Image en vedette avec bouton plein écran */}
              <div
                className="drawer-media-preview"
                onClick={() => setLightboxItem(inspectedItem)}
                title={t('admin.media.cliquerPourVoirEnPleinEcran')}
              >
                <img src={inspectedItem.image} alt={shown(inspectedItem, 'title')} />
                <div className="drawer-zoom-overlay">
                  <span>{I.eye} Voir en plein écran HD</span>
                </div>
              </div>

              {/* Statut & Emplacement */}
              <div className="drawer-section">
                <div className="drawer-pills-row">
                  <span className="thumb-pill-placement">{t(`admin.media.placements.${inspectedItem.placement}`, inspectedItem.placementLabel)}</span>
                  <span className={`thumb-pill-status ${inspectedItem.status}`}>
                    {inspectedItem.status === 'featured' && t('admin.media.statusFeaturedHero')}
                    {inspectedItem.status === 'active' && t('admin.media.statusActiveOnline')}
                    {inspectedItem.status === 'draft' && t('admin.media.statusReserve')}
                  </span>
                  <button
                    type="button"
                    className="drawer-toggle-status-btn"
                    onClick={() => handleToggleStatus(inspectedItem.id)}
                  >
                    Changer statut
                  </button>
                </div>
              </div>

              {/* Conte poétique / Storytelling culturel */}
              <div className="drawer-section">
                <h4 className="drawer-sec-title">{t('admin.media.contePoetiqueHeritageImperial')}</h4>
                <div className="drawer-story-box">
                  <p>« {shown(inspectedItem, 'storytelling')} »</p>
                </div>
              </div>

              {/* Univers & Tags */}
              <div className="drawer-section">
                <h4 className="drawer-sec-title">{t('admin.media.universMatieres')}</h4>
                <div className="drawer-tags-wrap">
                  {inspectedItem.tags.map((tg) => (
                    <span key={tg} className="clean-tag">
                      #{shownTag(inspectedItem, tg)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Harmonie des couleurs */}
              {inspectedItem.palette && (
                <div className="drawer-section">
                  <h4 className="drawer-sec-title">{t('admin.media.paletteDeCouleurs')}</h4>
                  <div className="drawer-palette-grid">
                    {inspectedItem.palette.map((col, idx) => (
                      <div
                        key={idx}
                        className="palette-chip-copy"
                        onClick={() => {
                          navigator.clipboard?.writeText(col);
                          showToast(t('admin.media.colorCopied', { code: col }));
                        }}
                        title={t('admin.media.cliquerPourCopierLeCodeHex')}
                      >
                        <span className="chip-dot" style={{ backgroundColor: col }} />
                        <span className="chip-hex">{col}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Spécifications techniques */}
              <div className="drawer-section">
                <h4 className="drawer-sec-title">{t('admin.media.ficheTechnique')}</h4>
                <div className="drawer-specs-table">
                  <div className="spec-item">
                    <span className="spec-k">{t('admin.media.resolutionConseillee')}</span>
                    <span className="spec-v">{inspectedItem.resolution || '1920 × 1080'}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-k">{t('admin.media.appelALActionCta')}</span>
                    <span className="spec-v">{shown(inspectedItem, 'cta')}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-k">{t('admin.media.lienCible')}</span>
                    <span className="spec-v">{inspectedItem.link}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-k">{t('admin.media.dateDexposition')}</span>
                    <span className="spec-v">{inspectedItem.createdAt}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pied du volet avec actions */}
            <div className="drawer-foot">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => handleCopyLink(inspectedItem.image)}
              >
                {I.copy} Copier le lien
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => {
                  handleOpenEdit(inspectedItem);
                }}
              >
                {I.pencil} Modifier
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary aesthetic-glow-btn"
                onClick={() => setLightboxItem(inspectedItem)}
              >
                {I.eye} Grand Écran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          7. MODAL D'AJOUT ET D'ÉDITION DE VISUEL
          ========================================================================= */}
      {modalOpen && (
        <div className="aesthetic-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="aesthetic-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="aesthetic-modal-header">
              <div>
                <h2>{editingItem ? t('admin.media.editHeading') : t('admin.media.newHeading')}</h2>
                <p className="modal-sub">
                  Renseignez le titre, le slogan poétique et téléversez votre image d’artisanat.
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="aesthetic-modal-form">
              <div className="modal-form-grid">
                {/* Colonne gauche : Métadonnées et Storytelling */}
                <div className="modal-col-left">
                  <div className="form-group">
                    <label className="form-label">
                      {t('admin.media.titleLabel')} <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={t('admin.media.exLaDanseDuPhenixDu')}
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('admin.media.accrocheSloganPoetique')}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={t('admin.media.exHauteCoutureNuptialeCousueDe')}
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      {t('admin.media.conteCulturelStorytellingPoetique')}
                    </label>
                    <textarea
                      className="form-textarea"
                      rows={4}
                      placeholder={t('admin.media.decrivezLinspirationDynastiqueLeSymbolismeConjugal')}
                      value={formData.storytelling}
                      onChange={(e) => setFormData({ ...formData, storytelling: e.target.value })}
                    />
                  </div>
                </div>

                {/* Colonne droite : Upload et Suggestions */}
                <div className="modal-col-right">
                  <div className="form-group">
                    <label className="form-label">
                      {t('admin.media.imageLabel')} <span className="req">*</span>
                    </label>

                    <div
                      className="image-dropzone"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                      />
                      {imageUploadPreview ? (
                        <div className="dropzone-preview-wrap">
                          <img
                            src={imageUploadPreview}
                            alt={t('admin.media.apercu')}
                            className="dropzone-preview-img"
                          />
                          <div className="dropzone-overlay-change">
                            <span>{t('admin.media.changerLImageCliquer')}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="dropzone-placeholder">
                          <div className="dropzone-icon">{I.image}</div>
                          <span className="dropzone-title">
                            Glissez ou cliquez pour téléverser
                          </span>
                          <span className="dropzone-hint">
                            PNG, JPG, WEBP jusqu'à 15 Mo
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="url-input-wrap">
                      <span className="url-label">{t('admin.media.ouUrlDeLImage')}</span>
                      <input
                        type="text"
                        className="form-input small"
                        placeholder={t('admin.media.exImagesPhoenixEmbroideryVeilJpg')}
                        value={formData.image}
                        onChange={(e) => {
                          setFormData({ ...formData, image: e.target.value });
                          setImageUploadPreview(e.target.value);
                        }}
                      />
                    </div>

                    <div className="catalog-suggestions">
                      <span className="sugg-label">{t('admin.media.bibliothequeInterneDuSite')}</span>
                      <div className="sugg-thumbs">
                        {[
                          { path: '/images/phoenix_embroidery_veil.jpg', name: t('admin.media.broderiePhenix') },
                          { path: '/images/jade_imperial_crown.jpg', name: t('admin.media.tiareJade') },
                          { path: '/images/bridal_hairpin.jpg', name: t('admin.media.epingleCinabre') },
                          { path: '/images/hero_phoenix_crown.jpg', name: t('admin.media.diademeRoyal') },
                          { path: '/images/signature_gift_box.jpg', name: t('admin.media.ecrinSignature') },
                          { path: '/hero.png', name: t('admin.media.parureHeritage') },
                        ].map((s) => (
                          <div
                            key={s.path}
                            className={`sugg-thumb ${formData.image === s.path ? 'selected' : ''}`}
                            onClick={() => {
                              setFormData({ ...formData, image: s.path });
                              setImageUploadPreview(s.path);
                            }}
                            title={s.name}
                          >
                            <img src={s.path} alt={s.name} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Gestion des tags */}
                  <div className="form-group">
                    <label className="form-label">{t('admin.media.tagsMatieresPrecieuses')}</label>
                    <div className="tags-chips-editor">
                      {formData.tags.map((tg) => (
                        <span key={tg} className="editor-tag-pill">
                          #{tg}
                          <button
                            type="button"
                            className="remove-tag-btn"
                            onClick={() => handleRemoveTag(tg)}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="add-tag-input-row">
                      <input
                        type="text"
                        className="form-input small"
                        placeholder={t('admin.media.ajouterUnTag')}
                        value={customTagInput}
                        onChange={(e) => setCustomTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (customTagInput.trim()) {
                              handleAddTag(customTagInput.trim());
                              setCustomTagInput('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary small"
                        onClick={() => {
                          if (customTagInput.trim()) {
                            handleAddTag(customTagInput.trim());
                            setCustomTagInput('');
                          }
                        }}
                      >
                        +
                      </button>
                    </div>

                    <div className="suggested-tags-cloud">
                      {PRESET_TAGS.filter((pt) => !formData.tags.includes(pt)).slice(0, 6).map((pt) => (
                        <button
                          key={pt}
                          type="button"
                          className="suggested-tag-btn"
                          onClick={() => handleAddTag(pt)}
                        >
                          + {t(`admin.media.presetTags.${PRESET_TAGS.indexOf(pt)}`, pt)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="aesthetic-modal-footer">
                <span className="modal-sync-hint">
                  {t('admin.media.saveHint')}
                </span>
                <div className="modal-footer-btns">
                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    onClick={() => setModalOpen(false)}
                  >
                    {t('admin.media.annuler')}
                  </button>
                  <button
                    type="submit"
                    className="admin-btn admin-btn-primary aesthetic-glow-btn"
                  >
                    {editingItem ? t('admin.media.updatePublish') : t('admin.media.publishMain')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. VISIONNEUSE LIGHTBOX HAUTE RÉSOLUTION (GRAND ÉCRAN)
          ========================================================================= */}
      {lightboxItem && (
        <div className="aesthetic-lightbox-backdrop" onClick={() => setLightboxItem(null)}>
          <div className="aesthetic-lightbox-container" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setLightboxItem(null)}
              title={t('admin.media.fermer')}
            >
              ✕
            </button>

            <div className="lightbox-image-view">
              <img src={lightboxItem.image} alt={shown(lightboxItem, 'title')} className="lightbox-img" />
              <div className="lightbox-zoom-hint">
                ✦ Rendu Haute Définition • Maison Lián
              </div>
            </div>

            <div className="lightbox-details-panel">
              <div className="lightbox-badge-row">
                <span className="placement-badge">{t(`admin.media.placements.${lightboxItem.placement}`, lightboxItem.placementLabel)}</span>
                <span className={`thumb-pill-status ${lightboxItem.status}`}>
                  {lightboxItem.status === 'featured' && t('admin.media.statusFeatured')}
                  {lightboxItem.status === 'active' && t('admin.media.statusActive')}
                  {lightboxItem.status === 'draft' && t('admin.media.statusReserve')}
                </span>
              </div>

              <div className="lightbox-prestige">{lightboxItem.badge}</div>
              <h2 className="lightbox-title">{shown(lightboxItem, 'title')}</h2>
              <p className="lightbox-sub">{shown(lightboxItem, 'subtitle')}</p>

              <div className="lightbox-story-box">
                <div className="story-title">{t('admin.media.symboliqueHistoireDeLartisanat')}</div>
                <p className="story-desc">{shown(lightboxItem, 'storytelling')}</p>
              </div>

              <div className="lightbox-tags-row">
                {lightboxItem.tags.map((tg) => (
                  <span key={tg} className="clean-tag">
                    #{shownTag(lightboxItem, tg)}
                  </span>
                ))}
              </div>

              {lightboxItem.palette && (
                <div className="lightbox-palette-section">
                  <div className="palette-title">{t('admin.media.harmonieDesCouleurs')}</div>
                  <div className="lightbox-swatches-grid">
                    {lightboxItem.palette.map((col, i) => (
                      <div
                        key={i}
                        className="palette-swatch-card"
                        onClick={() => {
                          navigator.clipboard?.writeText(col);
                          showToast(t('admin.media.colorCopied', { code: col }));
                        }}
                        title={t('admin.media.cliquerPourCopierLeCodeHex')}
                      >
                        <span className="swatch-color" style={{ backgroundColor: col }} />
                        <span className="swatch-hex">{col}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="lightbox-specs-table">
                <div className="spec-row">
                  <span className="spec-name">{t('admin.media.resolution')}</span>
                  <span className="spec-val">{lightboxItem.resolution || '1920 × 1080'}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-name">{t('admin.media.boutonCta')}</span>
                  <span className="spec-val">{shown(lightboxItem, 'cta')} ({lightboxItem.link})</span>
                </div>
              </div>

              <div className="lightbox-actions-bar">
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary"
                  onClick={() => handleCopyLink(lightboxItem.image)}
                >
                  {I.copy} Copier l'URL
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={() => {
                    setLightboxItem(null);
                    handleOpenEdit(lightboxItem);
                  }}
                >
                  {I.pencil} Modifier ce visuel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
