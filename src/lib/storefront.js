import { openingState, describeOpening } from '@/lib/opening-hours'

// La vitrine qui reçoit une commande : quelle enseigne, quel point de vente.

// Tant que chaque restaurant n'a pas sa propre adresse (phase 2), le site
// actuel est la vitrine de Best Pizza.
export const DEFAULT_ORGANIZATION_SLUG = 'best-pizza'

/**
 * Retrouve l'enseigne et le point de vente d'une commande.
 * Sans point de vente précisé, on prend le premier de l'enseigne.
 * Refuse une commande hors horaires.
 * Renvoie { organization, location, zones } ou { error, status }.
 */
export async function resolveStorefront(db, organizationSlug, locationSlug) {
  const { data: organization } = await db
    .from('organizations')
    .select('id, slug, name, plan, plan_status, timezone')
    .eq('slug', organizationSlug || DEFAULT_ORGANIZATION_SLUG)
    .maybeSingle()

  if (!organization) return { error: 'Restaurant introuvable.', status: 404 }
  if (organization.plan_status === 'suspended') {
    return { error: 'Ce restaurant ne prend pas de commandes pour le moment.', status: 409 }
  }

  let query = db
    .from('locations')
    .select('id, slug, name, is_open, opening_hours, delivery_fee, minimum_order, free_delivery_from')
    .eq('organization_id', organization.id)
    .order('created_at')
    .limit(1)
  if (locationSlug) query = query.eq('slug', locationSlug)
  const { data: locations } = await query
  const location = locations?.[0]

  if (!location) return { error: 'Point de vente introuvable.', status: 404 }

  // Fermé par le gérant, ou en dehors de ses horaires (à l'heure du restaurant)
  const opening = openingState(location, organization.timezone)
  if (!opening.open) {
    const reopens = opening.manual || !opening.opensAt ? ' pour le moment' : ` et ${describeOpening(opening).replace(/^Fermé · /, '')}`
    return { error: `${location.name} est fermé${reopens}.`, status: 409 }
  }

  const { data: zones } = await db
    .from('delivery_zones')
    .select('id, name, fee')
    .eq('location_id', location.id)
    .order('position')

  return { organization, location, zones: zones || [] }
}
