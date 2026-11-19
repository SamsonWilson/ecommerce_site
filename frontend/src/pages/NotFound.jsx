import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconSearch } from '../components/icons.jsx';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="empty-state" style={{ padding: '90px 20px' }}>
      <div className="ic"><IconSearch /></div>
      <h2>{t('notFound.title')}</h2>
      <p>{t('notFound.text')}</p>
      <Link to="/" className="btn-primary">{t('notFound.back')}</Link>
    </div>
  );
}
