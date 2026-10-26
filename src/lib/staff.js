// Qui travaille où : les droits du personnel viennent de son appartenance
// à une équipe (table memberships), plus du rôle de son profil.

// Gèrent l'enseigne ou un point de vente
export const MANAGER_ROLES = ['proprietaire', 'gerant']
// Personnel qu'un gérant peut ajouter, suspendre ou dépanner
export const STAFF_ROLES = ['cuisinier', 'livreur']

/**
 * Appartenance active du compte : { organization_id, location_id, role }, ou null
 * pour un client. Marche avec le client du navigateur (la RLS ne montre à chacun
 * que ses propres appartenances) comme avec celui du serveur.
 * Pour l'instant, un compte travaille pour un seul établissement : on prend le premier.
 */
export async function getStaffMembership(supabase, userId) {
  if (!userId) return null
  const { data, error } = await supabase
    .from('memberships')
    .select('organization_id, location_id, role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at')
    .limit(1)
  if (error) console.error('Lecture de l’équipe:', error.message)
  return data?.[0] || null
}

/**
 * Le rôle qui décide de l'écran affiché : 'gerant' (propriétaire ou gérant),
 * 'cuisinier', 'livreur' ou 'client'.
 */
export function screenRole(membership) {
  if (!membership) return 'client'
  return MANAGER_ROLES.includes(membership.role) ? 'gerant' : membership.role
}

/** L'écran de travail de chacun, après la connexion. */
export const HOME_BY_ROLE = { cuisinier: '/kitchen', livreur: '/delivery', gerant: '/admin' }
