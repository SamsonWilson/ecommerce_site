import PropTypes from 'prop-types';

export function PageHead({ title, subtitle, children }) {
  return (
    <div className="admin-page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="sub">{subtitle}</p>}
      </div>
      {children && <div className="admin-page-actions">{children}</div>}
    </div>
  );
}
PageHead.propTypes = { title: PropTypes.string.isRequired, subtitle: PropTypes.string, children: PropTypes.node };

export function Panel({ title, action, children }) {
  return (
    <div className="panel">
      {(title || action) && (
        <div className="panel-head">
          {title && <h3>{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
Panel.propTypes = { title: PropTypes.string, action: PropTypes.node, children: PropTypes.node };

export function Toolbar({ children }) {
  return <div className="admin-toolbar">{children}</div>;
}
Toolbar.propTypes = { children: PropTypes.node };

export function Pagination({ pages = 3, current = 1 }) {
  return (
    <div className="admin-pagination">
      {Array.from({ length: pages }, (_, i) => (
        <a href="#" key={i} className={i + 1 === current ? 'active' : undefined}>{i + 1}</a>
      ))}
    </div>
  );
}
Pagination.propTypes = { pages: PropTypes.number, current: PropTypes.number };
