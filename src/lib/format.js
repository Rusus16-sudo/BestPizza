// « 45 min », « 1 h 05 », « 11 h »
export function formatDuration(minutes) {
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h} h ${String(rest).padStart(2, '0')}` : `${h} h`
}
