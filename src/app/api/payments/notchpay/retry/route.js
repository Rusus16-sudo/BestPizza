import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createAdminClient, requireUser } from '@/utils/supabase/admin'
import { initializePayment, isNotchPayConfigured } from '@/lib/notchpay'

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000'
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

// Relance le paiement d'une commande restée impayée : depuis mes commandes (compte),
// ou depuis le lien de suivi (`trackingToken`, client sans compte)
export async function POST(request) {
  const auth = await requireUser()
  if (auth.response && auth.response.status !== 401) return auth.response
  const user = auth.response ? null : auth.user

  if (!isNotchPayConfigured()) {
    return NextResponse.json({ error: 'Paiement en ligne non configuré' }, { status: 503 })
  }

  const { shortId, trackingToken } = await request.json().catch(() => ({}))
  if (!shortId && !trackingToken) return NextResponse.json({ error: 'Commande manquante' }, { status: 400 })
  if (!trackingToken && !user) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 })

  const db = createAdminClient()
  let query = db
    .from('orders')
    .select('id, short_id, status, total_amount, payment_status, user_id, organization_id, tracking_token')
  query = trackingToken
    ? query.eq('tracking_token', String(trackingToken))
    // Deux restaurants peuvent avoir le même numéro : seulement les commandes de ce client
    : query.eq('short_id', shortId).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1)
  const { data: order } = await query.maybeSingle()

  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }
  if (order.payment_status === 'paye') {
    return NextResponse.json({ error: 'Cette commande est déjà payée.' }, { status: 409 })
  }
  if (order.status !== 'paiement') {
    return NextResponse.json({ error: 'Cette commande ne peut plus être payée en ligne.' }, { status: 409 })
  }

  const { data: store } = await db.from('organizations').select('name').eq('id', order.organization_id).maybeSingle()

  try {
    const origin = await siteOrigin()
    const payment = await initializePayment({
      amount: order.total_amount,
      reference: `${order.id}-${Date.now().toString(36)}`,
      description: `Commande ${order.short_id} – ${store?.name || 'Tchopi'}`,
      callback: `${origin}/paiement/retour?suivi=${order.tracking_token}`,
      customer: {
        name: auth.profile?.email?.split('@')[0] || 'Client',
        email: auth.profile?.email || undefined,
      },
    })

    if (!payment.authorizationUrl) throw new Error('Pas de page de paiement renvoyée')

    await db
      .from('orders')
      .update({ payment_reference: payment.reference, payment_status: 'en_attente' })
      .eq('id', order.id)

    return NextResponse.json({ paymentUrl: payment.authorizationUrl })
  } catch (error) {
    console.error('Relance du paiement:', error.message)
    return NextResponse.json({ error: "Le paiement n'a pas pu être relancé. Réessayez dans un instant." }, { status: 502 })
  }
}
