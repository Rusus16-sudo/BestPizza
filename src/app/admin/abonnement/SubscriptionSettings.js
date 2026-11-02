'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getBrowserClient } from '@/utils/supabase/client'
import { getStaffMembership } from '@/lib/staff'
import { formatPrice } from '@/lib/format'
import { PLAN_NAMES, PLAN_ORDER, BUSINESS_INCLUDED_LOCATIONS, EXTRA_LOCATION_PRICE, STARTER_ORDERS_PER_MONTH, subscriptionPrice } from '@/lib/plans'
import { subscriptionState } from '@/lib/subscription'
import AdminPageHeader from '../AdminPageHeader'
import styles from './SubscriptionSettings.module.css'

const FEATURES = {
  starter: ['1 point de vente', '30 plats, 1 livreur', 'Paiement à la livraison', 'Mention « Propulsé par Tchopi »'],
  pro: ['Carte et livreurs illimités', 'Suivi du livreur en direct', 'Codes promo et avis clients', 'Paiement MTN MoMo et Orange Money (bientôt)'],
  business: ['Tout Pro, et :', `${BUSINESS_INCLUDED_LOCATIONS} points de vente inclus`, 'Un responsable par point de vente', 'Carte et prix par point de vente'],
}

const PAYMENT_LABELS = { pending: 'En attente', paid: 'Payé', failed: 'Échoué', cancelled: 'Abandonné' }

const longDate = (date) => new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * L'abonnement du restaurant : où il en est (essai, payé, bientôt fini, en pause),
 * le choix de l'offre, mensuel ou annuel, et le paiement par la page SasPay de Tchopi.
 */
