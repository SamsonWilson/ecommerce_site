import { useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import { IconMapPin, IconPhone, IconMail, IconWhatsApp, IconCheck } from '../components/icons.jsx';

export default function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <PageHeader title="Nous contacter" subtitle="Une question sur une commande, une pièce ou un partenariat ? Écrivez-nous." crumbs={[{ label: 'Contact' }]} />
      <div className="container">
        <div className="split-2" style={{ gridTemplateColumns: '1fr 340px' }}>
          <div className="card-box">
            <div className="card-title">Envoyer un message</div>
            {sent ? (
              <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1FA971', fontWeight: 600 }}>
                <IconCheck />Merci ! Nous vous répondons sous 24h ouvrées.
              </p>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
                <div className="form-grid">
                  <div className="field"><label htmlFor="c-nom">Nom</label><input id="c-nom" required /></div>
                  <div className="field"><label htmlFor="c-mail">E-mail</label><input id="c-mail" type="email" required /></div>
                  <div className="field full"><label htmlFor="c-sujet">Sujet</label><input id="c-sujet" /></div>
                  <div className="field full"><label htmlFor="c-msg">Message</label><textarea id="c-msg" rows="6" required></textarea></div>
                </div>
                <button type="submit" className="btn-primary" style={{ marginTop: 16 }}>Envoyer le message</button>
              </form>
            )}
          </div>

          <div className="card-box">
            <div className="card-title">Nosssssssssssssssss coordonnéessssssssssssss</div>
            <div className="contact-info">
              <div className="ci-row"><span className="ic"><IconMapPin /></span><div><div className="lab">Ateliers</div><div className="val">Paris &amp; Guangzhou</div></div></div>
              <div className="ci-row"><span className="ic"><IconPhone /></span><div><div className="lab">Téléphone</div><div className="val">+33 1 84 25 00 00</div></div></div>
              <div className="ci-row"><span className="ic"><IconMail /></span><div><div className="lab">E-mail</div><div className="val">contact@maisonlian.com</div></div></div>
              <div className="ci-row"><span className="ic"><IconWhatsApp /></span><div><div className="lab">WhatsApp</div><div className="val">Réponse sous 15 min</div></div></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
