// Horaires d'un point de vente, partagés entre la vitrine (affichage) et le serveur
// (qui refuse une commande hors horaires). Tout est calculé à l'heure du restaurant.

export const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
// Ordre d'affichage : la semaine commence le lundi
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
}

/** « 11 h », « 23 h 30 » */
export function formatTime(hhmm) {
  const total = toMinutes(hhmm)
  if (total === null) return ''
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

/** Jour de la semaine (0 = dimanche) et minutes écoulées, à l'heure du restaurant. */
function localClock(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone || 'Africa/Douala',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type) => parts.find((p) => p.type === type)?.value
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

/** Plages valides d'un jour : [[ouverture, fermeture] en minutes]. */
function rangesOf(hours, day) {
  return (hours?.[String(day)] || [])
    .map(([open, close]) => [toMinutes(open), toMinutes(close)])
    .filter(([open, close]) => open !== null && close !== null && open !== close)
}

/**
 * Le point de vente est-il ouvert à cette date ?
 * Renvoie { open, closesAt } si ouvert, sinon { open: false, opensAt, opensDay, inDays, manual }.
 * `manual` : fermé par le bouton « Fermer maintenant » du gérant.
 */
export function openingState(location, timezone, date = new Date()) {
  const hours = location?.opening_hours
  const { day, minutes } = localClock(date, timezone)
  const fmt = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

  if (location && location.is_open === false) return { open: false, manual: true }

  // Une plage de la veille qui déborde après minuit (ex. 18:00 → 02:00)
  for (const [open, close] of rangesOf(hours, (day + 6) % 7)) {
    if (close < open && minutes < close) return { open: true, closesAt: fmt(close) }
  }
  for (const [open, close] of rangesOf(hours, day)) {
    if (close > open && minutes >= open && minutes < close) return { open: true, closesAt: fmt(close) }
    if (close < open && minutes >= open) return { open: true, closesAt: fmt(close) }
  }

  // Prochaine ouverture, dans les 7 jours
  for (let offset = 0; offset < 8; offset++) {
    const d = (day + offset) % 7
    const next = rangesOf(hours, d)
      .map(([open]) => open)
      .filter((open) => offset > 0 || open > minutes)
      .sort((a, b) => a - b)[0]
    if (next !== undefined) return { open: false, opensAt: fmt(next), opensDay: d, inDays: offset }
  }
  return { open: false }
}

/** « Ouvert jusqu'à 23 h », « Fermé · ouvre demain à 11 h »… */
export function describeOpening(state) {
  if (state.open) return `Ouvert jusqu’à ${formatTime(state.closesAt)}`
  if (state.manual) return 'Fermé pour le moment'
  if (!state.opensAt) return 'Fermé'
  const when = state.inDays === 0 ? '' : state.inDays === 1 ? 'demain ' : `${DAYS[state.opensDay].toLowerCase()} `
  return `Fermé · ouvre ${when}à ${formatTime(state.opensAt)}`
}
