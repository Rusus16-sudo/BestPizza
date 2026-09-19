import { NextResponse } from 'next/server'
import { createAdminClient, requireRole, MANAGER_ROLES } from '@/utils/supabase/admin'

export async function POST(request) {
  const auth = await requireRole(MANAGER_ROLES)
  if (auth.response) return auth.response

  try {
    const { email, password, role } = await request.json()

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    if (!['cuisinier', 'livreur'].includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit faire au moins 8 caractères' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // 1. Créer l'utilisateur dans auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // 2. Le trigger a créé le profil avec le rôle 'client' : on le met à jour
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ role, email })
      .eq('id', authData.user.id)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({
      message: 'Compte créé',
      user: { id: authData.user.id, email, role, is_active: true, created_at: authData.user.created_at }
    })
  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
