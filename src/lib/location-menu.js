// La carte telle qu'elle est au point de vente choisi : la carte commune, moins les plats
// en rupture à cette adresse, avec son prix s'il est différent. Le serveur applique les
// mêmes règles au moment de la commande (api/orders) et fait foi.

/** Le plat à ce point de vente : son prix local, et `is_available` faux s'il y est en rupture. */
export function localProduct(product, location) {
  const rule = location?.rules?.find((r) => String(r.product_id) === String(product.id))
  return {
    ...product,
    is_available: product.is_available !== false && rule?.is_available !== false,
    price: rule?.price_override ?? product.price,
  }
}

/** Les plats proposés à ce point de vente, à leur prix local. */
export function localMenu(products, location) {
  return (products || []).map((p) => localProduct(p, location)).filter((p) => p.is_available)
}
