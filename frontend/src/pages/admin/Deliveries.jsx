import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I } from './icons.jsx';
import { PageHead, Panel, Toolbar } from './ui.jsx';
import { api } from '../../lib/api.js';
import { useAuth } from '../../store/auth.js';

export default function Deliveries() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [filter, setFilter] = useState('Toutes');
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const isDriver = user?.role === 'DELIVERY';

  const FILTERS = [
    { value: 'Toutes', label: t('admin.deliveries.filterAll', 'Toutes') },
    { value: 'PREPARING', label: t('admin.deliveries.filterPreparing', 'À enlever (En préparation)') },
    { value: 'SHIPPED', label: t('admin.deliveries.filterShipped', 'En tournée (Expédiée)') },
  ];

  const loadDeliveries = (silent = false) => {
    if (!silent) setLoading(true);
    // Fetch orders that are PREPARING or SHIPPED
    const params = { q: query };
    if (filter !== 'Toutes') params.status = filter;
    if (isDriver) params.delivery_driver = user.id;

    api.adminOrders(params)
      .then((data) => {
        const list = data.results || data;
        // Filter out pickups and delivered/cancelled manually if not filtered by API
        const deliveryOrders = list.filter(o => o.shipping_address?.method !== 'pickup' && ['PREPARING', 'SHIPPED'].includes(o.status));
        setOrders(deliveryOrders);
      })
      .catch((err) => console.warn('Erreur chargement livraisons:', err))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    loadDeliveries();
    const interval = setInterval(() => loadDeliveries(true), 15000);
    return () => clearInterval(interval);
  }, [filter, isDriver, user]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadDeliveries();
  };

  const handleMarkDelivered = (orderId) => {
    if (!window.confirm('Confirmez-vous que cette commande a bien été remise au client ?')) return;
    setUpdating(true);
    api.adminUpdateOrder(orderId, { status: 'DELIVERED' })
      .then(() => {
        setOrders((prev) => prev.filter(o => o.id !== orderId));
      })
      .catch((err) => console.warn('Erreur validation livraison:', err))
      .finally(() => setUpdating(false));
  };

  return (
    <>
      <PageHead title={t('admin.deliveries.title', 'Livraisons')} subtitle={`${orders.length} ${t('admin.deliveries.subtitle', 'course(s) en attente ou en cours')}`} />

      <Panel>
        <Toolbar>
          <form onSubmit={handleSearchSubmit} className="admin-field">
            {I.search}
            <input placeholder={t('admin.deliveries.searchPlaceholder', 'Commande, client ou adresse…')} value={query}
              onChange={(e) => setQuery(e.target.value)} />
          </form>
          <select className="admin-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <span className="admin-count">{orders.length} {t('admin.deliveries.runsCount', 'course(s)')}</span>
        </Toolbar>

        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('admin.deliveries.tableOrder', 'Commande')}</th>
              <th>{t('admin.deliveries.tableAddress', 'Adresse de livraison')}</th>
              <th>Contact</th>
              <th>{t('admin.deliveries.tableStatus', 'Statut')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <div className="cell-main">{o.reference}</div>
                  <div className="cell-sub">{o.shipping_address?.full_name || o.customer_name}</div>
                  {!isDriver && o.delivery_driver_name && (
                    <div style={{ fontSize: 11, color: '#2563EB', marginTop: 4 }}>Livreur: {o.delivery_driver_name}</div>
                  )}
                </td>
                <td>
                  <div className="cell-main">{o.shipping_address?.address}</div>
                  <div className="cell-sub">{o.shipping_address?.postal_code} {o.shipping_address?.city}</div>
                </td>
                <td className="cell-sub">
                  <div>{o.shipping_address?.phone || '-'}</div>
                </td>
                <td>
                  <span className={`status ${o.status === 'SHIPPED' ? 'shipped' : 'pending'}`}>
                    {o.status === 'SHIPPED' ? 'En tournée' : 'À enlever'}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <button 
                      className="icon-btn approve" 
                      title={t('admin.deliveries.markDelivered', 'Marquer comme livrée')}
                      onClick={() => handleMarkDelivered(o.id)}
                      disabled={updating}
                    >
                      {I.check}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && orders.length === 0 && (
              <tr><td colSpan="5" className="admin-empty">{t('admin.deliveries.empty', 'Aucune course pour ce filtre.')}</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
