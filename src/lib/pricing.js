// Règles des codes promo, partagées entre le panier (affichage) et le serveur (calcul qui fait foi).
// Le prix d'un plat et de ses choix est dans lib/options.js.

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
