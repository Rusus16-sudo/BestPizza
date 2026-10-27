import webpush from 'web-push'
import { createAdminClient } from '@/utils/supabase/admin'

// Envoi des notifications push, côté serveur uniquement.
// La clé privée VAPID ne quitte jamais le serveur.
let configured = false

export function isPushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

function configure() {
  if (configured) return
  // Les services de push (Google, Apple, Mozilla) exigent un contact : mailto ou https
  const subject = process.env.VAPID_SUBJECT
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'mailto:contact@example.com')
  webpush.setVapidDetails(subject, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
  configured = true
}

/**
 * Envoie une notification sur tous les appareils de ces comptes.
 * Les appareils que le service de push ne connaît plus sont oubliés.
 * `silent` : remplace une notification (même `tag`) sans faire sonner ni vibrer.
 */
export async function sendPushToUsers(userIds, notification) {
  const ids = [...new Set((userIds || []).filter(Boolean))]
  if (!isPushConfigured() || ids.length === 0) return { sent: 0 }
  return deliver((q) => q.in('user_id', ids), notification)
}

/**
 * Prévient le client d'une commande : les appareils de son compte, et ceux abonnés
 * à cette commande depuis son lien de suivi (client sans compte). Un appareil lié
 * aux deux ne reçoit la notification qu'une fois.
 */
export function sendPushToCustomer(order, notification) {
  if (!isPushConfigured() || !order?.id) return { sent: 0 }
  const filter = order.user_id ? `user_id.eq.${order.user_id},order_id.eq.${order.id}` : `order_id.eq.${order.id}`
  return deliver((q) => q.or(filter), notification)
}

async function deliver(where, { title, body, url = '/orders', tag, silent = false }) {
  configure()
  const db = createAdminClient()
  const { data: rows, error } = await where(db.from('push_subscriptions').select('id, endpoint, p256dh, auth'))

  if (error) {
    console.error('Lecture des abonnements push:', error.message)
    return { sent: 0 }
  }
  const subscriptions = [...new Map((rows || []).map((s) => [s.endpoint, s])).values()]
  if (!subscriptions.length) return { sent: 0 }

  const payload = JSON.stringify({ title, body, url, tag, silent })
  const expired = []
  let sent = 0

  await Promise.all(subscriptions.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 60 * 60, urgency: 'high' }
      )
      sent++
    } catch (err) {
      // 404 / 410 : l'abonnement n'existe plus (permission retirée, app désinstallée…)
      if (err.statusCode === 404 || err.statusCode === 410) expired.push(s.id)
      else console.error('Envoi push:', err.statusCode, err.body || err.message)
    }
  }))

  if (expired.length) {
    await db.from('push_subscriptions').delete().in('id', expired)
  }

  return { sent }
}

export function sendPushToUser(userId, notification) {
  return sendPushToUsers([userId], notification)
}

/**
 * Prévient l'équipe active d'un établissement ayant l'un de ces rôles (cuisine, livreurs, gérants…).
 * Avec `locationId`, seulement ceux de ce point de vente, plus ceux qui travaillent
 * pour toute l'enseigne. Jamais le personnel d'un autre établissement.
 */
export async function sendPushToStaff({ organizationId, locationId, roles }, notification, { exceptUserId } = {}) {
  if (!isPushConfigured() || !organizationId) return { sent: 0 }

  const db = createAdminClient()
  const { data: members, error } = await db
    .from('memberships')
    .select('user_id, location_id')
    .eq('organization_id', organizationId)
    .in('role', roles)
    .eq('is_active', true)

  if (error) {
    console.error('Lecture du personnel à prévenir:', error.message)
    return { sent: 0 }
  }

  const ids = members
    .filter((m) => !locationId || !m.location_id || m.location_id === locationId)
    .map((m) => m.user_id)
    .filter((id) => id !== exceptUserId)
  return sendPushToUsers(ids, notification)
}
