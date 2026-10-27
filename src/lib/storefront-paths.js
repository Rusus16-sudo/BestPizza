// Adresses des vitrines : tchopi.cm/<enseigne>/<page>. Partagé entre le
// navigateur, le serveur et le proxy.

// Premiers segments qui sont des pages de l'application, pas des restaurants.
// À garder en accord avec la contrainte organizations_slug_not_reserved de la base.
export const APP_SEGMENTS = new Set([
  'admin', 'api', 'auth', 'kitchen', 'delivery', 'login', 'signup', 'reset-password', 'orders',
  'profile', 'settings', 'notifications', 'paiement', 'menu', 'categories', 'product', 'cart',
  'checkout', 'favorites', 'offers', 'help', 'tchopi', 'www', 'app', 'static', 'public',
  '_next', 'favicon.ico', 'sw.js', 'manifest.json',
])

// Vitrine affichée quand on ne sait pas encore quel restaurant le client visite
export const DEFAULT_STOREFRONT = 'best-pizza'

// Le dernier restaurant visité, retenu pour les pages communes (mes commandes, profil…)
export const LAST_STOREFRONT_COOKIE = 'tchopi_vitrine'

/** Le restaurant de cette adresse, ou null pour une page de l'application. */
export function storefrontSlugFromPath(pathname) {
  const first = String(pathname || '').split('/')[1] || ''
  if (!first || APP_SEGMENTS.has(first) || first.includes('.')) return null
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(first) ? first : null
}

/** Adresse d'une page dans la vitrine d'un restaurant : storefrontHref('best-pizza', '/menu'). */
export function storefrontHref(slug, path = '') {
  const clean = path && !path.startsWith('/') ? `/${path}` : path
  return `/${slug || DEFAULT_STOREFRONT}${clean === '/' ? '' : clean}`
}

/** Le dernier restaurant visité, lu dans le cookie (navigateur seulement). */
export function lastStorefrontSlug() {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${LAST_STOREFRONT_COOKIE}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}
