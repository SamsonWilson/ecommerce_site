import { useState, useEffect } from 'react';

// Version de cache pour forcer l'invalidation Cloudflare / CDN
export const withMediaVersion = (url) => {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('/images/') && !url.includes('?')) {
    return `${url}?v=20261022`;
  }
  return url;
};

// Collection officielle des créations d'artisanat impérial Maison Lián
export const INITIAL_AESTHETIC_MEDIA = [
  {
    id: 1,
    title: 'La Danse du Phénix & du Dragon — Broderie Or Impériale',
    subtitle: 'Haute couture nuptiale cousue de fils d’or 24 carats sur soie pourpre impériale',
    storytelling: 'Inspirée des parures de mariage des dynasties Ming et Qing, cette broderie rassemble le Phénix (Fenghuang) et le Dragon (Long), symboles ultimes de l’harmonie céleste et du double bonheur conjugal (双喜). Chaque millimètre d’or est posé à la main selon la technique ancestrale du filigranage couché.',
    image: withMediaVersion('/images/phoenix_embroidery_veil.jpg'),
    placement: 'hero',
    placementLabel: 'Bannière Hero Accueil',
    badge: '✦ PIÈCE MAÎTRESSE',
    cta: 'Explorer la collection impériale',
    link: '/boutique?category=ceremonie',
    tags: ['Soie Impériale', 'Fils d’or', 'Harmonie Céleste', 'Dynastie Ming', 'Broderie'],
    status: 'active',
    publishedOnHome: true,
    palette: ['#9B111E', '#D4AF37', '#73000A', '#F6E7B0', '#1C2833'],
    resolution: '1920 × 1080 (16:9)',
    views: 1420,
    createdAt: '2026-06-15',
  },
  {
    id: 2,
    title: 'La Tiare Céleste Impériale — Jade Blanc de Hetian & Filigrane',
    subtitle: 'Couronne de mariée ornée de fleurs de jade pur sculptées et pampilles de perles fines',
    storytelling: 'Chef-d’œuvre de la haute parure impériale, cette tiare allie l’or fin ajouré aux vertus protectrices du jade blanc de Hetian, réputé pour sa pureté laiteuse et sa noblesse intemporelle. Les pampilles suspendues dansent au rythme des pas de la mariée, captant la lumière des cérémonies solennelles.',
    image: withMediaVersion('/images/jade_imperial_crown.jpg'),
    placement: 'hero',
    placementLabel: 'Bannière Hero Accueil',
    badge: '✦ HAUTE JOAILLERIE',
    cta: 'Découvrir les tiares royales',
    link: '/boutique?category=reception',
    tags: ['Haute Coiffure', 'Jade Blanc', 'Or 24K', 'Pampilles', 'Couronne Impériale'],
    status: 'active',
    publishedOnHome: true,
    palette: ['#C59B27', '#EAE7DC', '#1A2942', '#8C6D23', '#273C5A'],
    resolution: '1920 × 1080 (16:9)',
    views: 1180,
    createdAt: '2026-06-20',
  },
  {
    id: 3,
    title: 'L’Épingle Phénix de Cinabre & Perles d’Eau Douce',
    subtitle: 'Ornements de cheveux traditionnels au charme vermillon et perles baroques',
    storytelling: 'L’art du kanzashi chinois et du pin’er impérial s’exprime dans cette épingle délicatement sculptée. Le cinabre vermillon invoque la prospérité et éloigne les mauvais augures, tandis que les perles d’eau douce symbolisent la douceur et la fidélité de l’union.',
    image: withMediaVersion('/images/bridal_hairpin.jpg'),
    placement: 'spotlight',
    placementLabel: 'Vitrine Spotlight',
    badge: 'HAUTE COIFFURE',
    cta: 'Découvrir les peignes',
    link: '/boutique?category=ceremonie',
    tags: ['Épingle', 'Cinabre Vermillon', 'Perles d’eau douce', 'Coiffure Nuptiale'],
    status: 'active',
    publishedOnHome: true,
    palette: ['#B22222', '#D4AF37', '#2A2A2A', '#F9F5EA'],
    resolution: '1200 × 900 (4:3)',
    views: 890,
    createdAt: '2026-07-01',
  },
  {
    id: 4,
    title: 'Diadème Royal Phénix Étincelant',
    subtitle: 'Éclat majestueux des joyaux impériaux pour magnifier les vœux éternels',
    storytelling: 'Un hommage vibrant aux grandes célébrations de cour. Les ailes déployées du phénix évoquent la renaissance et l’élévation spirituelle des époux, serties de cristaux étincelants et d’entrelacs dorés à la flamme.',
    image: withMediaVersion('/images/hero_phoenix_crown.jpg'),
    placement: 'lookbook',
    placementLabel: 'Lookbook Nuptial',
    badge: 'PRESTIGE CÉRÉMONIE',
    cta: 'Voir les diadèmes royaux',
    link: '/boutique?category=bijous',
    tags: ['Diadème', 'Or Éclatant', 'Phénix', 'Cérémonie'],
    status: 'active',
    publishedOnHome: true,
    palette: ['#C99A2C', '#3A1E1E', '#E6C687', '#1D1D1D'],
    resolution: '1600 × 1000 (16:10)',
    views: 940,
    createdAt: '2026-07-05',
  },
  {
    id: 5,
    title: 'L’Écrin Signature Maison Lián & Ruban Satiné',
    subtitle: 'Coffret velours rouge passion, certificat d’authenticité calligraphié et ruban d’or',
    storytelling: 'L’émotion de l’unboxing royal. Chaque création précieuse est logée dans un écrin de velours capitonné, frappé du sceau doré Maison Lián, gage d’authenticité et de pérennité pour traverser les générations.',
    image: withMediaVersion('/images/signature_gift_box.jpg'),
    placement: 'packaging',
    placementLabel: 'Écrin & Packaging',
    badge: 'PRÊT-À-OFFRIR',
    cta: 'Commander l’écrin signature',
    link: '/boutique',
    tags: ['Écrin', 'Velours', 'Packaging Prestige', 'Certificat d’Authenticité'],
    status: 'active',
    publishedOnHome: true,
    palette: ['#8B0000', '#D4AF37', '#FFFDF9', '#4A0E17'],
    resolution: '1080 × 1080 (1:1)',
    views: 650,
    createdAt: '2026-07-10',
  },
  {
    id: 6,
    title: 'Bijoux & Parures Nuptiales',
    subtitle: 'Colliers impériaux, boucles d’oreilles et bracelets d’or fin pour la mariée',
    storytelling: 'Une composition harmonieuse d’accessoires minutieusement travaillés pour accompagner chaque temps fort du mariage : de la cérémonie du thé respectueuse jusqu’au banquet festif impérial.',
    image: withMediaVersion('/images/hero_phoenix_crown.jpg'),
    placement: 'category',
    placementLabel: 'Bannière Catégorie',
    badge: 'PARURES DE REINE',
    cta: 'Explorer la collection',
    link: '/boutique?category=bijous',
    tags: ['Cérémonie du Thé', 'Parure', 'Héritage', 'Boutique'],
    status: 'active',
    publishedOnHome: true,
    palette: ['#A91D22', '#C69214', '#162032', '#F7F3E9'],
    resolution: '1920 × 800 (Banner)',
    views: 730,
    createdAt: '2026-07-12',
  },
];

