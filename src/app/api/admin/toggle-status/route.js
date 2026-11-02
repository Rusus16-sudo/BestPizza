import { NextResponse } from 'next/server'
import { createAdminClient, requireStaff, MANAGER_ROLES } from '@/utils/supabase/admin'
import { findManagedMember } from '@/lib/team'

// Suspendre ou réactiver un membre de l'équipe. Seul son accès à CET établissement
// change : son compte reste utilisable ailleurs (client, autre restaurant).
export async function POST(request) {
  const auth = await requireStaff(MANAGER_ROLES)
  if (auth.response) return auth.response
  const { membership } = auth

  try {
    const { userId, isActive } = await request.json()

    if (!userId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Données manquantes ou invalides' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Seule son équipe : ni le gérant du restaurant, ni un autre point de vente, ni un autre établissement
    const member = await findManagedMember(supabaseAdmin, membership, userId)
    if (!member) {
      return NextResponse.json({ error: 'Ce compte ne fait pas partie de votre personnel' }, { status: 403 })
    }
    const { data: updated, error } = await supabaseAdmin
      .from('memberships')
      .update({ is_active: isActive })
      .eq('id', member.id)
      .select('user_id')

    if (error) {
      console.error('Suspension:', error.message)
      return NextResponse.json({ error: "Le statut n'a pas pu être changé" }, { status: 500 })
    }
    if (!updated.length) {
      return NextResponse.json({ error: 'Ce compte ne fait pas partie de votre personnel' }, { status: 403 })
    }

    return NextResponse.json({ message: isActive ? 'Compte réactivé' : 'Compte suspendu' })
  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
