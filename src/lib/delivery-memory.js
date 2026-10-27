// Les coordonnées de livraison du client, retenues sur l'appareil pour la commande
// suivante (avec ou sans compte) : nom, téléphone, quartier, repère.

const KEY = 'tchopi_livraison'

export function loadDeliveryDetails() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    return saved && typeof saved === 'object' ? saved : null
  } catch {
    return null
  }
}

export function saveDeliveryDetails({ name, phone, quarter, landmark }) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ name, phone, quarter, landmark }))
  } catch {}
}

// Adresse enregistrée dans le profil d'un compte : « Bastos – face pharmacie »
export const ADDRESS_SEPARATOR = ' – '

export function joinAddress(quarter, landmark) {
  return [String(quarter || '').trim(), String(landmark || '').trim()].filter(Boolean).join(ADDRESS_SEPARATOR)
}

export function splitAddress(address) {
  const [quarter = '', ...rest] = String(address || '').split(ADDRESS_SEPARATOR)
  return { quarter: quarter.trim(), landmark: rest.join(ADDRESS_SEPARATOR).trim() }
}