export const TABS = [
  { id: 'all', label: 'Tous les visuels', icon: '✦' },
  { id: 'hero', label: 'Bannières Hero', icon: '🖼️', badgeText: '16:9' },
  { id: 'spotlight', label: 'Vitrine Spotlight', icon: '✨', badgeText: '4:3' },
  { id: 'lookbook', label: 'Lookbook & Inspirations', icon: '📖' },
  { id: 'packaging', label: 'Écrins & Packaging', icon: '📦' },
  { id: 'category', label: 'Bannières Catégories', icon: '🏷️' },
];

export const PLACEMENT_OPTIONS = [
  { value: 'hero', label: 'Bannière Hero Accueil (Grand Carrousel 16:9)' },
  { value: 'spotlight', label: 'Vitrine Spotlight (Sélection Prestige 4:3)' },
  { value: 'lookbook', label: 'Lookbook Nuptial (Galerie d’Inspirations)' },
  { value: 'packaging', label: 'Écrin Signature & Packaging' },
  { value: 'category', label: 'Bannière Catégorie & En-tête' },
];

export const PRESET_TAGS = [
  'Haute Coiffure',
  'Soie Impériale',
  'Fils d’or',
  'Jade Blanc',
  'Cinabre Vermillon',
  'Couronne Impériale',
  'Pampilles',
  'Cérémonie du Thé',
  'Velours',
  'Harmonie Céleste',
];

const STORAGE_KEY = 'admin_aesthetic_media';

// Lecture avec valeur de repli propre et assainissement des statuts (plus aucun 'featured')
export const getAestheticMedia = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed.map((item) => ({
          ...item,
          image: withMediaVersion(item.image),
          status: item.status === 'featured' ? 'active' : (item.status || 'active'),
        }));
        if (JSON.stringify(cleaned) !== raw) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
          } catch {}
        }
        return cleaned;
      }
    }
  } catch {}
  return INITIAL_AESTHETIC_MEDIA.map((item) => ({
    ...item,
    image: withMediaVersion(item.image),
    status: item.status === 'featured' ? 'active' : (item.status || 'active'),
  }));
};

// Sauvegarde et notification inter-composants
export const saveAestheticMedia = (list) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('aesthetic_media_updated', { detail: list }));
    window.dispatchEvent(new Event('storage'));
  } catch {}
};

/**
 * Texte d'un visuel dans la langue affichée : la traduction faite à
 * l'enregistrement, sinon celle du visuel d'origine s'il n'a pas été modifié.
 */
export const mediaText = (item, field, t, lang) => {
  const saved = item.translations?.[lang]?.[field];
  if (saved) return saved;
  const original = INITIAL_AESTHETIC_MEDIA.find((media) => media.id === item.id);
  return original?.[field] === item[field] ? t(`media.${item.id}.${field}`, item[field]) : item[field];
};

export const mediaTags = (item, t, lang) => {
  const tags = item.tags || [];
  const saved = item.translations?.[lang];
  if (saved) return tags.map((tag, index) => saved[`tag${index}`] || tag);
  const original = INITIAL_AESTHETIC_MEDIA.find((media) => media.id === item.id);
  return JSON.stringify(original?.tags) === JSON.stringify(tags)
    ? t(`media.${item.id}.tags`, { returnObjects: true, defaultValue: tags })
    : tags;
};

// Réinitialisation vers les données impériales de base
export const resetAestheticMedia = () => {
  saveAestheticMedia(INITIAL_AESTHETIC_MEDIA);
  return INITIAL_AESTHETIC_MEDIA;
};

// Hook React pour synchroniser la page d'accueil et l'administration en temps réel
export const useAestheticMedia = () => {
  const [media, setMedia] = useState(getAestheticMedia);

  useEffect(() => {
    const handleUpdate = () => {
      setMedia(getAestheticMedia());
    };

    window.addEventListener('aesthetic_media_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('aesthetic_media_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return [media, saveAestheticMedia];
};

