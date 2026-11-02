// Les offres Tchopi et ce qu'elles permettent

export const PLAN_NAMES = { starter: 'Starter', pro: 'Pro', business: 'Business' }

// Prix mensuels, en FCFA. À l'année : 10 mois payés pour 12 (2 mois offerts).
// Seul Pro s'essaie gratuitement (14 jours) ; Starter et Business se paient dès le départ.
export const PLAN_PRICES = { starter: 15000, pro: 25000, business: 50000 }
export const PLAN_ORDER = ['starter', 'pro', 'business']

// Starter : une petite carte, un livreur ; au-delà de 300 commandes par mois, on lui
// propose Pro (sans jamais bloquer une commande)
export const STARTER_MAX_PRODUCTS = 30
export const STARTER_MAX_DRIVERS = 1
export const STARTER_ORDERS_PER_MONTH = 300

// Business : 3 points de vente inclus, puis chacun en plus est facturé
export const BUSINESS_INCLUDED_LOCATIONS = 3
export const EXTRA_LOCATION_PRICE = 15000

/** Nombre de points de vente permis par l'offre ; null = sans limite (Business). */
export function locationLimit(plan) {
  return plan === 'business' ? null : 1
}

/** Le restaurant peut-il ouvrir un point de vente de plus ? */
export function canAddLocation(plan, count) {
  const limit = locationLimit(plan)
  return limit === null || count < limit
}

/** Ce point de vente de plus serait-il facturé en supplément ? (Business, au-delà des 3 inclus) */
export function isExtraLocation(plan, count) {
  return plan === 'business' && count >= BUSINESS_INCLUDED_LOCATIONS
}

/**
 * Le prix d'un abonnement : l'offre, pour 1 mois ou 12 (2 mois offerts), avec en Business
 * les points de vente au-delà des 3 inclus.
 */
export function subscriptionPrice(plan, months, locationCount = 1) {
  const extra = plan === 'business' ? Math.max(0, locationCount - BUSINESS_INCLUDED_LOCATIONS) * EXTRA_LOCATION_PRICE : 0
  const monthly = (PLAN_PRICES[plan] || 0) + extra
  return months === 12 ? monthly * 10 : monthly
}
