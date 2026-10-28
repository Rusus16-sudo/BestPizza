import { APP_SEGMENTS } from '@/lib/storefront-paths'

// L'adresse du lien d'un restaurant : tchopi.cm/<adresse>

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

// Pages de la vitrine : un point de vente ne peut pas porter leur nom (contrainte de la base)
export const STOREFRONT_PAGES = new Set(['menu', 'categories', 'product', 'cart', 'checkout', 'favorites', 'offers', 'help', 'manifest', 'suivi'])

/** « Chez Mama Africa ! » → « chez-mama-africa » */
export function slugify(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
}

/** null si l'adresse est utilisable (hors disponibilité), sinon la raison. */
export function slugProblem(slug) {
  if (!slug || slug.length < 2) return 'Au moins 2 caractères.'
  if (slug.length > 40) return '40 caractères au plus.'
  if (!SLUG_PATTERN.test(slug)) return 'Seulement des lettres sans accent, des chiffres et des tirets.'
  if (APP_SEGMENTS.has(slug)) return 'Cette adresse est réservée par Tchopi.'
  return null
}
