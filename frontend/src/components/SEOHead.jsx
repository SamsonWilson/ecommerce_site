import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

export default function SEOHead({ title, description, image, url, schema }) {
  const { t } = useTranslation();

  useEffect(() => {
    // Title
    const defaultTitle = t('common.defaultSiteTitle', 'Maison Lian — Chinese Wedding Accessories & Elegance');
    const fullTitle = title ? `${title} | Maison Lian` : defaultTitle;
    document.title = fullTitle;

    // Helper function to update or create meta tags
    const setMeta = (attrName, attrValue, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const siteDesc = description || t('common.defaultSiteDescription', 'Maison Lian — Traditional Chinese bridal accessories and fine bridal jewelry.');
    const ogDesc = description || t('common.defaultOgDescription', 'Bridal accessories & haute bridal hair.');

    // Standard Meta
    setMeta('name', 'description', siteDesc);

    // OpenGraph Meta (Pinterest / Facebook)
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', ogDesc);
    setMeta('property', 'og:type', 'website');
    if (url) setMeta('property', 'og:url', url);
    if (image) setMeta('property', 'og:image', image);

    // Twitter Meta
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', ogDesc);
    if (image) setMeta('name', 'twitter:image', image);

    // JSON-LD Schema
    let scriptEl = document.getElementById('json-ld-schema');
    if (schema) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = 'json-ld-schema';
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(schema);
    } else if (scriptEl) {
      scriptEl.remove();
    }
  }, [title, description, image, url, schema, t]);

  return null;
}

SEOHead.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  image: PropTypes.string,
  url: PropTypes.string,
  schema: PropTypes.object,
};
