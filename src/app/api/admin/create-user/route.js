import { NextResponse } from 'next/server'
import { createAdminClient, requireStaff, MANAGER_ROLES, STAFF_ROLES } from '@/utils/supabase/admin'
import { isOrgManager } from '@/lib/team'

// Le gérant crée le compte d'un membre de SON équipe : cuisinier ou livreur, et, pour le
// gérant de tout le restaurant en Business, le responsable d'un point de vente.
export async function POST(request) {
  const auth = await requireStaff(MANAGER_ROLES)
  if (auth.response) return auth.response
  const { membership } = auth

  try {
    const { email, password, role, locationId } = await request.json()

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    if (!STAFF_ROLES.includes(role) && role !== 'gerant') {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit faire au moins 8 caractères' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Le point de vente du nouveau membre : celui du responsable qui l'ajoute ; sinon celui
    // choisi par le gérant du restaurant (vide = tous ses points de vente)
    let location = membership.location_id
    if (isOrgManager(membership) && locationId) {
      const { data: own } = await supabaseAdmin
        .from('locations').select('id').eq('id', locationId).eq('organization_id', membership.organization_id).maybeSingle()
      if (!own) return NextResponse.json({ error: 'Point de vente introuvable' }, { status: 400 })
      location = own.id
    }

    if (role === 'gerant') {
      const { data: org } = await supabaseAdmin.from('organizations').select('plan').eq('id', membership.organization_id).single()
      if (!isOrgManager(membership)) return NextResponse.json({ error: 'Seul le gérant du restaurant ajoute un responsable.' }, { status: 403 })
      if (org?.plan !== 'business') return NextResponse.json({ error: 'Un responsable par point de vente est inclus dans l’offre Business.' }, { status: 403 })
      if (!location) return NextResponse.json({ error: 'Choisissez le point de vente de ce responsable.' }, { status: 400 })
    }

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

    // 2. Il rejoint l'équipe, à son point de vente
    const { data: member, error: memberError } = await supabaseAdmin
      .from('memberships')
      .insert({
        user_id: authData.user.id,
        organization_id: membership.organization_id,
        location_id: location,
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
      user: { id: authData.user.id, email, role, location_id: location, is_active: true, created_at: member.created_at }
    })
  } catch (error) {
    console.error('Erreur serveur:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
