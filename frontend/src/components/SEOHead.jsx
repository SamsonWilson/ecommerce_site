import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

export default function SEOHead({ title, description, image, url, schema }) {
  useEffect(() => {
    // Title
    const fullTitle = title ? `${title} | Maison Lian` : 'Maison Lian — Accessoires de Mariage & Élégance Chinoise';
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

    // Standard Meta
    setMeta('name', 'description', description || 'Maison Lian - Accessoires de mariage d’inspiration traditionnelle chinoise.');

    // OpenGraph Meta (Pinterest / Facebook)
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description || 'Accessoires de mariage & haute coiffure.');
    setMeta('property', 'og:type', 'website');
    if (url) setMeta('property', 'og:url', url);
    if (image) setMeta('property', 'og:image', image);

    // Twitter Meta
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description || 'Accessoires de mariage & haute coiffure.');
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
  }, [title, description, image, url, schema]);

  return null;
}

SEOHead.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  image: PropTypes.string,
  url: PropTypes.string,
  schema: PropTypes.object,
};
