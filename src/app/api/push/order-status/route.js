import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { sendPushToUser, sendPushToStaff } from '@/lib/push'
import { orderNotifications } from '@/lib/order-notifications'

// Webhook de base de données Supabase : appelé à chaque création ou mise à jour
// d'une commande, quel que soit l'écran qui l'a faite (cuisine, livreur, gérant, paiement).
// Il prévient le client et le personnel concerné sur leurs appareils, même app fermée.
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

  const { type, record: order } = payload
  const previousStatus = type === 'UPDATE' ? payload.old_record?.status : null

  // Seuls une nouvelle commande ou un changement de statut intéressent quelqu'un
  if ((type !== 'INSERT' && type !== 'UPDATE') || !order || order.status === previousStatus) {
    return NextResponse.json({ skipped: true })
  }

  // Le personnel prévenu est toujours celui du point de vente de la commande
  const staffOf = { organizationId: order.organization_id, locationId: order.location_id }
  const results = await Promise.all(
    orderNotifications(type, order, previousStatus).map((t) => (t.userId
      ? sendPushToUser(t.userId, t.notification)
      : sendPushToStaff({ ...staffOf, roles: t.roles }, t.notification, { exceptUserId: t.exceptUserId })))
  )

  return NextResponse.json({ sent: results.reduce((n, r) => n + r.sent, 0) })
}
