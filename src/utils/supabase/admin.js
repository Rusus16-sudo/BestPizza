import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { MANAGER_ROLES, STAFF_ROLES, getStaffMembership } from '@/lib/staff'

export { MANAGER_ROLES, STAFF_ROLES }

// Client avec la clé service_role : contourne la RLS. À n'utiliser que côté serveur,
// après avoir vérifié qui fait la demande.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const denied = (status, error) => ({ response: NextResponse.json({ error }, { status }) })

// Vérifie que la requête vient d'un compte connecté et actif (client ou personnel).
// Renvoie { user, profile } ou { response } (réponse d'erreur à retourner telle quelle).
export async function requireUser() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return denied(401, 'Connexion requise')

  const db = createAdminClient()
  let { data: profile } = await db
    .from('profiles')
    .select('id, is_active, email')
    .eq('id', user.id)
    .maybeSingle()

  // Compte sans profil (ex. inscription Google avant la mise en place du trigger) :
  // on crée un profil client.
  if (!profile) {
    const { data: created, error } = await db
      .from('profiles')
      .upsert({ id: user.id, email: user.email, role: 'client' }, { onConflict: 'id', ignoreDuplicates: true })
      .select('id, is_active, email')
      .maybeSingle()
    if (error) console.error('Création du profil manquant:', error.message)
    profile = created || (await db.from('profiles').select('id, is_active, email').eq('id', user.id).maybeSingle()).data
  }

  if (!profile || profile.is_active === false) return denied(403, 'Accès refusé')
  return { user, profile }
}

// Vérifie que la requête vient d'un membre actif d'une équipe, avec l'un de ces rôles.
// Renvoie { user, profile, membership } : membership dit pour quelle enseigne
// (et quel point de vente) il agit. Toute action doit rester dans cette enseigne.
export async function requireStaff(roles) {
  const auth = await requireUser()
  if (auth.response) return auth

  const membership = await getStaffMembership(createAdminClient(), auth.user.id)
  if (!membership || !roles.includes(membership.role)) return denied(403, 'Accès refusé')
  return { ...auth, membership }
}
