import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, apiErrorMessage } from '../lib/api.js';
import { paymentReturnPath, startOnlinePayment } from '../lib/payment.js';
import { eur } from '../data/cart.jsx';
import { countryOptions } from '../data/countries.js';

const field = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, boxSizing: 'border-box' };
const label = { display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 };

// Devis chiffré, ouvert par le lien secret envoyé par e-mail : le client
// l'accepte en donnant son adresse, puis le règle par virement ou en ligne.
export default function QuotePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { reference } = useParams();
  const [params] = useSearchParams();
  const token = params.get('token');

  const [quote, setQuote] = useState(null);
  const [notFound, setNotFound] = useState(!token);
  const [payMethod, setPayMethod] = useState('');
  const [address, setAddress] = useState({ full_name: '', company: '', address: '', postal_code: '', city: '', country: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const countries = useMemo(() => countryOptions(i18n.resolvedLanguage), [i18n.resolvedLanguage]);

  useEffect(() => {
    if (!token) return;
    api.quoteView(reference, token)
      .then((data) => {
        setQuote(data);
        setPayMethod(data.payment_methods[0] || '');
        const code = /^[A-Za-z]{2}$/.test(data.country || '') ? data.country.toUpperCase() : '';
        setAddress((a) => ({ ...a, full_name: data.contact_name || '', company: data.company || '', country: code }));
      })
      .catch(() => setNotFound(true));
  }, [reference, token, i18n.resolvedLanguage]);

  const change = (e) => setAddress((a) => ({ ...a, [e.target.name]: e.target.value }));

  const accept = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    let res;
    try {
      res = await api.acceptQuote({ reference, token, payment_method: payMethod, shipping_address: address });
    } catch (err) {
      setError(apiErrorMessage(err, t('quote.acceptFailed')));
      setBusy(false);
      return;
    }
    const order = res.order;
    if (payMethod === 'transfer') {
      navigate('/commande/confirmee', { state: { order } });
      return;
    }
    try {
      await startOnlinePayment(order.reference, res.payment_token);
    } catch {
      navigate(paymentReturnPath(order.reference, res.payment_token, { cancelled: '1' }));
    }
  };

  if (notFound) {
    return (
      <div className="confirm-wrap">
        <h1>{t('quote.notFoundTitle')}</h1>
        <p>{t('quote.notFoundText')}</p>
        <Link to="/contact" className="btn-primary">{t('quote.contactUs')}</Link>
      </div>
    );
  }
  if (!quote) return <div className="confirm-wrap"><p>{t('quote.loading')}</p></div>;

  const validUntil = quote.valid_until
    ? new Date(`${quote.valid_until}T00:00:00`).toLocaleDateString(i18n.resolvedLanguage, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const open = quote.status === 'QUOTED' && !quote.expired && !quote.order;

  return (
    <div className="container quote-page" style={{ maxWidth: 900, margin: '32px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>{t('quote.title', { reference: quote.reference })}</h1>
      {quote.company && <p style={{ color: '#64748B', marginTop: 0 }}>{quote.company}</p>}

      <div className="acc-info-card" style={{ padding: 20, marginBottom: 24, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>
              <th style={{ padding: '8px 4px' }}>{t('quote.item')}</th>
              <th style={{ padding: '8px 4px', textAlign: 'right' }}>{t('quote.qty')}</th>
              <th style={{ padding: '8px 4px', textAlign: 'right' }}>{t('quote.unitPrice')}</th>
              <th style={{ padding: '8px 4px', textAlign: 'right' }}>{t('quote.lineTotal')}</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it) => (
              <tr key={it.id} style={{ borderBottom: '1px dashed #E2E8F0' }}>
                <td style={{ padding: '8px 4px' }}>{it.product_name} <span style={{ color: '#94A3B8', fontSize: 12 }}>{it.sku}</span></td>
                <td style={{ padding: '8px 4px', textAlign: 'right' }}>{it.quantity}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right' }}>{it.proposed_unit_price != null ? eur(Number(it.proposed_unit_price)) : '—'}</td>
                <td style={{ padding: '8px 4px', textAlign: 'right' }}>{it.line_total != null ? eur(Number(it.line_total)) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginTop: 14, fontSize: 14 }}>
          <span>{t('common.shipping')} : {eur(Number(quote.shipping_cost || 0))}</span>
          <strong style={{ fontSize: 18 }}>{t('common.total')} : {eur(Number(quote.quoted_total || 0))}</strong>
          {validUntil && <span style={{ color: quote.expired ? '#B91C1C' : '#64748B', fontSize: 13 }}>
            {quote.expired ? t('quote.expired', { date: validUntil }) : t('quote.validUntil', { date: validUntil })}
          </span>}
        </div>
      </div>

      {quote.order && (
        <div className="acc-info-card" style={{ padding: 20 }}>
          <p style={{ marginTop: 0 }}>{t('quote.accepted', { reference: quote.order.reference })}</p>
          <Link className="btn-primary" to={paymentReturnPath(quote.order.reference, quote.order.token)}>
            {t('quote.seeOrder')}
          </Link>
        </div>
      )}

      {!quote.order && !open && (
        <div className="acc-info-card" style={{ padding: 20 }}>
          <p style={{ margin: 0 }}>{quote.status === 'DECLINED' ? t('quote.declined') : t('quote.unavailable')}</p>
        </div>
      )}

      {open && (
        <form className="acc-info-card" style={{ padding: 20 }} onSubmit={accept}>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>{t('quote.acceptTitle')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {[
              ['full_name', t('quote.fullName'), true],
              ['company', t('quote.company'), false],
              ['address', t('checkout.street'), true],
              ['postal_code', t('checkout.postalCode'), false],
              ['city', t('checkout.city'), true],
              ['phone', t('common.phone'), false],
            ].map(([name, text, required]) => (
              <div key={name}>
                <label style={label} htmlFor={`q-${name}`}>{text}</label>
                <input id={`q-${name}`} name={name} required={required} value={address[name]} onChange={change} style={field} />
              </div>
            ))}
            <div>
              <label style={label} htmlFor="q-country">{t('checkout.country')}</label>
              <select id="q-country" name="country" required value={address.country} onChange={change} style={{ ...field, background: '#fff' }}>
                <option value="">—</option>
                {countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </div>
          </div>

          <h3 style={{ fontSize: 15, margin: '20px 0 10px' }}>{t('checkout.paymentMode')}</h3>
          {quote.payment_methods.length === 0 && <p style={{ color: '#991B1B' }}>{t('quote.noPayment')}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {quote.payment_methods.map((m) => (
              <label key={m} data-payment={m} style={{ padding: 14, borderRadius: 10, cursor: 'pointer', border: payMethod === m ? '2px solid var(--brand-red,#E1251B)' : '1px solid #E2E8F0', background: payMethod === m ? '#FFF5F5' : '#FAFAFA' }}>
                <input type="radio" name="pay" value={m} checked={payMethod === m} onChange={() => setPayMethod(m)} style={{ marginRight: 8 }} />
                <strong>{m === 'transfer' ? t('checkout.transfer') : t('checkout.online')}</strong>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{m === 'transfer' ? t('quote.transferHint') : t('checkout.onlineHint')}</div>
              </label>
            ))}
          </div>

          {error && <p style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: 12, borderRadius: 8, fontSize: 13 }}>{error}</p>}
          <button type="submit" className="btn-premium" disabled={busy || !payMethod} style={{ marginTop: 18, width: '100%', padding: '14px 20px', fontSize: 16, fontWeight: 700 }}>
            {busy ? t('checkout.submitting') : t('quote.acceptButton', { amount: eur(Number(quote.quoted_total)) })}
          </button>
        </form>
      )}
    </div>
  );
}
