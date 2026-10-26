import { NextResponse } from 'next/server'
import { createAdminClient, requireStaff, MANAGER_ROLES, STAFF_ROLES } from '@/utils/supabase/admin'

// Le gérant crée le compte d'un membre de SON équipe (cuisinier ou livreur).
export async function POST(request) {
  const auth = await requireStaff(MANAGER_ROLES)
  if (auth.response) return auth.response
  const { membership } = auth

  try {
    const { email, password, role } = await request.json()

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    if (!STAFF_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit faire au moins 8 caractères' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // 1. Créer le compte. Une adresse qui a déjà un compte est refusée : sinon un gérant
    //    pourrait enrôler, puis dépanner, le compte de quelqu'un d'autre.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      const exists = /already|registered|exists/i.test(authError.message)
      return NextResponse.json({
        error: exists ? 'Cette adresse a déjà un compte. Utilisez une autre adresse email.' : authError.message,
      }, { status: 400 })
    }

    // 2. Il rejoint l'équipe du gérant, au point de vente de celui-ci s'il n'en gère qu'un
    const { data: member, error: memberError } = await supabaseAdmin
      .from('memberships')
      .insert({
        user_id: authData.user.id,
        organization_id: membership.organization_id,
        location_id: membership.location_id,
        role,
      })
      .select('created_at')
      .single()

    if (memberError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      console.error('Ajout à l’équipe:', memberError.message)
      return NextResponse.json({ error: "Le compte n'a pas pu être ajouté à l'équipe" }, { status: 500 })
    }

    await supabaseAdmin.from('profiles').update({ email }).eq('id', authData.user.id)

    return NextResponse.json({
      message: 'Compte créé',
      user: { id: authData.user.id, email, role, is_active: true, created_at: member.created_at }
    })
  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
