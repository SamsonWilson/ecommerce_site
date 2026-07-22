import { useState } from 'react';
import { api } from '../lib/api.js';
import { IconCheck, IconStore, IconSend, IconWhatsApp } from '../components/icons.jsx';

const tiers = [
  { tag: 'Palier 1', name: 'Revendeur', feats: ['MOQ 12 pièces / référence', 'Remise de gros standard', 'Fiches PDF illimitées'] },
  { tag: 'Palier 2 — Populaire', name: 'Distributeur', popular: true, feats: ['MOQ 48 pièces / référence', 'Remise de gros renforcée', 'Devis prioritaire sous 24h'] },
  { tag: 'Palier 3', name: 'Grand compte', feats: ['MOQ négociée sur mesure', 'Tarifs dégressifs par volume', 'Interlocuteur commercial dédié'] },
];

const moqRows = [
  ['Épingles & peignes', '12', '500'],
  ['Diadèmes & tiares', '12', '200'],
  ["Boucles d'oreilles", '24 p.', '800 p.'],
  ['Éventails brodés', '12', '300'],
  ['Bracelets', '24', '600'],
];

export default function Pro() {
  const [sent, setSent] = useState(null);   // référence du devis créé
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submitQuote = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    const f = e.target;
    // Les références souhaitées sont saisies en texte libre : on les consigne
    // dans le message. Le devis chiffré ligne à ligne se fera en back-office.
    const message = [
      f.refs.value && `Références souhaitées : ${f.refs.value}`,
      f.qte.value && `Quantité estimée : ${f.qte.value}`,
      f.details.value,
    ].filter(Boolean).join('\n');

    try {
      const quote = await api.createQuote({
        contact_email: f.mail.value,
        company: f.soc.value,
        country: f.pays.value,
        phone: f.tel.value,
        message,
      });
      setSent(quote.reference);
      f.reset();
    } catch (err) {
      setError(err.data?.contact_email?.[0] || "L'envoi a échoué. Vérifiez vos coordonnées.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="pro-uee-hero">
        <div className="container">
          <span className="eyebrow">Distributeurs &amp; revendeurs</span>
          <h1>Vos tarifs de gros, débloqués automatiquement après validation</h1>
          <p>Créez un compte professionnel : dès sa validation, tous les prix affichés sur le site basculent en tarif préférentiel, sans code promo à saisir.</p>
          <div className="pro-uee-stats">
            <div><span className="n">180+</span><span className="l">Boutiques partenaires</span></div>
            <div><span className="n">27</span><span className="l">Pays livrés</span></div>
            <div><span className="n">24h</span><span className="l">Délai de devis</span></div>
          </div>
        </div>
      </section>

      {/* PALIERS */}
      <section className="uee-section" style={{ background: '#fff' }}>
        <div className="container">
          <div className="uee-section-head"><h2>Trois paliers professionnels</h2></div>
          <div className="cat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            {tiers.map((t) => (
              <div
                className="testi-card"
                key={t.name}
                style={{ textAlign: 'left', ...(t.popular ? { border: '2px solid var(--brand-red)' } : {}) }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-red)', textTransform: 'uppercase' }}>{t.tag}</span>
                <h3 style={{ fontSize: 19, color: 'var(--navy)', marginTop: 6 }}>{t.name}</h3>
                <ul style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '12.5px', color: 'var(--text)' }}>
                  {t.feats.map((f) => (<li key={f}>✓ {f}</li>))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DEVIS + PANNEAU LATÉRAL */}
      <section className="uee-section">
        <div className="container pro-uee-split">
          {/* FORMULAIRE */}
          <div className="uee-quote-card">
            <div className="qc-head">
              <span>Devis express</span>
              <h2>Demander un devis groupé</h2>
              <p>Décrivez votre besoin, notre équipe commerciale vous répond sous 24h ouvrées avec une offre chiffrée.</p>
            </div>
            <div className="qc-body">
              {sent && (
                <p style={{ background: '#E6F7EF', color: '#1FA971', fontWeight: 600, fontSize: 13.5,
                            padding: '12px 14px', borderRadius: 6, marginBottom: 18 }}>
                  ✓ Demande enregistrée sous la référence <strong>{sent}</strong>. Réponse sous 24h ouvrées.
                </p>
              )}
              {error && (
                <p style={{ background: '#FDE9E8', color: 'var(--brand-red)', fontSize: 13.5,
                            padding: '12px 14px', borderRadius: 6, marginBottom: 18 }}>{error}</p>
              )}
              <form onSubmit={submitQuote}>
                <div className="uee-qf-step"><span className="num">1</span><span className="lbl">Vos coordonnées</span></div>
                <div className="uee-qf-grid">
                  <div><label htmlFor="soc">Société</label><input id="soc" name="soc" type="text" placeholder="Nom de votre boutique" /></div>
                  <div><label htmlFor="pays">Pays</label><input id="pays" name="pays" type="text" placeholder="France, Belgique..." /></div>
                  <div><label htmlFor="mail">E-mail professionnel</label><input id="mail" name="mail" type="email" required placeholder="vous@boutique.com" /></div>
                  <div><label htmlFor="tel">Téléphone</label><input id="tel" name="tel" type="tel" placeholder="+33 ..." /></div>
                </div>

                <div className="uee-qf-step"><span className="num">2</span><span className="lbl">Votre besoin</span></div>
                <div className="uee-qf-grid">
                  <div className="full"><label htmlFor="refs">Références souhaitées</label><input id="refs" name="refs" type="text" placeholder="Ex. ML-PH-014, ML-CO-002..." /></div>
                  <div><label htmlFor="qte">Quantité estimée</label><input id="qte" name="qte" type="number" min="12" placeholder="Ex. 60" /></div>
                  <div>
                    <label>Palier professionnel</label>
                    <div className="uee-tier-pick">
                      <input type="radio" name="tier" id="t1" defaultChecked />
                      <label htmlFor="t1"><span className="tn">Revendeur</span><span className="tm">MOQ 12</span></label>
                      <input type="radio" name="tier" id="t2" />
                      <label htmlFor="t2"><span className="tn">Distributeur</span><span className="tm">MOQ 48</span></label>
                    </div>
                  </div>
                  <div className="full"><label htmlFor="details">Détails complémentaires</label><textarea id="details" name="details" rows="4" placeholder="Personnalisation, délai souhaité, marché cible..."></textarea></div>
                </div>

                <div className="uee-qf-foot">
                  <button type="submit" className="btn-primary" disabled={busy}><IconSend />{busy ? "Envoi…" : "Envoyer la demande de devis"}</button>
                  <span className="reassure"><IconCheck />Réponse sous 24h ouvrées</span>
                </div>
              </form>
            </div>
          </div>

          {/* PANNEAU LATÉRAL */}
          <div className="uee-side-panel">
            <div className="uee-tier-card">
              <span className="tc-tag">Quantités minimales</span>
              <h3>MOQ par famille de produit</h3>
              <table className="uee-moq-table" style={{ marginTop: 14 }}>
                <thead><tr><th>Famille</th><th>MOQ</th><th>Max</th></tr></thead>
                <tbody>
                  {moqRows.map((r) => (
                    <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="uee-tier-card">
              <span className="tc-tag">Ressource</span>
              <h3>Catalogue grossiste complet</h3>
              <ul>
                <li><IconCheck />Toutes les références &amp; tarifs</li>
                <li><IconCheck />Photos haute définition</li>
                <li><IconCheck />Conditions de gros détaillées</li>
              </ul>
              <a href="#" className="btn-outline" style={{ display: 'block', textAlign: 'center', marginTop: 16 }}>Télécharger le PDF</a>
            </div>

            <div className="uee-tier-card" style={{ background: '#FBEAEA', boxShadow: 'none' }}>
              <span className="tc-tag">Besoin d'aide ?</span>
              <h3>Parlez à un conseiller</h3>
              <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: 8, lineHeight: 1.6 }}>
                Notre équipe répond sur WhatsApp en moins de 15 minutes en journée.
              </p>
              <a href="#" className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }}>
                <IconWhatsApp />Discuter sur WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="trust-section">
        <div className="container trust-flex">
          <div className="trust-badges">
            <span className="trust-badge"><IconStore />Compte pro validé sous 24h</span>
            <span className="trust-badge"><IconStore />Export dans 27 pays</span>
          </div>
          <div className="pay-icons">
            <span className="pi">VISA</span><span className="pi">MC</span><span className="pi">PayPal</span><span className="pi">Stripe</span>
          </div>
        </div>
      </section>
    </>
  );
}
