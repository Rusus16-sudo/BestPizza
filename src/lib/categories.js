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
