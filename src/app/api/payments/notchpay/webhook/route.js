import { NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/notchpay'
import { applyPaymentResult, findOrderByReferences } from '@/lib/payment-orders'

// Notch Pay prévient ici dès qu'un paiement change d'état.
// C'est la source de vérité : elle ne dépend pas du navigateur du client.
export async function POST(request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-notch-signature')

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('Webhook Notch Pay refusé : signature invalide')
    return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
  }

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Corps illisible' }, { status: 400 })
  }

  const event = payload.type || payload.event
  const data = payload.data || payload.transaction || {}

  const order = await findOrderByReferences([
    data.reference,
    data.merchant_reference,
    data.trxref,
    payload.reference,
  ])

  if (!order) {
    // On répond 200 : sans cela, Notch Pay réessaierait indéfiniment
    console.error('Webhook Notch Pay : aucune commande pour', event, data.reference)
    return NextResponse.json({ received: true })
  }

  const status = data.status || (event === 'payment.complete' ? 'complete' : event?.split('.')[1])
  await applyPaymentResult({ order, notchStatus: status, amount: data.amount })

  return NextResponse.json({ received: true })
}
