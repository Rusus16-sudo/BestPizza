// Règles de prix partagées entre la fiche produit (affichage) et le serveur (calcul qui fait foi)

export const SIZES = [
  { id: 'Moyenne', extra: 0 },
  { id: 'Grande', extra: 1000 },
  { id: 'Extra Grande', extra: 2000 },
]

export const isPizzaCategory = (category) =>
  ['pizza', 'pizzas'].includes(String(category || '').toLowerCase())

// Prix d'une unité : prix de base + supplément de taille (pizzas) + options cochées
export function computeUnitPrice(product, size, selected = {}) {
  const base = Number(product.price) || 0
  const sizeExtra = isPizzaCategory(product.category)
    ? (SIZES.find(s => s.id === size)?.extra || 0)
    : 0
  const addons = (product.customizations || []).reduce(
    (sum, c) => sum + (selected[c.id] ? Number(c.price) || 0 : 0),
    0
  )
  return base + sizeExtra + addons
}

// Une promo s'applique-t-elle à ce produit ?
export function promoApplies(offer, product) {
  if (!offer) return false
  if (offer.target_type === 'all') return true
  if (offer.target_type === 'category') {
    return String(product.category || '').toLowerCase() === String(offer.target_value || '').toLowerCase()
  }
  if (offer.target_type === 'product') return String(product.id) === String(offer.target_value)
  return false
}

export function isOfferValid(offer, now = new Date()) {
  if (!offer) return false
  if (!offer.valid_until) return true
  const end = new Date(offer.valid_until)
  end.setHours(23, 59, 59, 999)
  return now <= end
}
