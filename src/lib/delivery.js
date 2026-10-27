// Frais de livraison d'une commande, partagés entre la vitrine (affichage) et le
// serveur (qui recalcule et fait foi).

// Les quartiers à tarif, la commande minimum et la livraison gratuite sont des
// réglages des offres Pro et Business ; en Starter, un forfait unique.
export const hasFullDelivery = (plan) => plan === 'pro' || plan === 'business'

/**
 * Frais de livraison pour un panier de `subtotal` (après réduction).
 * Renvoie { fee, zone, free, minimum, freeFrom, error }.
 * `zones` : les quartiers du point de vente ; `zoneId` : celui choisi par le client.
 */
export function deliveryQuote({ location, zones = [], plan, zoneId, subtotal }) {
  const full = hasFullDelivery(plan)
  const minimum = full ? Number(location?.minimum_order) || 0 : 0
  const freeFrom = full && location?.free_delivery_from != null ? Number(location.free_delivery_from) : null
  const usesZones = full && zones.length > 0

  let fee = Number(location?.delivery_fee) || 0
  let zone = null
  if (usesZones) {
    zone = zones.find((z) => String(z.id) === String(zoneId)) || null
    if (!zone) return { fee: 0, zone: null, free: false, minimum, freeFrom, usesZones, error: 'Choisissez votre quartier.' }
    fee = Number(zone.fee) || 0
  }

  if (minimum && subtotal < minimum) {
    return { fee, zone, free: false, minimum, freeFrom, usesZones, error: `Commande minimum : ${Math.round(minimum).toLocaleString('fr-FR')} FCFA.` }
  }

  const free = freeFrom !== null && subtotal >= freeFrom
  return { fee: free ? 0 : fee, zone, free, minimum, freeFrom, usesZones, error: null }
}
