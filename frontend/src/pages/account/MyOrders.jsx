import { Link } from 'react-router-dom';

export default function MyOrders() {
  return (
    <>
      <div className="acc-head">
        <h1>Mes commandes</h1>
        <p>Historique et suivi de vos commandes.</p>
      </div>

      <div className="card-box">
        <div className="acc-empty">
          Aucune commande pour le moment.<br />
          {/* Honnêteté : le modèle `orders` n'existe pas encore côté serveur. */}
          <span style={{ fontSize: 12.5 }}>
            Le suivi de commande sera disponible dès l'ouverture du paiement en ligne.
          </span><br />
          <Link to="/boutique" className="btn-primary" style={{ display: 'inline-block', marginTop: 16 }}>
            Découvrir la boutique
          </Link>
        </div>
      </div>
    </>
  );
}
