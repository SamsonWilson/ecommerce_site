import { useTranslation } from 'react-i18next';
import PageHeader from '../components/PageHeader.jsx';

export default function Shipping() {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader title={t('shipping.title')} subtitle={t('shipping.subtitle')} crumbs={[{ label: t('shipping.title') }]} />
      <div className="info-page">
        <h2>{t('shipping.delaysTitle')}</h2>
        <p>{t('shipping.delaysText')}</p>

        <h2>{t('shipping.zonesTitle')}</h2>
        <table className="info-table">
          <thead><tr><th>{t('shipping.table.zone')}</th><th>{t('shipping.table.estimated')}</th><th>{t('shipping.table.standard')}</th><th>{t('shipping.table.express')}</th></tr></thead>
          <tbody>
            <tr><td>{t('shipping.rows.france')}</td><td>{t('shipping.rows.franceDelay')}</td><td>{t('shipping.rows.franceStandard')}</td><td>{t('shipping.rows.franceExpress')}</td></tr>
            <tr><td>{t('shipping.rows.eu')}</td><td>{t('shipping.rows.euDelay')}</td><td>{t('shipping.rows.euStandard')}</td><td>{t('shipping.rows.euExpress')}</td></tr>
            <tr><td>{t('shipping.rows.swiss')}</td><td>{t('shipping.rows.swissDelay')}</td><td>{t('shipping.rows.swissStandard')}</td><td>{t('shipping.rows.swissExpress')}</td></tr>
            <tr><td>{t('shipping.rows.na')}</td><td>{t('shipping.rows.naDelay')}</td><td>{t('shipping.rows.naStandard')}</td><td>{t('shipping.rows.naExpress')}</td></tr>
            <tr><td>{t('shipping.rows.world')}</td><td>{t('shipping.rows.worldDelay')}</td><td>{t('shipping.rows.worldStandard')}</td><td>{t('shipping.rows.worldExpress')}</td></tr>
          </tbody>
        </table>
        <p>{t('shipping.customs')}</p>

        <h2 id="retours">{t('shipping.returnsTitle')}</h2>
        <p dangerouslySetInnerHTML={{ __html: t('shipping.returnsText') }} />
        <p>{t('shipping.customOrders')}</p>
      </div>
    </>
  );
}
