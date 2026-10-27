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

// Relance le paiement d'une commande restée impayée
export async function POST(request) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  if (!isNotchPayConfigured()) {
    return NextResponse.json({ error: 'Paiement en ligne non configuré' }, { status: 503 })
  }

  const { shortId } = await request.json().catch(() => ({}))
  if (!shortId) return NextResponse.json({ error: 'Commande manquante' }, { status: 400 })

  const db = createAdminClient()
  const { data: order } = await db
    .from('orders')
    .select('id, short_id, status, total_amount, payment_status, user_id, organization_id')
    .eq('short_id', shortId)
    // Deux restaurants peuvent avoir le même numéro : seulement les commandes de ce client
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!order || order.user_id !== auth.user.id) {
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
      callback: `${origin}/paiement/retour`,
      customer: { name: auth.profile.email?.split('@')[0] || 'Client', email: auth.profile.email },
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
