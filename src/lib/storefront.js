// La vitrine qui reçoit une commande : quelle enseigne, quel point de vente.

// Tant que chaque restaurant n'a pas sa propre adresse (phase 2), le site
// actuel est la vitrine de Best Pizza.
export const DEFAULT_ORGANIZATION_SLUG = 'best-pizza'

/**
 * Retrouve l'enseigne et le point de vente d'une commande.
 * Sans point de vente précisé, on prend le premier de l'enseigne.
 * Renvoie { organization, location } ou { error, status }.
 */
export async function resolveStorefront(db, organizationSlug, locationSlug) {
  const { data: organization } = await db
    .from('organizations')
    .select('id, slug, name, plan_status')
    .eq('slug', organizationSlug || DEFAULT_ORGANIZATION_SLUG)
    .maybeSingle()

  if (!organization) return { error: 'Restaurant introuvable.', status: 404 }
  if (organization.plan_status === 'suspended') {
    return { error: 'Ce restaurant ne prend pas de commandes pour le moment.', status: 409 }
  }

  let query = db
    .from('locations')
    .select('id, slug, name, is_open')
    .eq('organization_id', organization.id)
    .order('created_at')
    .limit(1)
  if (locationSlug) query = query.eq('slug', locationSlug)
  const { data: locations } = await query
  const location = locations?.[0]

  if (!location) return { error: 'Point de vente introuvable.', status: 404 }
  if (!location.is_open) {
    return { error: 'Ce point de vente est fermé pour le moment. Réessayez plus tard.', status: 409 }
  }

  return { organization, location }
}
