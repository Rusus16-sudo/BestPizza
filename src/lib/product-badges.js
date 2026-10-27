// Badges d'un plat choisis par le gérant : « Nouveau » et « Épicé ».

// Combien de temps un plat reste « Nouveau » une fois la case cochée
export const NEW_FOR_DAYS = 30

export function isNewProduct(product, now = new Date()) {
  return Boolean(product?.new_until) && new Date(product.new_until) > now
}

/**
 * Date de fin du badge « Nouveau » à enregistrer selon la case cochée.
 * Un plat déjà nouveau garde sa date : réenregistrer le plat ne la repousse pas.
 */
export function newUntilFor(checked, currentNewUntil, now = new Date()) {
  if (!checked) return null
  if (currentNewUntil && new Date(currentNewUntil) > now) return currentNewUntil
  return new Date(now.getTime() + NEW_FOR_DAYS * 24 * 60 * 60 * 1000).toISOString()
}
