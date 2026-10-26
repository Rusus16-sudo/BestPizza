import { NextResponse } from 'next/server'
import { createAdminClient, requireStaff, MANAGER_ROLES, STAFF_ROLES } from '@/utils/supabase/admin'

export async function POST(request) {
  const auth = await requireStaff(MANAGER_ROLES)
  if (auth.response) return auth.response
  const { membership } = auth

  try {
    const { userId, newPassword } = await request.json()

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit faire au moins 8 caractères' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Seulement un compte du personnel de SON équipe, et qui n'appartient à aucune autre :
    // sinon, changer son mot de passe donnerait la main sur son accès ailleurs.
    const { data: memberships } = await supabaseAdmin
      .from('memberships')
      .select('organization_id, role')
      .eq('user_id', userId)
    const inMyTeam = memberships?.some((m) => m.organization_id === membership.organization_id && STAFF_ROLES.includes(m.role))
    const elsewhere = memberships?.some((m) => m.organization_id !== membership.organization_id)
    if (!inMyTeam) {
      return NextResponse.json({ error: 'Ce compte ne fait pas partie de votre personnel' }, { status: 403 })
    }
    if (elsewhere) {
      return NextResponse.json({ error: 'Ce compte travaille aussi pour un autre établissement : la personne doit changer son mot de passe elle-même.' }, { status: 403 })
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ message: 'Mot de passe réinitialisé' })
  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
