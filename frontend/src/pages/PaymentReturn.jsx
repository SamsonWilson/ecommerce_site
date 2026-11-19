import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { PAID_STATUSES, startOnlinePayment } from '../lib/payment.js';
import { useAuth } from '../store/auth.js';
import { IconCheck } from '../components/icons.jsx';
import OrderSummary from '../components/OrderSummary.jsx';
import BankTransferDetails from '../components/BankTransferDetails.jsx';

// Le webhook du prestataire peut arriver quelques secondes après le retour du
// client : on interroge le serveur (qui relit aussi le prestataire) un moment.
const POLL_DELAY = 2500;
const MAX_POLLS = 12;

// Retour depuis la page de paiement. L'adresse de retour ne prouve rien :
// seul le statut renvoyé par le serveur fait foi.
export default function PaymentReturn() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const user = useAuth((s) => s.user);
  const ref = params.get('ref');
  const token = params.get('token');
  const cancelled = params.get('cancelled') === '1';

  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(!ref || !token);
  const [polls, setPolls] = useState(0);
  const [round, setRound] = useState(0);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!ref || !token) return undefined;
    let active = true;
    let timer;
    const poll = (n) => api.paymentStatus(ref, token)
      .then((result) => {
        if (!active) return;
        setData(result);
        setPolls(n);
        const waitsForProvider = result.order.payment_method !== 'transfer';
        if (result.order.status === 'PENDING' && waitsForProvider && !cancelled && n < MAX_POLLS) {
          timer = setTimeout(() => poll(n + 1), POLL_DELAY);
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err.status === 404) setNotFound(true);
        else setError(t('payment.statusFailed'));
      });
    poll(1);
    return () => { active = false; clearTimeout(timer); };
  }, [ref, token, cancelled, round, t]);

  const retry = async () => {
    setRetrying(true);
    setError('');
    try {
      await startOnlinePayment(ref, token);
    } catch (err) {
      setError(err.data?.detail || t('payment.startFailed'));
      setRetrying(false);
    }
  };

  const actions = (
    <div className="confirm-actions">
      {user && <Link to="/compte/commandes" className="btn-outline">{t('confirmation.track')}</Link>}
      <Link to="/boutique" className="btn-primary">{t('confirmation.continue')}</Link>
    </div>
  );
  const errorBox = error && (
    <p style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: 12, borderRadius: 8, fontSize: 13 }}>{error}</p>
  );

  if (notFound) {
    return (
      <div className="confirm-wrap">
        <h1>{t('confirmation.missingTitle')}</h1>
        <p>{t('confirmation.missing')}</p>
        {actions}
      </div>
    );
  }

  if (!data) {
    return <div className="confirm-wrap"><p>{error || t('payment.checking')}</p></div>;
  }

  const { order } = data;
  const reference = <div className="confirm-ref">{t('confirmation.reference')} : {order.reference}</div>;

  if (PAID_STATUSES.includes(order.status)) {
    return (
      <div className="confirm-wrap">
        <div className="confirm-check"><IconCheck /></div>
        <h1>{t('payment.paidTitle')}</h1>
        <p>{t('confirmation.recorded')}</p>
        {reference}
        <OrderSummary order={order} />
        {actions}
      </div>
    );
  }

  if (order.status !== 'PENDING') {
    return (
      <div className="confirm-wrap">
        <h1>{t('payment.closedTitle')}</h1>
        <p>{t('payment.closedText')}</p>
        {reference}
        {actions}
      </div>
    );
  }

  // Virement : rien à vérifier en ligne, le client a besoin des coordonnées.
  if (order.bank_transfer) {
    return (
      <div className="confirm-wrap">
        <h1>{t('transfer.pageTitle')}</h1>
        {reference}
        <OrderSummary order={order} />
        <BankTransferDetails transfer={order.bank_transfer} />
        {actions}
      </div>
    );
  }

  const stillChecking = !cancelled && polls < MAX_POLLS;
  if (stillChecking) {
    return (
      <div className="confirm-wrap">
        <h1>{t('payment.checking')}</h1>
        {reference}
      </div>
    );
  }

  return (
    <div className="confirm-wrap">
      <h1>{data.can_retry ? t('payment.notPaidTitle') : t('payment.processingTitle')}</h1>
      <p>{data.can_retry ? t('payment.notPaidText') : t('payment.processingText')}</p>
      {reference}
      {errorBox}
      <OrderSummary order={order} />
      <div className="confirm-actions">
        {data.can_retry ? (
          <button type="button" className="btn-primary" disabled={retrying} onClick={retry}>
            {retrying ? t('checkout.redirecting') : t('payment.retry')}
          </button>
        ) : (
          <button type="button" className="btn-outline" onClick={() => { setPolls(0); setRound((r) => r + 1); }}>
            {t('payment.checkAgain')}
          </button>
        )}
      </div>
    </div>
  );
}
