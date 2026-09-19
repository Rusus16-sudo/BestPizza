import { NextResponse } from 'next/server'
import { createAdminClient, requireRole, MANAGER_ROLES } from '@/utils/supabase/admin'

const STAFF_ROLES = ['cuisinier', 'livreur']

export async function POST(request) {
  const auth = await requireRole(MANAGER_ROLES)
  if (auth.response) return auth.response

  try {
    const { userId, newPassword } = await request.json()

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit faire au moins 8 caractères' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Le gérant ne peut réinitialiser que les comptes du personnel
    const { data: target } = await supabaseAdmin.from('profiles').select('role').eq('id', userId).single()
    if (!target || !STAFF_ROLES.includes(target.role)) {
      return NextResponse.json({ error: 'Ce compte ne fait pas partie du personnel' }, { status: 403 })
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
