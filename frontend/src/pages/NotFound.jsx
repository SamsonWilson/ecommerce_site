import { Link } from 'react-router-dom';
import { IconSearch } from '../components/icons.jsx';

export default function NotFound() {
  return (
    <div className="empty-state" style={{ padding: '90px 20px' }}>
      <div className="ic"><IconSearch /></div>
      <h2>Page introuvable</h2>
      <p>La page que vous cherchez n'existe pas ou a été déplacée.</p>
      <Link to="/" className="btn-primary">Retour à l'accueil</Link>
    </div>
  );
}
