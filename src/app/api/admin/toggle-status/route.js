import { NextResponse } from 'next/server'
import { createAdminClient, requireRole, MANAGER_ROLES } from '@/utils/supabase/admin'

const STAFF_ROLES = ['cuisinier', 'livreur']

export async function POST(request) {
  const auth = await requireRole(MANAGER_ROLES)
  if (auth.response) return auth.response

  try {
    const { userId, isActive } = await request.json()

    if (!userId || typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'Données manquantes ou invalides' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Seuls les comptes du personnel peuvent être suspendus
    const { data: target } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
    if (!target || !STAFF_ROLES.includes(target.role)) {
      return NextResponse.json({ error: 'Ce compte ne fait pas partie du personnel' }, { status: 403 })
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // Bannir ou débannir dans Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: isActive ? 'none' : '876000h'
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    return NextResponse.json({ message: isActive ? 'Compte réactivé' : 'Compte suspendu' })
  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
