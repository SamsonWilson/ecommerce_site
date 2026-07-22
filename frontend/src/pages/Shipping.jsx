import PageHeader from '../components/PageHeader.jsx';

export default function Shipping() {
  return (
    <>
      <PageHeader title="Livraison & retours" subtitle="Délais, tarifs par zone et conditions de retour." crumbs={[{ label: 'Livraison & retours' }]} />
      <div className="info-page">
        <h2>Délais &amp; expédition</h2>
        <p>
          Toutes les commandes sont préparées dans nos ateliers et expédiées sous 48 à 72h ouvrées.
          Un numéro de suivi vous est envoyé par e-mail dès la prise en charge par le transporteur.
        </p>

        <h2>Tarifs par zone</h2>
        <table className="info-table">
          <thead><tr><th>Zone</th><th>Délai estimé</th><th>Standard</th><th>Express</th></tr></thead>
          <tbody>
            <tr><td>France métropolitaine</td><td>2–4 jours</td><td>6,90 € · offerte dès 150 €</td><td>12,90 €</td></tr>
            <tr><td>Union européenne</td><td>3–6 jours</td><td>9,90 € · offerte dès 200 €</td><td>19,90 €</td></tr>
            <tr><td>Suisse / Royaume-Uni</td><td>4–7 jours</td><td>14,90 €</td><td>24,90 €</td></tr>
            <tr><td>Amérique du Nord</td><td>5–8 jours</td><td>19,90 €</td><td>34,90 €</td></tr>
            <tr><td>Asie / reste du monde</td><td>6–10 jours</td><td>Sur devis</td><td>Sur devis</td></tr>
          </tbody>
        </table>
        <p>Les droits de douane et taxes éventuels hors Union européenne sont à la charge du destinataire.</p>

        <h2 id="retours">Retours &amp; remboursements</h2>
        <p>
          Vous disposez de <strong>30 jours</strong> à compter de la réception pour retourner un article
          non porté, dans son emballage d'origine. Contactez-nous pour obtenir une étiquette de retour ;
          le remboursement est effectué sous 7 jours après réception et contrôle de l'article.
        </p>
        <p>
          Les pièces personnalisées et les commandes de gros (B2B) suivent des conditions spécifiques,
          précisées sur le devis.
        </p>
      </div>
    </>
  );
}
