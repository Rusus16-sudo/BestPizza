// Le paiement en ligne (MTN MoMo, Orange Money) d'un restaurant.
//
// Il arrive en Pro et Business, le temps que Tchopi soit agréé par un agrégateur
// (Campay, CinetPay…) qui versera à chaque restaurant son propre argent. En attendant,
// les clients paient à la livraison, et l'option s'affiche avec un cadenas.
//
// Seul Best Pizza paie déjà en ligne : le compte Notch Pay branché est le sien.
const ONLINE_PAYMENT_ORGANIZATIONS = new Set(['best-pizza'])

/**
 * 'enabled' : le client peut payer en ligne ;
 * 'soon' : inclus dans l'offre, bientôt disponible (cadenas) ;
 * 'none' : Starter, paiement à la livraison seulement.
 */
export function onlinePaymentStatus(storefront) {
  if (ONLINE_PAYMENT_ORGANIZATIONS.has(storefront?.slug)) return 'enabled'
  return storefront?.plan === 'pro' || storefront?.plan === 'business' ? 'soon' : 'none'
}
