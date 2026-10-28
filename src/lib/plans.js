// Les offres Tchopi et ce qu'elles permettent

export const PLAN_NAMES = { starter: 'Starter', pro: 'Pro', business: 'Business' }

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
