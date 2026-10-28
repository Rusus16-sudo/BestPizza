import { NextResponse } from 'next/server'
import { createAdminClient, requireUser } from '@/utils/supabase/admin'
import { slugProblem, slugify } from '@/lib/slug'

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const COLOR = /^#[0-9a-f]{6}$/i
const TRIAL_DAYS = 14
// Pages de la vitrine : un point de vente ne peut pas porter leur nom (contrainte de la base)
const STOREFRONT_PAGES = new Set(['menu', 'categories', 'product', 'cart', 'checkout', 'favorites', 'offers', 'help', 'manifest', 'suivi'])

/**
 * Un restaurant s'inscrit : son enseigne, son premier point de vente, et le compte
 * connecté devient son propriétaire. Il démarre avec l'essai de l'offre Pro.
 */
export async function POST(request) {
  const auth = await requireUser()
  if (auth.response) return auth.response
  const { user } = auth

  const body = await request.json().catch(() => ({}))
  const name = String(body.name || '').trim().slice(0, 60)
  const slug = String(body.slug || '').trim().toLowerCase()
  const color = COLOR.test(String(body.color || '')) ? body.color : '#d93a1f'
  const locationName = String(body.locationName || '').trim().slice(0, 60)
  const address = String(body.address || '').trim().slice(0, 200) || null
  const phone = String(body.phone || '').trim().slice(0, 30)
  const opens = TIME.test(body.opens) ? body.opens : '11:00'
  const closes = TIME.test(body.closes) ? body.closes : '23:00'
  const fee = Math.max(0, Math.round(Number(body.deliveryFee) || 0))

  if (name.length < 2) return NextResponse.json({ error: 'Le nom du restaurant est trop court.' }, { status: 400 })
  const problem = slugProblem(slug)
  if (problem) return NextResponse.json({ error: `Adresse du lien : ${problem}` }, { status: 400 })
  if (locationName.length < 2) return NextResponse.json({ error: 'Indiquez le quartier de votre point de vente.' }, { status: 400 })
  if (phone.replace(/\D/g, '').length < 8) return NextResponse.json({ error: 'Indiquez un téléphone joignable par vos clients.' }, { status: 400 })
  if (opens === closes) return NextResponse.json({ error: 'L’heure d’ouverture et de fermeture doivent être différentes.' }, { status: 400 })

  const db = createAdminClient()

  // Un compte gère un seul restaurant pour l'instant
  const { data: existing } = await db.from('memberships').select('organization_id').eq('user_id', user.id).limit(1)
  if (existing?.length) {
    return NextResponse.json({ error: 'Votre compte travaille déjà pour un restaurant. Utilisez un autre compte pour en créer un.' }, { status: 409 })
  }

  const { data: organization, error: orgError } = await db
    .from('organizations')
    .insert({
      slug,
      name,
      primary_color: color,
      plan: 'pro',
      plan_status: 'trial',
      trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id, slug, name')
    .single()

  if (orgError) {
    // Prise entre-temps par quelqu'un d'autre (contrainte d'unicité)
    if (orgError.code === '23505') return NextResponse.json({ error: 'Cette adresse vient d’être prise. Choisissez-en une autre.' }, { status: 409 })
    console.error('Création du restaurant:', orgError.message)
    return NextResponse.json({ error: "Le restaurant n'a pas pu être créé. Réessayez." }, { status: 500 })
  }

  const hours = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [String(d), [[opens, closes]]]))
  // L'adresse du point de vente (tchopi.cm/<restaurant>/<quartier>) ne doit pas prendre
  // celle d'une page de la vitrine
  let locationSlug = slugify(locationName).slice(0, 36) || 'principal'
  if (STOREFRONT_PAGES.has(locationSlug)) locationSlug = `${locationSlug}-1`
  const { error: locError } = await db.from('locations').insert({
    organization_id: organization.id,
    slug: locationSlug,
    name: locationName,
    address,
    phone,
    opening_hours: hours,
    delivery_fee: fee,
  })
  const { error: memberError } = locError ? { error: null } : await db.from('memberships').insert({
    user_id: user.id,
    organization_id: organization.id,
    role: 'proprietaire',
  })

  if (locError || memberError) {
    // Rien ne doit rester à moitié créé
    await db.from('organizations').delete().eq('id', organization.id)
    console.error('Création du restaurant:', (locError || memberError).message)
    return NextResponse.json({ error: "Le restaurant n'a pas pu être créé. Réessayez." }, { status: 500 })
  }

  return NextResponse.json({ organization })
}
