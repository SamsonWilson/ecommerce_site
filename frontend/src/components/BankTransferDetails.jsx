import { useTranslation } from 'react-i18next';
import { eur } from '../data/cart.jsx';

// Coordonnées et référence à indiquer pour régler une commande par virement.
export default function BankTransferDetails({ transfer }) {
  const { t, i18n } = useTranslation();
  const rows = [
    [t('transfer.holder'), transfer.holder],
    [t('transfer.bank'), transfer.bank],
    [t('transfer.account'), transfer.account],
    [t('transfer.bic'), transfer.bic],
    [t('transfer.bankAddress'), transfer.bank_address],
    [t('transfer.reference'), transfer.reference],
  ].filter(([, value]) => value);
  const deadline = transfer.deadline
    ? new Date(transfer.deadline).toLocaleDateString(i18n.resolvedLanguage, { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="bank-transfer" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E3A8A', borderRadius: 10, padding: 16, fontSize: 13, textAlign: 'left' }}>
      <strong style={{ display: 'block', fontSize: 14, marginBottom: 8 }}>
        🏦 {t('transfer.title', { amount: eur(Number(transfer.amount_due)) })}
      </strong>
      {deadline && <p style={{ margin: '0 0 10px' }}>{t('transfer.deadline', { date: deadline })}</p>}
      <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 12px', margin: 0 }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'contents' }}>
            <dt style={{ fontWeight: 600 }}>{label}</dt>
            <dd style={{ margin: 0, fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>{value}</dd>
          </div>
        ))}
      </dl>
      <p style={{ margin: '10px 0 0', fontSize: 12 }}>{t('transfer.hint')}</p>
    </div>
  );
}
