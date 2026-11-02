// L'heure d'arrivée estimée d'une commande, pour rassurer le client.
// Une estimation simple, à partir de l'étape en cours et de l'heure où elle a commencé ;
// en route, de la distance entre le livreur et le client quand on la connaît.

const MINUTE = 60000
// Durées habituelles, en minutes
const PREPARATION = 20
const WAIT_FOR_DRIVER = 5
const RIDE = 15
// En ville, à moto : environ 20 km/h, détours compris
const KM_PER_MINUTE = 20 / 60

/** Distance à vol d'oiseau entre deux points, en kilomètres. */
export function distanceKm(a, b) {
  if (!a || !b) return null
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

/**
 * L'heure d'arrivée estimée (Date), ou null si la commande est terminée.
 * `order` : { status, createdAt, acceptedAt, readyAt, pickedAt, driver: { lat, lng }, destination: { lat, lng } }
 */
export function estimatedArrival(order, now = Date.now()) {
  const at = (date, minutes) => new Date(date).getTime() + minutes * MINUTE
  let eta
  switch (order.status) {
    case 'en_attente':
      eta = Math.max(at(order.createdAt, PREPARATION + WAIT_FOR_DRIVER + RIDE), now + (PREPARATION + RIDE) * MINUTE)
      break
    case 'en_preparation':
      eta = at(order.acceptedAt || order.createdAt, PREPARATION + WAIT_FOR_DRIVER + RIDE)
      break
    case 'prete':
      eta = at(order.readyAt || now, WAIT_FOR_DRIVER + RIDE)
      break
    case 'en_route': {
      const km = distanceKm(order.driver, order.destination)
      eta = km != null ? now + (km / KM_PER_MINUTE + 3) * MINUTE : at(order.pickedAt || now, RIDE)
      break
    }
    default:
      return null
  }
  // Jamais dans le passé : au pire, « dans quelques minutes »
  return new Date(Math.max(eta, now + 3 * MINUTE))
}
