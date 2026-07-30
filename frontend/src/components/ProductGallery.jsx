import { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { IconPlay, IconZoom } from './icons.jsx';

// Grossissement du panneau de zoom (2,5x, comme Amazon / Alibaba).
const ZOOM = 2.5;

/**
 * Galerie d'une fiche produit : vignettes, photo principale avec loupe, vidéo.
 *
 * Le zoom suit le principe d'Amazon : la loupe se déplace sur la photo et un
 * panneau agrandi s'ouvre à côté, hors de la colonne — on ne recadre jamais la
 * photo elle-même, l'œil garde le contexte. Sur écran tactile, où il n'y a pas
 * de survol, le panneau ne s'ouvre pas : un appui long ferait un zoom fantôme.
 */
export default function ProductGallery({ items, title, badge, children }) {
  const [index, setIndex] = useState(0);
  const [lens, setLens] = useState(null); // { x, y } en % de la photo
  const frameRef = useRef(null);

  const current = items[Math.min(index, items.length - 1)];
  const isVideo = current?.kind === 'VIDEO';
  const zoomable = Boolean(current?.src) && !isVideo;

  const track = (event) => {
    if (!zoomable) return;
    const box = frameRef.current.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 100;
    const y = ((event.clientY - box.top) / box.height) * 100;
    setLens({ x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) });
  };

  return (
    <div className="pg">
      <div
        ref={frameRef}
        className={`uee-gallery-main${zoomable ? ' zoomable' : ''}`}
        onMouseMove={track}
        onMouseLeave={() => setLens(null)}
      >
        {badge && <span className="uee-badge">{badge}</span>}
        {children}

        {isVideo ? (
          <video
            className="pg-video"
            src={current.src}
            controls
            playsInline
            preload="metadata"
          />
        ) : current?.src ? (
          <>
            {/* `key` sur la source : remonter la photo rejoue le fondu. */}
            <img key={current.src} className="uee-gallery-photo pg-fade" src={current.src} alt={title} />
            {lens && <span className="pg-lens" style={{ left: `${lens.x}%`, top: `${lens.y}%` }} />}
            {!lens && <span className="pg-hint"><IconZoom />Survolez pour agrandir</span>}
          </>
        ) : (
          current?.figure
        )}
      </div>

      {/* Panneau agrandi — hors flux, il déborde volontairement sur la colonne
          de droite comme sur les places de marché. */}
      {lens && zoomable && (
        <div
          className="pg-zoom"
          style={{
            backgroundImage: `url(${current.src})`,
            backgroundSize: `${ZOOM * 100}%`,
            backgroundPosition: `${lens.x}% ${lens.y}%`,
          }}
        />
      )}

      {items.length > 1 && (
        <div className="uee-gallery-thumbs">
          {items.map((item, i) => (
            <div
              key={item.src || i}
              className={i === index ? 'active' : undefined}
              onClick={() => setIndex(i)}
              onMouseEnter={() => setIndex(i)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIndex(i); }}
              aria-label={`${title} — visuel ${i + 1}`}
            >
              {item.kind === 'VIDEO' ? (
                <span className="pg-thumb-video"><IconPlay /></span>
              ) : item.src ? (
                <img src={item.src} alt="" />
              ) : (
                item.figure
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

ProductGallery.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    src: PropTypes.string,
    kind: PropTypes.oneOf(['IMAGE', 'VIDEO']),
    figure: PropTypes.node,
  })).isRequired,
  title: PropTypes.string.isRequired,
  badge: PropTypes.string,
  children: PropTypes.node,
};
