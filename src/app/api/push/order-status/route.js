import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { sendPushToUser } from '@/lib/push'
import { ORDER_STATUS_MESSAGES } from '@/lib/order-status-messages'

// Webhook de base de données Supabase : appelé à chaque mise à jour d'une commande,
// quel que soit l'écran qui l'a faite (cuisine, livreur, gérant, paiement).
// Il prévient le client sur ses appareils, même app fermée.
function isAuthorized(request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET
  const received = request.headers.get('x-webhook-secret')
  if (!secret || !received) return false

  const a = Buffer.from(received, 'utf8')
  const b = Buffer.from(secret, 'utf8')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    console.error('Webhook push refusé : secret invalide')
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let payload
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps illisible' }, { status: 400 })
  }

  const order = payload.record
  const previous = payload.old_record

  // Seul un changement de statut intéresse le client
  if (payload.type !== 'UPDATE' || !order || order.status === previous?.status) {
    return NextResponse.json({ skipped: true })
  }

  const message = ORDER_STATUS_MESSAGES[order.status]
  if (!message) return NextResponse.json({ skipped: true })

  const { sent } = await sendPushToUser(order.user_id, {
    title: `Commande ${order.short_id || ''}`.trim(),
    body: `${message.icon} ${message.text}`,
    url: '/orders',
    // Une seule notification par commande : chaque étape remplace la précédente
    tag: `order-${order.id}`,
  })

  return NextResponse.json({ sent })
}
