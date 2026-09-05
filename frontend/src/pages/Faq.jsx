import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader.jsx';

export default function Faq() {
  const { t } = useTranslation();

  const faqs = [
    { q: t('faq.items.q1'), a: t('faq.items.a1') },
    { q: t('faq.items.q2'), a: t('faq.items.a2') },
    { q: t('faq.items.q3'), a: t('faq.items.a3') },
    { q: t('faq.items.q4'), a: t('faq.items.a4') },
    { q: t('faq.items.q5'), a: t('faq.items.a5') },
    { q: t('faq.items.q6'), a: t('faq.items.a6') },
    { q: t('faq.items.q7'), a: t('faq.items.a7') },
  ];

  return (
    <>
      <PageHeader title={t('faq.title')} subtitle={t('faq.subtitle')} crumbs={[{ label: 'FAQ' }]} />
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
