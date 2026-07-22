import { Link } from 'react-router-dom';
import { useAuth } from '../../store/auth.js';

export default function ProAccess() {
  const profile = useAuth((s) => s.user?.profile);
  const isPro = profile?.account_type === 'WHOLESALE';
  const approved = profile?.status === 'APPROVED';

  return (
    <>
      <div className="acc-head">
        <h1>Accès grossiste</h1>
        <p>Tarifs professionnels, quantités minimales et devis groupés.</p>
      </div>

      <div className="card-box">
        {isPro && approved ? (
          <>
            <div className="card-title">Votre compte est professionnel</div>
            <table className="simple-table">
              <tbody>
                <tr><td style={{ color: 'var(--muted)' }}>Statut</td>
                  <td><span className="pill paid">{profile.status_display}</span></td></tr>
                <tr><td style={{ color: 'var(--muted)' }}>Société</td><td>{profile.company_name || '—'}</td></tr>
                <tr><td style={{ color: 'var(--muted)' }}>N° de TVA</td><td>{profile.vat_number || '—'}</td></tr>
              </tbody>
            </table>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 16, lineHeight: 1.7 }}>
              Les <strong>tarifs de gros s'appliquent automatiquement</strong> sur toute la boutique,
              sans code à saisir. Les quantités minimales (MOQ) figurent sur chaque fiche produit.
            </p>
          </>
        ) : isPro && !approved ? (
          <div className="acc-empty">
            <span className="pill prep">{profile.status_display}</span>
            <p style={{ marginTop: 14 }}>
              Votre demande d'accès professionnel est en cours d'étude.<br />
              Nos équipes reviennent vers vous sous 24 h ouvrées.
            </p>
          </div>
        ) : (
          <>
            <div className="card-title">Vous êtes revendeur ou wedding planner ?</div>
            <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.7 }}>
              Votre compte est actuellement un <strong>compte particulier</strong> : vous commandez au détail.
              Demandez l'accès grossiste pour bénéficier des tarifs professionnels — nos équipes
              étudient votre dossier, puis activent les tarifs de gros sur votre compte.
            </p>
            <Link to="/pro" className="btn-primary" style={{ display: 'inline-block', marginTop: 18 }}>
              Demander l'accès grossiste
            </Link>
          </>
        )}
      </div>
    </>
  );
}
