import { NextResponse } from 'next/server'
import { requireUser } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { getStaffMembership } from '@/lib/staff'
import { canAddLocation } from '@/lib/plans'
import { slugify, STOREFRONT_PAGES } from '@/lib/slug'

/**
 * Le gérant de l'enseigne ouvre un point de vente de plus, si son offre le permet.
 * Il reprend les horaires et la livraison du premier point de vente, à ajuster ensuite.
 * L'ajout passe par les droits du compte (RLS) ; la base vérifie aussi la limite de l'offre.
 */
export async function POST(request) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const supabase = await createClient()
  const membership = await getStaffMembership(supabase, auth.user.id)
  const isOrgManager = membership && (membership.role === 'proprietaire' || (membership.role === 'gerant' && !membership.location_id))
  if (!isOrgManager) {
    return NextResponse.json({ error: 'Seul le gérant de tout le restaurant peut ouvrir un point de vente.' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const name = String(body.name || '').trim().slice(0, 60)
  const address = String(body.address || '').trim().slice(0, 200) || null
  const phone = String(body.phone || '').trim().slice(0, 30)
  if (name.length < 2) return NextResponse.json({ error: 'Indiquez le nom ou le quartier du point de vente.' }, { status: 400 })
  if (phone.replace(/\D/g, '').length < 8) return NextResponse.json({ error: 'Indiquez un téléphone joignable par vos clients.' }, { status: 400 })

  const organizationId = membership.organization_id
  const [{ data: org }, { data: existing }] = await Promise.all([
    supabase.from('organizations').select('plan').eq('id', organizationId).single(),
    supabase.from('locations')
      .select('slug, opening_hours, delivery_fee, minimum_order, free_delivery_from')
      .eq('organization_id', organizationId)
      .order('created_at'),
  ])
  const locations = existing || []
  if (!canAddLocation(org?.plan, locations.length)) {
    return NextResponse.json({ error: 'Votre offre permet un seul point de vente. Passez à Business pour en ouvrir d’autres.' }, { status: 403 })
  }

  // tchopi.cm/<restaurant>/<quartier> : unique dans le restaurant, jamais le nom d'une page de la vitrine
  const base = slugify(name).slice(0, 36) || 'point-de-vente'
  const taken = new Set(locations.map((l) => l.slug))
  let slug = base
  for (let i = 2; taken.has(slug) || STOREFRONT_PAGES.has(slug); i++) slug = `${base}-${i}`

  const model = locations[0] || {}
  const { data: location, error } = await supabase
    .from('locations')
    .insert({
      organization_id: organizationId,
      slug,
      name,
      address,
      phone,
      opening_hours: model.opening_hours,
      delivery_fee: model.delivery_fee ?? 0,
      minimum_order: model.minimum_order ?? 0,
      free_delivery_from: model.free_delivery_from ?? null,
    })
    .select('id, slug, name, address, phone, is_open, opening_hours')
    .single()

  if (error) {
    // La limite de l'offre, vérifiée par la base
    if (error.code === '42501') return NextResponse.json({ error: error.message }, { status: 403 })
    console.error('Ouverture d’un point de vente:', error.message)
    return NextResponse.json({ error: "Le point de vente n'a pas pu être ajouté. Réessayez." }, { status: 500 })
  }

  return NextResponse.json({ location })
}
