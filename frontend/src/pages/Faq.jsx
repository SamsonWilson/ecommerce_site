import PageHeader from '../components/PageHeader.jsx';

const faqs = [
  { q: 'Quels sont les délais de livraison ?', a: 'Les commandes sont expédiées sous 48 à 72h. Comptez 2 à 4 jours ouvrés en France, 4 à 8 jours à l\'international selon la destination.' },
  { q: 'La livraison est-elle offerte ?', a: 'Oui, dès 150 € d\'achat en France métropolitaine. En dessous, un forfait de 6,90 € s\'applique. Une option express 24h est disponible.' },
  { q: 'Comment fonctionnent les retours ?', a: 'Vous disposez de 30 jours pour retourner un article non porté, dans son emballage d\'origine. Le remboursement est effectué sous 7 jours après réception.' },
  { q: 'Comment devenir revendeur / obtenir les tarifs de gros ?', a: 'Créez un compte professionnel depuis l\'espace grossiste. Après validation de votre dossier (sous 24h ouvrées), les tarifs préférentiels s\'affichent automatiquement à la connexion.' },
  { q: 'Quel est le minimum de commande (MOQ) en gros ?', a: 'Le MOQ dépend de la famille de produit — généralement 12 pièces par référence, 24 pour les boucles d\'oreilles. Le détail figure sur chaque fiche et dans l\'espace pro.' },
  { q: 'Quels moyens de paiement acceptez-vous ?', a: 'Carte bancaire (Visa, Mastercard, AMEX) via Stripe, ainsi que PayPal. Le paiement est 100 % sécurisé ; aucune donnée de carte ne transite par nos serveurs.' },
  { q: 'Livrez-vous à l\'international ?', a: 'Oui, nous expédions dans plus de 27 pays (Europe, Amérique du Nord, Asie). Les taxes et droits de douane éventuels sont à la charge du destinataire hors UE.' },
];

export default function Faq() {
  return (
    <>
      <PageHeader title="Questions fréquentes" subtitle="Tout ce qu'il faut savoir sur les commandes, la livraison et les tarifs pro." crumbs={[{ label: 'FAQ' }]} />
      <div className="faq-list">
        {faqs.map((f) => (
          <details className="faq-item" key={f.q}>
            <summary>{f.q}</summary>
            <div className="faq-a">{f.a}</div>
          </details>
        ))}
      </div>
    </>
  );
}
