// Les choix d'un plat (taille, formule, suppléments…), définis par le gérant.
// Partagé entre la fiche du plat, le panier et le serveur, qui recalcule et fait foi.
//
// product.option_groups = [{ id, name, type: 'single' | 'multiple', choices: [{ id, label, price }] }]
// Sélection du client = { [groupId]: choiceId } (single) ou { [groupId]: [choiceIds] } (multiple)

const groupsOf = (product) => (Array.isArray(product?.option_groups) ? product.option_groups : [])
  .filter((g) => g && g.id && Array.isArray(g.choices) && g.choices.length > 0)

/** Choix par défaut : le premier de chaque choix unique, aucune option cochée. */
export function defaultSelection(product) {
  return Object.fromEntries(groupsOf(product).map((g) => [g.id, g.type === 'multiple' ? [] : g.choices[0].id]))
}

/**
 * Ne garde que des choix qui existent pour ce plat. Un choix unique manquant
 * ou inconnu prend la première valeur, comme sur la fiche du plat.
 */
export function normalizeSelection(product, raw = {}) {
  const selection = {}
  for (const g of groupsOf(product)) {
    const ids = new Set(g.choices.map((c) => String(c.id)))
    if (g.type === 'multiple') {
      const picked = Array.isArray(raw?.[g.id]) ? raw[g.id].map(String) : []
      selection[g.id] = [...new Set(picked.filter((id) => ids.has(id)))]
    } else {
      const picked = String(raw?.[g.id] ?? '')
      selection[g.id] = ids.has(picked) ? picked : String(g.choices[0].id)
    }
  }
  return selection
}

/**
 * Paniers d'avant les choix par plat (taille « Grande », suppléments { extra_cheese: true }) :
 * traduits vers les choix du plat.
 */
export function legacySelection(product, size, customizations = {}) {
  const raw = {}
  for (const g of groupsOf(product)) {
    if (g.type === 'multiple') {
      raw[g.id] = g.choices.filter((c) => customizations?.[c.id] === true).map((c) => c.id)
    } else {
      raw[g.id] = g.choices.find((c) => c.label === size)?.id
    }
  }
  return normalizeSelection(product, raw)
}

/** Les choix retenus, ligne par ligne : [{ group_id, group, choice_id, label, price }]. */
export function selectionLines(product, selection) {
  const lines = []
  for (const g of groupsOf(product)) {
    const picked = g.type === 'multiple' ? selection?.[g.id] || [] : [selection?.[g.id]]
    for (const id of picked) {
      const c = g.choices.find((x) => String(x.id) === String(id))
      if (c) lines.push({ group_id: g.id, group: g.name, choice_id: String(c.id), label: c.label, price: Number(c.price) || 0, single: g.type !== 'multiple' })
    }
  }
  return lines
}

/** Prix d'une unité : prix du plat + ce qu'ajoutent les choix retenus. */
export function unitPriceFor(product, selection) {
  return (Number(product?.price) || 0) + selectionLines(product, selection).reduce((sum, l) => sum + l.price, 0)
}

/** « Grande » : les choix uniques, pour la cuisine (et l'ancienne colonne « size »). */
export function singleLabels(lines = []) {
  return lines.filter((l) => l.single).map((l) => l.label).join(' · ')
}

/** « + Bacon fumé, Fromage » : les options cochées. */
export function extraLabels(lines = []) {
  return lines.filter((l) => !l.single).map((l) => l.label)
}

/** Deux sélections identiques ? (pour regrouper le même plat dans le panier) */
export function sameSelection(a = {}, b = {}) {
  const norm = (s) => JSON.stringify(Object.keys(s || {}).sort().map((k) => [k, Array.isArray(s[k]) ? [...s[k]].sort() : s[k]]))
  return norm(a) === norm(b)
}

/** Une sélection retrouvée depuis les lignes d'une commande (« Recommander »). */
export function selectionFromLines(lines = []) {
  const selection = {}
  for (const l of lines) {
    if (l.single) selection[l.group_id] = l.choice_id
    else (selection[l.group_id] ||= []).push(l.choice_id)
  }
  return selection
}
