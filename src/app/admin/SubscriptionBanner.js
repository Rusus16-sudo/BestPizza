import Link from 'next/link'
import { subscriptionState } from '@/lib/subscription'
import styles from './SubscriptionBanner.module.css'

const longDate = (date) => new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })

/** En haut de l'espace gérant : l'essai ou l'abonnement se termine, est fini, ou la vitrine est en pause. */
export default function SubscriptionBanner({ org }) {
  const state = subscriptionState(org)
  if (!state || !['ending', 'grace', 'paused', 'suspended'].includes(state.phase)) return null

  const what = state.trial ? 'Votre essai gratuit' : 'Votre abonnement'
  const text = {
    ending: `${what} se termine ${state.daysLeft <= 1 ? 'demain' : `dans ${state.daysLeft} jours`} (le ${longDate(state.endsAt)}).`,
    grace: `${what} est terminé. Votre vitrine sera mise en pause le ${longDate(state.pausesAt)}.`,
    paused: 'Votre vitrine est en pause : vos clients ne peuvent plus commander. Rien n’est perdu.',
    suspended: 'Votre restaurant est suspendu. Contactez Tchopi.',
  }[state.phase]

  return (
    <div className={`${styles.banner} ${state.phase === 'ending' ? styles.warn : styles.danger}`} role="status">
      <span>{text}</span>
      {state.phase !== 'suspended' && <Link href="/admin/abonnement">Choisir mon offre</Link>}
    </div>
  )
}
