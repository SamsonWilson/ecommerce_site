import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader.jsx';
import { IconMapPin, IconPhone, IconMail, IconWhatsApp, IconCheck } from '../components/icons.jsx';

export default function Contact() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);

  return (
    <>
      <PageHeader
        title={t('contact.title', 'Contact Us')}
        subtitle={t('contact.subtitle', 'Have a question about an order, a piece, or a partnership? Write to us.')}
        crumbs={[{ label: t('contact.breadcrumb', 'Contact') }]}
      />
      <div className="container">
        <div className="split-2" style={{ gridTemplateColumns: '1fr 340px' }}>
          <div className="card-box">
            <div className="card-title">{t('contact.sendMessage', 'Send a message')}</div>
            {sent ? (
              <p style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1FA971', fontWeight: 600 }}>
                <IconCheck />{t('contact.messageSent', 'Thank you! We will reply within 24 business hours.')}
              </p>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="c-nom">{t('contact.name', 'Name')}</label>
                    <input id="c-nom" required />
                  </div>
                  <div className="field">
                    <label htmlFor="c-mail">{t('contact.email', 'Email')}</label>
                    <input id="c-mail" type="email" required />
                  </div>
                  <div className="field full">
                    <label htmlFor="c-sujet">{t('contact.subject', 'Subject')}</label>
                    <input id="c-sujet" />
                  </div>
                  <div className="field full">
                    <label htmlFor="c-msg">{t('contact.message', 'Message')}</label>
                    <textarea id="c-msg" rows="6" required></textarea>
                  </div>
                </div>
                <button type="submit" className="btn-primary" style={{ marginTop: 16 }}>
                  {t('contact.send', 'Send message')}
                </button>
              </form>
            )}
          </div>

          <div className="card-box">
            <div className="card-title">{t('contact.ourDetails', 'Our details')}</div>
            <div className="contact-info">
              <div className="ci-row">
                <span className="ic"><IconMapPin /></span>
                <div>
                  <div className="lab">{t('contact.workshops', 'Ateliers')}</div>
                  <div className="val">{t('contact.workshopsLoc', 'Paris & Guangzhou')}</div>
                </div>
              </div>
              <div className="ci-row">
                <span className="ic"><IconPhone /></span>
                <div>
                  <div className="lab">{t('contact.phone', 'Phone')}</div>
                  <div className="val">+33 1 84 25 00 00</div>
                </div>
              </div>
              <div className="ci-row">
                <span className="ic"><IconMail /></span>
                <div>
                  <div className="lab">E-mail</div>
                  <div className="val">contact@maisonlian.com</div>
                </div>
              </div>
              <div className="ci-row">
                <span className="ic"><IconWhatsApp /></span>
                <div>
                  <div className="lab">{t('contact.whatsapp', 'WhatsApp')}</div>
                  <div className="val">{t('contact.whatsappResponse', 'Response within 15 min')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
