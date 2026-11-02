import { STAFF_ROLES } from '@/lib/staff'

// Qui le gérant peut ajouter, suspendre ou dépanner (côté serveur, clé service).
//
// - Le gérant de tout le restaurant : les cuisiniers et livreurs de tous ses points
//   de vente, et les responsables de point de vente (gérant rattaché à une adresse).
// - Le responsable d'un point de vente : les cuisiniers et livreurs de son adresse.

/** Gère-t-il tout le restaurant (et pas une seule adresse) ? */
export function isOrgManager(membership) {
  return membership?.role === 'proprietaire' || (membership?.role === 'gerant' && !membership.location_id)
}

/** Ce membre fait-il partie de l'équipe que ce gérant gère ? */
export function managesMember(manager, member) {
  if (!manager || !member || member.organization_id !== manager.organization_id) return false
  if (isOrgManager(manager)) {
    return STAFF_ROLES.includes(member.role) || (member.role === 'gerant' && Boolean(member.location_id))
  }
  return STAFF_ROLES.includes(member.role) && member.location_id === manager.location_id
}

/** L'appartenance de ce compte à l'équipe du gérant, ou null s'il n'en fait pas partie. */
export async function findManagedMember(db, manager, userId) {
  const { data } = await db
    .from('memberships')
    .select('id, user_id, organization_id, location_id, role, is_active')
    .eq('user_id', userId)
    .eq('organization_id', manager.organization_id)
  return (data || []).find((m) => managesMember(manager, m)) || null
}
