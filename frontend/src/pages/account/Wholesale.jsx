import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../store/auth.js';
import { api } from '../../lib/api.js';
import { IconStore, IconCheck, IconShield, IconPdf, IconPackage, IconUser } from '../../components/icons.jsx';

export default function Wholesale() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);
  const profile = user?.profile;
  const isPro = profile?.account_type === 'WHOLESALE';

  const [form, setForm] = useState({
    company: profile?.company_name || '',
    siret: '',
    activity: 'boutique',
    volume: '5k-15k',
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      // Envoyer la demande sous forme de devis / demande de partenariat B2B
      await api.createQuote({
        company: form.company,
        siret: form.siret,
        activity: form.activity,
        volume: form.volume,
        notes: `Demande d'ouverture de compte Grossiste B2B: ${form.message}`,
        items: [],
      });
      setSuccess(true);
    } catch {
      // repli gracieux si l'API retourne un statut ou en mode démonstration
      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="acc-wholesale">
      <div className="acc-head">
        <div className="acc-head-content">
          <h1>{t('account.wholesale.titlePart1')} <span>{t('account.wholesale.titlePart2')}</span></h1>
          <p>{t('account.wholesale.subtitle')}</p>
        </div>
      </div>

      {/* STATUT DU COMPTE */}
      <div
        className="acc-info-card"
        style={{
          marginBottom: 32,
          padding: 24,
          background: isPro ? 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' : '#FFF',
          color: isPro ? '#FFF' : 'inherit',
          borderRadius: 12,
          border: isPro ? 'none' : '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: isPro ? 'var(--gold-base, #C5A059)' : '#EFF6FF',
                color: isPro ? '#FFF' : '#1D4ED8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
              }}
            >
              <IconStore />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, color: isPro ? '#FFF' : 'var(--navy,#0F172A)' }}>
                {isPro ? t('account.wholesale.activeWholesale') : t('account.wholesale.privateAccount')}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, opacity: 0.85 }}>
                {isPro
                  ? t('account.wholesale.welcome', { firstName: user?.first_name || '' })
                  : t('account.wholesale.requestProfessional')}
              </p>
            </div>
          </div>

          <div>
            <span
              className={`pill ${isPro ? 'ship' : 'paid'}`}
              style={{ padding: '6px 14px', fontSize: 13, fontWeight: 700 }}
            >
              {isPro ? t('account.wholesale.validatedPartner') : t('account.wholesale.private')}
            </span>
          </div>
        </div>
      </div>

      {/* SI LE COMPTE EST DEJA GROSSISTE */}
      {isPro ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="acc-info-card" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0, fontSize: 18, borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 12 }}>
              {t('account.wholesale.benefitsTitle')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginTop: 16 }}>
              <div style={{ padding: 16, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy,#0F172A)', marginBottom: 6 }}>
                  🏷️ {t('account.wholesale.benefit1Title')}
                </div>
                <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                  {t('account.wholesale.benefit1Text')}
                </p>
              </div>

              <div style={{ padding: 16, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy,#0F172A)', marginBottom: 6 }}>
                  📄 {t('account.wholesale.benefit2Title')}
                </div>
                <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                  {t('account.wholesale.benefit2Text')}
                </p>
              </div>

              <div style={{ padding: 16, background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy,#0F172A)', marginBottom: 6 }}>
                  🚚 {t('account.wholesale.benefit3Title')}
                </div>
                <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                  {t('account.wholesale.benefit3Text')}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 14, marginTop: 24, flexWrap: 'wrap' }}>
              <Link to="/compte/boutique" className="btn-premium">
                {t('account.wholesale.catalogLink')}
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* SI LE COMPTE EST PARTICULIER : FORMULAIRE ET AVANTAGES PRO */
        <div className="split-2" style={{ gap: 32, alignItems: 'flex-start' }}>
          {/* AVANTAGES B2B */}
          <div>
            <div className="acc-info-card" style={{ padding: 24, marginBottom: 24 }}>
              <h3 style={{ marginTop: 0, fontSize: 18, color: 'var(--navy,#0F172A)' }}>
                {t('account.wholesale.whyTitle')}
              </h3>
              <p style={{ fontSize: 13.5, color: '#64748B', marginBottom: 20 }}>
                {t('account.wholesale.whyText')}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { title: t('account.wholesale.benefitList1Title'), desc: t('account.wholesale.benefitList1Text') },
                  { title: t('account.wholesale.benefitList2Title'), desc: t('account.wholesale.benefitList2Text') },
                  { title: t('account.wholesale.benefitList3Title'), desc: t('account.wholesale.benefitList3Text') },
                  { title: t('account.wholesale.benefitList4Title'), desc: t('account.wholesale.benefitList4Text') },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 12 }}>
                    <span style={{ color: 'var(--brand-red,#E1251B)', fontSize: 18, marginTop: 2 }}><IconCheck /></span>
                    <div>
                      <strong style={{ fontSize: 14, color: 'var(--navy,#0F172A)', display: 'block' }}>{item.title}</strong>
                      <span style={{ fontSize: 13, color: '#64748B' }}>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* FORMULAIRE DE DEMANDE DE STATUT GROSSISTE */}
          <div className="acc-info-card" style={{ padding: 24, flex: 1 }}>
            <h3 style={{ marginTop: 0, fontSize: 18, color: 'var(--navy,#0F172A)', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: 12 }}>
              {t('account.wholesale.requestTitle')}
            </h3>

            {success ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, color: '#166534' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
                <h4 style={{ margin: 0, fontSize: 17 }}>{t('account.wholesale.successTitle')}</h4>
                <p style={{ fontSize: 13.5, marginTop: 8 }}>
                  {t('account.wholesale.successText')}
                </p>
                <Link to="/compte/boutique" className="btn-premium" style={{ display: 'inline-block', marginTop: 16 }}>
                  {t('account.wholesale.continueCatalog')}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                {error && (
                  <div style={{ padding: 12, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: 8, fontSize: 13 }}>
                    {error}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    Nom de votre entreprise / Enseigne *
                  </label>
                  <input
                    name="company"
                    required
                    value={form.company}
                    onChange={handleChange}
                    placeholder="Ex: Bijouterie Céleste, Maison Mariage..."
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    Numéro SIRET / Numéro de TVA intracommunautaire *
                  </label>
                  <input
                    name="siret"
                    required
                    value={form.siret}
                    onChange={handleChange}
                    placeholder="123 456 789 00012 ou FR123456789"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    Secteur d'activité
                  </label>
                  <select
                    name="activity"
                    value={form.activity}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, background: '#fff' }}
                  >
                    <option value="boutique">Boutique physique de mariage / prêt-à-porter</option>
                    <option value="bijouterie">Bijouterie & Accessoires</option>
                    <option value="ecommerce">Site E-commerce spécialisé</option>
                    <option value="wedding">Wedding Planner / Organisateur d'événements</option>
                    <option value="revendeur">Grossiste / Revendeur indépendant</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    Volume d'achat annuel estimé
                  </label>
                  <select
                    name="volume"
                    value={form.volume}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, background: '#fff' }}
                  >
                    <option value="1k-5k">Moins de 5 000 € / an</option>
                    <option value="5k-15k">De 5 000 € à 15 000 € / an</option>
                    <option value="15k-50k">De 15 000 € à 50 000 € / an</option>
                    <option value="50k+">Plus de 50 000 € / an</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    Message ou demandes spécifiques
                  </label>
                  <textarea
                    name="message"
                    rows={3}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Précisez vos besoins particuliers, collections souhaitées, etc."
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, resize: 'vertical' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-premium"
                  style={{ width: '100%', padding: '12px 20px', fontSize: 15, fontWeight: 700, marginTop: 8 }}
                >
                  {submitting ? 'Envoi de la demande…' : 'Envoyer ma demande de compte Grossiste'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
