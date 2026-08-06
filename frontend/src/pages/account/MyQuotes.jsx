import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';

const PILL = {
  NEW: ['pill prep', 'Nouveau'],
  IN_REVIEW: ['pill prep', 'En étude'],
  QUOTED: ['pill ship', 'Chiffré'],
  ACCEPTED: ['pill paid', 'Accepté'],
  DECLINED: ['pill prep', 'Refusé'],
};

export default function MyQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.myQuotes()
      .then((d) => setQuotes(d.results || d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="acc-head">
        <h1>Mes devis</h1>
        <p>Suivi de vos demandes de tarifs professionnels.</p>
      </div>

      <div className="card-box">
        {loading ? (
          <p className="acc-empty">Chargement…</p>
        ) : quotes.length === 0 ? (
          <div className="acc-empty">
            Vous n'avez pas encore de demande de devis.
          </div>
        ) : (
          <table className="simple-table">
            <thead>
              <tr><th>Référence</th><th>Date</th><th>Articles</th><th>Montant</th><th>Validité</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id}>
                  <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{q.reference}</td>
                  <td>{new Date(q.created_at).toLocaleDateString('fr-FR')}</td>
                  <td>{q.items?.length || 0}</td>
                  <td>{q.quoted_total ? `${parseFloat(q.quoted_total)} €` : '—'}</td>
                  <td>{q.valid_until ? new Date(q.valid_until).toLocaleDateString('fr-FR') : '—'}</td>
                  <td><span className={PILL[q.status][0]}>{PILL[q.status][1]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
