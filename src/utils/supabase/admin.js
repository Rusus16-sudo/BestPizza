import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'

export const MANAGER_ROLES = ['admin', 'gerant']

// Client avec la clé service_role : contourne la RLS. À n'utiliser que côté serveur,
// après avoir vérifié qui fait la demande.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Vérifie que la requête vient d'un utilisateur connecté et actif ayant l'un des rôles donnés.
// Renvoie { user, profile } ou { response } (réponse d'erreur à retourner telle quelle).
export async function requireRole(roles) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { response: NextResponse.json({ error: 'Connexion requise' }, { status: 401 }) }
  }

  const db = createAdminClient()
  let { data: profile } = await db
    .from('profiles')
    .select('id, role, is_active, email')
    .eq('id', user.id)
    .maybeSingle()

  // Compte sans profil (ex. inscription Google avant la mise en place du trigger) :
  // on crée un profil client, jamais un rôle du personnel.
  if (!profile && (!roles || roles.includes('client'))) {
    const { data: created, error } = await db
      .from('profiles')
      .upsert({ id: user.id, email: user.email, role: 'client' }, { onConflict: 'id', ignoreDuplicates: true })
      .select('id, role, is_active, email')
      .maybeSingle()
    if (error) console.error('Création du profil manquant:', error.message)
    profile = created || (await db.from('profiles').select('id, role, is_active, email').eq('id', user.id).maybeSingle()).data
  }

  if (!profile || profile.is_active === false || (roles && !roles.includes(profile.role))) {
    return { response: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  }

  return { user, profile }
}
