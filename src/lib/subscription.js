// Où en est l'abonnement d'un restaurant : essai, payé, bientôt fini, en grâce, en pause.
//
// L'essai (ou la période payée) se termine à une date ; 3 jours avant, le gérant est
// prévenu ; ensuite il a 3 jours de grâce, puis la vitrine est mise en pause, sans
// rien perdre, jusqu'au paiement. Calculé à la lecture : aucune tâche planifiée.

const DAY = 24 * 60 * 60 * 1000
export const WARN_DAYS = 3
export const GRACE_DAYS = 3

/**
 * {
 *   phase: 'trial' | 'active' | 'ending' | 'grace' | 'paused' | 'suspended',
 *   endsAt: Date | null   — fin de l'essai ou de la période payée (null = sans fin),
 *   pausesAt: Date | null — mise en pause si rien n'est payé d'ici là,
 *   daysLeft: number | null — jours avant la fin (ou avant la pause, en grâce),
 *   trial: boolean,
 *   open: boolean         — la vitrine prend des commandes
 * }
 */
export function subscriptionState(org, now = Date.now()) {
  if (!org) return null
  if (org.plan_status === 'suspended') {
    return { phase: 'suspended', endsAt: null, pausesAt: null, daysLeft: null, trial: false, open: false }
  }
  const trial = org.plan_status === 'trial'
  const end = trial ? org.trial_ends_at : org.paid_until
  // Payé sans date de fin (ex. Best Pizza) : rien à surveiller
  if (!end) return { phase: trial ? 'trial' : 'active', endsAt: null, pausesAt: null, daysLeft: null, trial, open: true }

  const endsAt = new Date(end)
  const pausesAt = new Date(endsAt.getTime() + GRACE_DAYS * DAY)
  const days = (date) => Math.max(0, Math.ceil((date.getTime() - now) / DAY))

  if (now >= pausesAt.getTime()) return { phase: 'paused', endsAt, pausesAt, daysLeft: 0, trial, open: false }
  if (now >= endsAt.getTime()) return { phase: 'grace', endsAt, pausesAt, daysLeft: days(pausesAt), trial, open: true }
  if (endsAt.getTime() - now <= WARN_DAYS * DAY) return { phase: 'ending', endsAt, pausesAt, daysLeft: days(endsAt), trial, open: true }
  return { phase: trial ? 'trial' : 'active', endsAt, pausesAt, daysLeft: days(endsAt), trial, open: true }
}

/** La nouvelle date de fin après un paiement : à partir d'aujourd'hui, ou de la fin en cours si elle est plus loin. */
export function extendPaidUntil(paidUntil, months, now = Date.now()) {
  const start = new Date(Math.max(now, paidUntil ? new Date(paidUntil).getTime() : 0))
  start.setMonth(start.getMonth() + months)
  return start
}
