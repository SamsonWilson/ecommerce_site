import { Link } from 'react-router-dom';
import { I } from './icons.jsx';
import { PageHead, Panel } from './ui.jsx';

const kpis = [
  { icon: I.euro, bg: '#FDE9E8', label: "Chiffre d'affaires (20j)", value: '48 260 €', trend: '+12,4%', period: 'vs mois dernier', dir: 'up' },
  { icon: I.bag2, bg: '#E9F0FE', label: 'Commandes', value: '386', trend: '+6,1%', period: 'vs mois dernier', dir: 'up' },
  { icon: I.store2, bg: '#F1E9FE', label: 'Nouveaux comptes pro', value: '7', trend: '+2', period: 'cette semaine', dir: 'up' },
  { icon: I.quote2, bg: '#FFF6E3', label: 'Devis en attente', value: '5', trend: 'Réponse moy. 18h', period: 'objectif 24h', dir: 'down' },
];

const bars = [['Lun', 52], ['Mar', 68], ['Mer', 45], ['Jeu', 80], ['Ven', 100, true], ['Sam', 74], ['Dim', 38]];

const orders = [
  { id: '#ML-10482', who: 'Camille R.', sub: '— Lyon, FR', amount: '128 €', status: ['paid', 'Payée'] },
  { id: '#ML-10481', who: 'Sophie M. — Pro', sub: 'Boutique Ivoire', amount: '1 536 €', status: ['pending', 'En préparation'] },
  { id: '#ML-10480', who: 'Mei L.', sub: '— Vancouver, CA', amount: '96 €', status: ['shipped', 'Expédiée'] },
  { id: '#ML-10479', who: 'Anaïs D.', sub: '— Bordeaux, FR', amount: '212 €', status: ['new', 'Nouvelle'] },
];

const topProducts = [
  { thumb: <path d="M12 3c-3 4-4 8-2 11 2 3 6 3 8 0 2-3 1-7-2-11Z"/>, name: 'Épingle Phénix Cinabre', cat: 'Style chinois', sales: '86 ventes' },
  { thumb: <path d="M6 8a6 6 0 0 1 12 0"/>, name: 'Diadème Perles Douces', cat: 'Romance occidentale', sales: '64 ventes' },
  { thumb: <path d="M5 12q7-8 14 0"/>, name: 'Éventail Brodé Pivoine', cat: 'Style chinois', sales: '51 ventes' },
  { thumb: <rect x="6" y="6" width="12" height="12" rx="2"/>, name: 'Bracelet Jade & Or', cat: 'Style chinois', sales: '39 ventes' },
];

export default function Dashboard() {
  return (
    <>
      <PageHead title="Tableau de bord" subtitle="Aperçu de l'activité — 1 au 20 juillet 2026">
        <button className="btn-admin ghost">{I.pdf}Exporter</button>
        <Link className="btn-admin primary" to="/gestion/produits">{I.plus}Ajouter un produit</Link>
      </PageHead>

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div className="kpi-card" key={k.label}>
            <div className="kpi-top"><span className="kpi-icon" style={{ background: k.bg }}>{k.icon}</span></div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className={`kpi-trend ${k.dir}`}>
              {k.dir === 'up' ? I.up : I.down}{k.trend} <span className="period">{k.period}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-row cols-2-1">
        <Panel
          title="Ventes des 7 derniers jours"
          action={<div className="panel-tabs"><button className="active">Semaine</button><button>Mois</button><button>Année</button></div>}
        >
          <div className="bar-chart">
            {bars.map(([day, h, hi]) => (
              <div className="bar-col" key={day}>
                <div className={hi ? 'bar hi' : 'bar'} style={{ height: `${h}%` }}></div>
                <span className="bar-label">{day}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Répartition B2C / B2B">
          <div className="donut-wrap">
            <div className="donut">
              <div className="donut-center"><span className="n">62%</span><span className="l">B2C</span></div>
            </div>
            <div className="donut-legend">
              <div><span className="dot" style={{ background: 'var(--red)' }}></span> Détail (B2C) — 62%</div>
              <div><span className="dot" style={{ background: 'var(--navy)' }}></span> Gros (B2B) — 38%</div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="admin-row cols-2-1">
        <Panel title="Dernières commandes" action={<Link className="see-all" to="/gestion/commandes">Voir tout →</Link>}>
          <table className="admin-table">
            <thead><tr><th>Commande</th><th>Client</th><th>Montant</th><th>Statut</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="cell-main">{o.id}</td>
                  <td>{o.who} <span className="cell-sub">{o.sub}</span></td>
                  <td>{o.amount}</td>
                  <td><span className={`status ${o.status[0]}`}>{o.status[1]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Produits les plus vendus" action={<Link className="see-all" to="/gestion/produits">Voir tout →</Link>}>
          <table className="admin-table">
            <tbody>
              {topProducts.map((p) => (
                <tr key={p.name}>
                  <td>
                    <div className="cell-flex">
                      <span className="cell-thumb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">{p.thumb}</svg></span>
                      <div><div className="cell-main">{p.name}</div><div className="cell-sub">{p.cat}</div></div>
                    </div>
                  </td>
                  <td className="cell-sub" style={{ textAlign: 'right' }}>{p.sales}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  );
}