export default function SubscriptionSettings() {
  const [supabase] = useState(() => getBrowserClient())
  const [org, setOrg] = useState(null)
  const [canEdit, setCanEdit] = useState(false)
  const [locationCount, setLocationCount] = useState(1)
  const [payments, setPayments] = useState([])
  const [monthOrders, setMonthOrders] = useState(0)
  const [loading, setLoading] = useState(true)
  const [months, setMonths] = useState(1)
  const [paying, setPaying] = useState(null)
  const [checking, setChecking] = useState(false)

  // Relu au chargement, puis après chaque paiement confirmé
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const membership = await getStaffMembership(supabase, user?.id)
      if (!membership) return setLoading(false)
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const [{ data: organization }, { count }, { data: history }, { count: ordersThisMonth }] = await Promise.all([
        supabase.from('organizations').select('id, name, plan, plan_status, trial_ends_at, paid_until').eq('id', membership.organization_id).maybeSingle(),
        supabase.from('locations').select('*', { count: 'exact', head: true }).eq('organization_id', membership.organization_id),
        supabase.from('subscription_payments').select('id, plan, months, amount, status, created_at, paid_at').eq('organization_id', membership.organization_id).order('created_at', { ascending: false }).limit(10),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('organization_id', membership.organization_id).gte('created_at', monthStart.toISOString()),
      ])
      setMonthOrders(ordersThisMonth || 0)
      setOrg(organization)
      setLocationCount(count || 1)
      setPayments(history || [])
      setCanEdit(membership.role === 'proprietaire' || (membership.role === 'gerant' && !membership.location_id))
      setLoading(false)
    }
    load()
  }, [supabase, version])

  const verify = useCallback(async (paymentId, { quiet = false } = {}) => {
    const res = await fetch('/api/subscription/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId }),
    })
    const data = await res.json().catch(() => ({}))
    if (data.status === 'paid') {
      toast.success('Paiement reçu : votre offre est active. Merci !')
      reload()
    } else if (!quiet) {
      toast(data.error || (data.status === 'pending' ? 'Le paiement n’est pas encore confirmé.' : 'Ce paiement n’a pas abouti.'))
    }
    return data.status
  }, [reload])

  // Retour de la page de paiement : on attend la confirmation de SasPay (jusqu'à 1 min)
  useEffect(() => {
    const paymentId = new URLSearchParams(window.location.search).get('paiement')
    if (!paymentId) return
    window.history.replaceState(null, '', '/admin/abonnement')
    let tries = 0
    let stopped = false
    const poll = async () => {
      if (stopped) return
      setChecking(true)
      const status = await verify(paymentId, { quiet: true })
      tries += 1
      if (status === 'pending' && tries < 12) return setTimeout(poll, 5000)
      setChecking(false)
      if (status === 'pending') toast('Paiement pas encore confirmé. Revenez dans un moment, ou appuyez sur « Vérifier ».')
    }
    poll()
    return () => { stopped = true }
  }, [verify])

  const pay = async (plan) => {
    setPaying(plan)
    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, months }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.checkoutUrl) throw new Error(data.error || "La page de paiement n'a pas pu s'ouvrir.")
      window.location.assign(data.checkoutUrl)
    } catch (err) {
      toast.error(err.message)
      setPaying(null)
    }
  }

  if (loading) return <AdminPageHeader title="Abonnement"><p>Chargement…</p></AdminPageHeader>
  if (!org) return <AdminPageHeader title="Abonnement"><p>Aucun restaurant trouvé pour ce compte.</p></AdminPageHeader>

  const state = subscriptionState(org)
  const planName = PLAN_NAMES[org.plan] || org.plan
  const status = {
    trial: { tone: 'ok', title: `Essai gratuit de l’offre ${planName}`, text: state.endsAt ? `Encore ${state.daysLeft} jour${state.daysLeft > 1 ? 's' : ''}, jusqu’au ${longDate(state.endsAt)}.` : '' },
    active: { tone: 'ok', title: `Offre ${planName} active`, text: state.endsAt ? `Payée jusqu’au ${longDate(state.endsAt)}.` : 'Sans date de fin.' },
    ending: { tone: 'warn', title: state.trial ? 'Votre essai se termine bientôt' : 'Votre abonnement se termine bientôt', text: `Le ${longDate(state.endsAt)}. Choisissez votre offre pour continuer sans interruption.` },
    grace: { tone: 'danger', title: state.trial ? 'Votre essai est terminé' : 'Votre abonnement est terminé', text: `Votre vitrine reste ouverte encore ${state.daysLeft} jour${state.daysLeft > 1 ? 's' : ''}, jusqu’au ${longDate(state.pausesAt)}. Ensuite, elle sera mise en pause.` },
    paused: { tone: 'danger', title: 'Votre vitrine est en pause', text: 'Vos clients ne peuvent plus commander. Rien n’est perdu : elle rouvre dès le paiement.' },
    suspended: { tone: 'danger', title: 'Restaurant suspendu', text: 'Contactez Tchopi.' },
  }[state.phase]
  const pending = payments.filter((p) => p.status === 'pending')

  return (
    <AdminPageHeader title="Abonnement" subtitle="Votre offre Tchopi, et son paiement.">
      <section className={`${styles.status} ${styles[status.tone]}`}>
        <strong>{status.title}</strong>
        <span>{status.text}</span>
        {checking && <span className={styles.checking}>Vérification du paiement en cours…</span>}
      </section>

      {/* Starter : au-delà de 300 commandes par mois, on propose Pro, sans jamais bloquer */}
      {org.plan === 'starter' && (
        <p className={`${styles.usage} ${monthOrders >= STARTER_ORDERS_PER_MONTH ? styles.usageOver : ''}`}>
          Ce mois-ci : <strong>{monthOrders} commande{monthOrders > 1 ? 's' : ''}</strong> sur {STARTER_ORDERS_PER_MONTH} prévues par l’offre Starter.
          {monthOrders >= STARTER_ORDERS_PER_MONTH && ' Bravo ! Vos commandes continuent d’arriver : l’offre Pro est faite pour vous.'}
        </p>
      )}

      {!canEdit && <p className={styles.readOnly}>Seul le gérant de tout le restaurant gère l’abonnement.</p>}

      <div className={styles.cycle} role="radiogroup" aria-label="Durée">
        {[{ value: 1, label: 'Mensuel' }, { value: 12, label: 'Annuel', hint: '2 mois offerts' }].map((c) => (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={months === c.value}
            className={`${styles.cycleBtn} ${months === c.value ? styles.cycleOn : ''}`}
            onClick={() => setMonths(c.value)}
          >
            {c.label}{c.hint && <em>{c.hint}</em>}
          </button>
        ))}
      </div>

      <div className={styles.plans}>
        {PLAN_ORDER.map((plan) => {
          const price = subscriptionPrice(plan, months, locationCount)
          const current = org.plan === plan
          const tooSmall = plan !== 'business' && locationCount > 1
          return (
            <article key={plan} className={`${styles.plan} ${plan === 'pro' ? styles.recommended : ''} ${current ? styles.current : ''}`}>
              {plan === 'pro' && <span className={styles.badge}>Recommandé</span>}
              <h2>{PLAN_NAMES[plan]}</h2>
              <p className={styles.price}>
                <strong>{formatPrice(price)}</strong>
                <span>{months === 12 ? '/ an' : '/ mois'}</span>
              </p>
              {plan === 'business' && locationCount > BUSINESS_INCLUDED_LOCATIONS && (
                <p className={styles.extra}>Dont {locationCount - BUSINESS_INCLUDED_LOCATIONS} point{locationCount - BUSINESS_INCLUDED_LOCATIONS > 1 ? 's' : ''} de vente en plus à {formatPrice(EXTRA_LOCATION_PRICE)} / mois.</p>
              )}
              <ul>
                {FEATURES[plan].map((f) => <li key={f}>{f}</li>)}
              </ul>
              {canEdit && (
                <button
                  type="button"
                  className={styles.payBtn}
                  onClick={() => pay(plan)}
                  disabled={Boolean(paying) || tooSmall}
                  title={tooSmall ? 'Plusieurs points de vente demandent Business' : undefined}
                >
                  {paying === plan ? 'Ouverture du paiement…' : tooSmall ? 'Plusieurs adresses : Business' : current && state.phase !== 'trial' ? 'Prolonger' : `Choisir ${PLAN_NAMES[plan]}`}
                </button>
              )}
            </article>
          )
        })}
      </div>

      <p className={styles.payNote}>Paiement sécurisé par MTN MoMo ou Orange Money. Votre offre s’active dès que le paiement est confirmé.</p>

      {payments.length > 0 && (
        <section className={styles.history}>
          <h2>Vos paiements</h2>
          <ul>
            {payments.map((p) => (
              <li key={p.id}>
                <span>{PLAN_NAMES[p.plan]} · {p.months === 12 ? '12 mois' : '1 mois'}</span>
                <span>{new Date(p.paid_at || p.created_at).toLocaleDateString('fr-FR')}</span>
                <strong>{formatPrice(p.amount)}</strong>
                <span className={`${styles.payStatus} ${styles[`pay_${p.status}`]}`}>{PAYMENT_LABELS[p.status]}</span>
                {p.status === 'pending' && canEdit && pending.length > 0 && (
                  <button type="button" className={styles.linkBtn} onClick={() => verify(p.id)}>Vérifier</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </AdminPageHeader>
  )
}
