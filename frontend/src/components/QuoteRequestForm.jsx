import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, apiErrorMessage } from '../lib/api.js';
import { useAuth } from '../store/auth.js';

const field = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13.5, boxSizing: 'border-box', marginBottom: 10 };

// Demande de devis pour le contenu du panier : l'équipe répond par e-mail
// avec un devis chiffré à accepter en ligne. Le panier n'est pas vidé.
export default function QuoteRequestForm({ items }) {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    contact_email: user?.email || '',
    contact_name: [user?.first_name, user?.last_name].filter(Boolean).join(' '),
    company: user?.profile?.company_name || '',
    message: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null);

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const quote = await api.createQuote({
        ...form,
        items: items.map((it) => ({ slug: it.slug, quantity: it.qty })),
      });
      setSent(quote.reference);
    } catch (err) {
      setError(apiErrorMessage(err, t('quote.requestFailed')));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return <p className="quote-request-sent" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: 12, borderRadius: 8, fontSize: 13 }}>{t('quote.requestSent', { reference: sent })}</p>;
  }
  if (!open) {
    return (
      <button type="button" className="btn-outline" style={{ width: '100%', marginTop: 10 }} onClick={() => setOpen(true)}>
        {t('quote.requestButton')}
      </button>
    );
  }
  return (
    <form onSubmit={submit} style={{ marginTop: 12 }}>
      <p style={{ fontSize: 12.5, color: '#64748B', marginTop: 0 }}>{t('quote.requestIntro')}</p>
      <input name="contact_email" type="email" required placeholder={t('quote.email')} value={form.contact_email} onChange={change} style={field} />
      <input name="contact_name" placeholder={t('quote.fullName')} value={form.contact_name} onChange={change} style={field} />
      <input name="company" placeholder={t('quote.company')} value={form.company} onChange={change} style={field} />
      <textarea name="message" rows={3} placeholder={t('quote.message')} value={form.message} onChange={change} style={field} />
      {error && <p style={{ color: '#991B1B', fontSize: 13 }}>{error}</p>}
      <button type="submit" className="btn-primary" disabled={busy} style={{ width: '100%' }}>
        {busy ? t('checkout.submitting') : t('quote.requestSend')}
      </button>
    </form>
  );
}
