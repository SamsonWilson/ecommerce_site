import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

// Fil d'ariane + bandeau de titre, communs aux pages de contenu.
export default function PageHeader({ title, subtitle, crumbs = [] }) {
  return (
    <>
      <div className="uee-breadcrumb">
        <div className="container">
          <Link to="/">Accueil</Link>
          {crumbs.map((c) => (
            <span key={c.label}>
              <span className="sep">/</span>
              {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
            </span>
          ))}
        </div>
      </div>
      <div className="page-hero">
        <div className="container">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
    </>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  crumbs: PropTypes.arrayOf(PropTypes.shape({ label: PropTypes.string, to: PropTypes.string })),
};
