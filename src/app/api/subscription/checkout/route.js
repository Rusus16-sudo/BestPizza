import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient, requireStaff, MANAGER_ROLES } from '@/utils/supabase/admin'
import { isOrgManager } from '@/lib/team'
import { PLAN_NAMES, subscriptionPrice } from '@/lib/plans'
import { createCheckoutSession, isSasPayConfigured } from '@/lib/saspay'

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000'
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

/**
 * Le gérant du restaurant paie son abonnement : une offre, pour 1 mois ou 12.
 * Ouvre la page de paiement SasPay de Tchopi ; l'offre s'active une fois le paiement vérifié.
 */
export async function POST(request) {
  const auth = await requireStaff(MANAGER_ROLES)
  if (auth.response) return auth.response
  const { membership, user } = auth
  if (!isOrgManager(membership)) {
    return NextResponse.json({ error: 'Seul le gérant de tout le restaurant gère l’abonnement.' }, { status: 403 })
  }
  if (!isSasPayConfigured()) {
    return NextResponse.json({ error: 'Le paiement en ligne de l’abonnement arrive bientôt. Contactez Tchopi pour activer votre offre.' }, { status: 503 })
  }

  const { plan, months } = await request.json().catch(() => ({}))
  if (!PLAN_NAMES[plan] || ![1, 12].includes(months)) {
    return NextResponse.json({ error: 'Offre ou durée invalide.' }, { status: 400 })
  }

  const db = createAdminClient()
  const [{ data: org }, { count: locationCount }] = await Promise.all([
    db.from('organizations').select('id, slug, name').eq('id', membership.organization_id).single(),
    db.from('locations').select('*', { count: 'exact', head: true }).eq('organization_id', membership.organization_id),
  ])
  // Plusieurs adresses demandent Business
  if (plan !== 'business' && locationCount > 1) {
    return NextResponse.json({ error: `Votre restaurant a ${locationCount} points de vente : l’offre Business est nécessaire.` }, { status: 400 })
  }
  const amount = subscriptionPrice(plan, months, locationCount)

  const { data: payment, error } = await db
    .from('subscription_payments')
    .insert({ organization_id: org.id, plan, months, amount, created_by: user.id })
    .select('id')
    .single()
  if (error) {
    console.error('Paiement d’abonnement:', error.message)
    return NextResponse.json({ error: "Le paiement n'a pas pu être préparé. Réessayez." }, { status: 500 })
  }

  try {
    const origin = await siteOrigin()
    const session = await createCheckoutSession({
      amount,
      description: `Tchopi ${PLAN_NAMES[plan]} · ${months === 12 ? '12 mois' : '1 mois'} · ${org.name}`,
      customerEmail: user.email,
      customerName: org.name,
      returnUrl: `${origin}/admin/abonnement?paiement=${payment.id}`,
      metadata: { payment_id: payment.id, organization: org.slug, plan, months },
    })
    await db.from('subscription_payments').update({ provider_session_id: session.id }).eq('id', payment.id)
    return NextResponse.json({ checkoutUrl: session.checkoutUrl, paymentId: payment.id })
  } catch (err) {
    console.error('Ouverture du paiement SasPay:', err.message)
    await db.from('subscription_payments').update({ status: 'failed' }).eq('id', payment.id)
    return NextResponse.json({ error: "La page de paiement n'a pas pu s'ouvrir. Réessayez dans un instant." }, { status: 502 })
  }
}
