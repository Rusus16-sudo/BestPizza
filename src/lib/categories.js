// Catégories des plats. Chaque restaurant a les siennes : elles viennent de ses plats.
// Les anciennes catégories en anglais (Sides, Drinks…) s'affichent en français.

const LABELS = {
  pizza: 'Pizzas', pizzas: 'Pizzas',
  burger: 'Burgers', burgers: 'Burgers',
  side: 'Accompagnements', sides: 'Accompagnements',
  drink: 'Boissons', drinks: 'Boissons', boisson: 'Boissons', boissons: 'Boissons',
  dessert: 'Desserts', desserts: 'Desserts',
}

/** Le nom affiché d'une catégorie : « Sides » → « Accompagnements ». */
export function categoryLabel(category) {
  const key = String(category || '').trim().toLowerCase()
  return LABELS[key] || String(category || '').trim()
}

// Pour un restaurant qui démarre, sans aucun plat
export const STARTER_CATEGORIES = ['Pizzas', 'Burgers', 'Accompagnements', 'Boissons', 'Desserts']

/** Les catégories d'un restaurant, d'après ses plats, sans doublon. */
export function categoriesOf(products = []) {
  const seen = new Map()
  for (const p of products) {
    const value = String(p?.category || '').trim()
    if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value)
  }
  const list = [...seen.values()]
  return list.length ? list.sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b), 'fr')) : STARTER_CATEGORIES
}

// Sur la vitrine : les plats d'abord (dans l'ordre alphabétique), puis les accompagnements,
// les desserts et les boissons, quel que soit le restaurant.
const LAST = ['accompagnements', 'desserts', 'boissons']

/** La clé d'une catégorie : « Pizza », « pizzas » et « Pizzas » sont la même. */
export function categoryKey(category) {
  return (categoryLabel(category) || 'Autres').toLowerCase()
}

/**
 * Les plats d'un restaurant rangés par catégorie, avec ses propres catégories :
 * [{ key, label, products }], dans l'ordre d'affichage de la vitrine.
 */
export function groupByCategory(products = []) {
  const groups = new Map()
  for (const p of products) {
    const key = categoryKey(p.category)
    if (!groups.has(key)) groups.set(key, { key, label: categoryLabel(p.category) || 'Autres', products: [] })
    groups.get(key).products.push(p)
  }
  const rank = (key) => (LAST.includes(key) ? LAST.indexOf(key) + 1 : 0)
  return [...groups.values()].sort((a, b) => rank(a.key) - rank(b.key) || a.label.localeCompare(b.label, 'fr'))
}
