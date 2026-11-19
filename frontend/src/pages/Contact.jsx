import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader.jsx';
import { IconMapPin, IconPhone, IconMail, IconWhatsApp, IconCheck } from '../components/icons.jsx';

export default function Contact() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);

  return (
    <>
      <PageHeader title={t('contact.title')} subtitle={t('contact.subtitle')} crumbs={[{ label: t('nav.contact') }]} />
      <div className="container">
        <div className="split-2" style={{ gridTemplateColumns: '1fr 340px' }}>
          <div className="card-box">
            <div className="card-title">{t('contact.send')}</div>
            {sent ? (
              <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1FA971', fontWeight: 600 }}>
                <IconCheck />Merci ! Nous vous répondons sous 24h ouvrées.
              </p>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
                <div className="form-grid">
                  <div className="field"><label htmlFor="c-nom">{t('common.lastName')}</label><input id="c-nom" required /></div>
                  <div className="field"><label htmlFor="c-mail">{t('common.email')}</label><input id="c-mail" type="email" required /></div>
                  <div className="field full"><label htmlFor="c-sujet">{t('contact.subject')}</label><input id="c-sujet" /></div>
                  <div className="field full"><label htmlFor="c-msg">{t('contact.message')}</label><textarea id="c-msg" rows="6" required></textarea></div>
                </div>
                <button type="submit" className="btn-primary" style={{ marginTop: 16 }}>{t('contact.submit')}</button>
              </form>
            )}
          </div>

          <div className="card-box">
            <div className="card-title">{t('contact.details')}</div>
            <div className="contact-info">
              <div className="ci-row"><span className="ic"><IconMapPin /></span><div><div className="lab">{t('contact.workshops')}</div><div className="val">{t('contact.locations')}</div></div></div>
              <div className="ci-row"><span className="ic"><IconPhone /></span><div><div className="lab">{t('common.phone')}</div><div className="val">+33 1 84 25 00 00</div></div></div>
              <div className="ci-row"><span className="ic"><IconMail /></span><div><div className="lab">{t('common.email')}</div><div className="val">contact@maisonlian.com</div></div></div>
              <div className="ci-row"><span className="ic"><IconWhatsApp /></span><div><div className="lab">WhatsApp</div><div className="val">{t('contact.whatsappDelay')}</div></div></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
