import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, apiErrorMessage } from '../../lib/api.js';
import { eur } from '../../data/cart.jsx';
import { I } from './icons.jsx';
import { PageHead, Panel, Toolbar } from './ui.jsx';

const STATUS_CLASS = { NEW: 'status new', IN_REVIEW: 'status pending', QUOTED: 'status ship', ACCEPTED: 'status paid', DECLINED: 'status new' };
const input = { padding: '6px 8px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 13 };

// Demandes de devis et d'ouverture de compte pro : l'équipe chiffre chaque
// ligne, le serveur calcule le total et envoie au client un lien pour accepter.
export default function Quotes() {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.adminQuotes({ status });
      setRows(res.results || res);
    } catch (e) {
      setError(apiErrorMessage(e, t('admin.quotes.loadError')));
    } finally {
      setLoading(false);
    }
  }, [status, t]);

  useEffect(() => { load(); }, [load]);

  const replace = (updated) => {
    setRows((list) => list.map((r) => (r.id === updated.id ? updated : r)));
    setSelected(updated);
  };

  return (
    <>
      <PageHead title={t('admin.quotes.title')} subtitle={t('admin.quotes.subtitle', { count: rows.length })}>
        <button className="btn-admin ghost" onClick={load}>{I.check}{t('admin.quotes.refresh')}</button>
      </PageHead>

      <Panel>
        <Toolbar>
          <select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('admin.quotes.allStatuses')}</option>
            {Object.keys(STATUS_CLASS).map((s) => <option key={s} value={s}>{t(`admin.quotes.status.${s}`)}</option>)}
          </select>
        </Toolbar>
        {error && <p className="admin-login-error">{error}</p>}
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.quotes.reference')}</th>
                <th>{t('admin.quotes.contact')}</th>
                <th>{t('admin.quotes.items')}</th>
                <th>{t('admin.quotes.total')}</th>
                <th>{t('admin.quotes.statusLabel')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="cell-sub">{t('admin.quotes.empty')}</td></tr>
              )}
              {rows.map((q) => (
                <tr key={q.id}>
                  <td>
                    <div className="cell-main">{q.reference}</div>
                    <div className="cell-sub">{new Date(q.created_at).toLocaleDateString(i18n.resolvedLanguage)}</div>
                  </td>
                  <td>
                    <div className="cell-main">{q.company || q.contact_name || '—'}</div>
                    <div className="cell-sub">{q.contact_email}</div>
                  </td>
                  <td>{q.items_count || t('admin.quotes.noItems')}</td>
                  <td>{q.quoted_total ? eur(Number(q.quoted_total)) : '—'}</td>
                  <td><span className={STATUS_CLASS[q.status]}>{t(`admin.quotes.status.${q.status}`)}</span>{q.expired && q.status === 'QUOTED' && <span className="cell-sub"> · {t('admin.quotes.expired')}</span>}</td>
                  <td><button type="button" className="icon-btn" title={t('admin.quotes.open')} onClick={() => setSelected(q)}>{I.eye}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {selected && <QuoteDetail quote={selected} onClose={() => setSelected(null)} onSaved={replace} />}
    </>
  );
}

function QuoteDetail({ quote, onClose, onSaved }) {
  const { t } = useTranslation();
  const editable = ['NEW', 'IN_REVIEW', 'QUOTED'].includes(quote.status);
  // Prix proposé, sinon le prix de gros comme point de départ.
  const [prices, setPrices] = useState(() => Object.fromEntries(
    quote.items.map((it) => [it.id, String(it.proposed_unit_price ?? it.wholesale_price ?? '')]),
  ));
  const [shipping, setShipping] = useState(String(quote.shipping_cost ?? '0'));
  const [validUntil, setValidUntil] = useState(quote.valid_until || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const num = (v) => Number(String(v).replace(',', '.'));
  const total = quote.items.reduce((sum, it) => sum + (num(prices[it.id]) || 0) * it.quantity, 0) + (num(shipping) || 0);

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      onSaved(await fn());
    } catch (e) {
      setError(apiErrorMessage(e, t('admin.quotes.saveError')));
    } finally {
      setBusy(false);
    }
  };

  const send = () => {
    if (!window.confirm(t('admin.quotes.sendConfirm', { email: quote.contact_email, total: eur(total) }))) return;
    run(() => api.adminSendQuote(quote.id, {
      items: quote.items.map((it) => ({ id: it.id, unit_price: String(prices[it.id]).replace(',', '.') })),
      shipping_cost: String(shipping).replace(',', '.') || '0',
      ...(validUntil ? { valid_until: validUntil } : {}),
    }));
  };

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div className="admin-modal" style={{ maxWidth: 860, width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0 }}>{quote.reference} · <span className={STATUS_CLASS[quote.status]}>{t(`admin.quotes.status.${quote.status}`)}</span></h3>
          <button type="button" className="btn-admin ghost" onClick={onClose}>{t('admin.quotes.close')}</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, margin: '16px 0', fontSize: 13 }}>
          <div><strong>{t('admin.quotes.contact')}</strong><br />{quote.contact_name || '—'}<br />{quote.contact_email}{quote.phone && <><br />{quote.phone}</>}</div>
          <div><strong>{t('admin.quotes.company')}</strong><br />{quote.company || '—'}<br />{quote.country}</div>
          <div><strong>{t('admin.quotes.account')}</strong><br />{quote.customer_email || t('admin.quotes.guest')}</div>
        </div>
        {quote.message && <p style={{ whiteSpace: 'pre-wrap', background: 'var(--bg)', padding: 12, borderRadius: 8, fontSize: 13 }}>{quote.message}</p>}

        {quote.order_reference && (
          <p style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', padding: 12, borderRadius: 8, fontSize: 13 }}>
            ✅ {t('admin.quotes.acceptedAs', { reference: quote.order_reference, status: t(`orders.status.${quote.order_status}`) })}
          </p>
        )}

        {quote.items.length === 0 ? (
          <p className="cell-sub">{t('admin.quotes.noItemsHint')}</p>
        ) : (
          <table className="admin-table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>{t('admin.quotes.product')}</th>
                <th>{t('admin.quotes.qty')}</th>
                <th>{t('admin.quotes.stock')}</th>
                <th>{t('admin.quotes.unitPrice')}</th>
                <th style={{ textAlign: 'right' }}>{t('admin.quotes.lineTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((it) => (
                <tr key={it.id}>
                  <td><div className="cell-main">{it.product_name}</div><div className="cell-sub">{it.sku} · {t('admin.quotes.reference_prices', { retail: eur(Number(it.retail_price)), wholesale: eur(Number(it.wholesale_price)) })}</div></td>
                  <td>{it.quantity}</td>
                  <td style={{ color: it.stock < it.quantity ? 'var(--red)' : undefined }}>{it.stock}</td>
                  <td>
                    <input type="text" inputMode="decimal" aria-label={t('admin.quotes.unitPrice')} disabled={!editable || busy} value={prices[it.id]}
                      onChange={(e) => setPrices((p) => ({ ...p, [it.id]: e.target.value }))} style={{ ...input, width: 90 }} />
                  </td>
                  <td style={{ textAlign: 'right' }}>{eur((num(prices[it.id]) || 0) * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {quote.items.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 16 }}>
            <label style={{ fontSize: 13 }}>{t('admin.quotes.shipping')}<br />
              <input type="text" inputMode="decimal" disabled={!editable || busy} value={shipping} onChange={(e) => setShipping(e.target.value)} style={{ ...input, width: 100 }} />
            </label>
            <label style={{ fontSize: 13 }}>{t('admin.quotes.validUntil')}<br />
              <input type="date" disabled={!editable || busy} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} style={input} />
            </label>
            <strong style={{ fontSize: 18 }}>{t('admin.quotes.total')} : {eur(total)}</strong>
          </div>
        )}

        {error && <p className="admin-login-error" style={{ marginTop: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
          {editable && quote.items.length > 0 && (
            <button type="button" className="btn-admin" disabled={busy} onClick={send}>
              ✉️ {quote.status === 'QUOTED' ? t('admin.quotes.resend') : t('admin.quotes.send')}
            </button>
          )}
          {quote.status === 'NEW' && (
            <button type="button" className="btn-admin ghost" disabled={busy} onClick={() => run(() => api.adminUpdateQuote(quote.id, { status: 'IN_REVIEW' }))}>
              {t('admin.quotes.markInReview')}
            </button>
          )}
          {editable && (
            <button type="button" className="btn-admin ghost" disabled={busy} onClick={() => run(() => api.adminUpdateQuote(quote.id, { status: 'DECLINED' }))}>
              {t('admin.quotes.decline')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
