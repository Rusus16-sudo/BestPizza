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
export async function sendPushToUsers(userIds, { title, body, url = '/orders', tag, silent = false }) {
  const ids = [...new Set((userIds || []).filter(Boolean))]
  if (!isPushConfigured() || ids.length === 0) return { sent: 0 }
  configure()

  const db = createAdminClient()
  const { data: subscriptions, error } = await db
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', ids)

  if (error) {
    console.error('Lecture des abonnements push:', error.message)
    return { sent: 0 }
  }
  if (!subscriptions?.length) return { sent: 0 }

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

/** Prévient tout le personnel actif ayant l'un de ces rôles (cuisine, livreurs, gérants…). */
export async function sendPushToRoles(roles, notification, { exceptUserId } = {}) {
  if (!isPushConfigured()) return { sent: 0 }

  const db = createAdminClient()
  const { data: staff, error } = await db
    .from('profiles')
    .select('id')
    .in('role', roles)
    .not('is_active', 'is', false)

  if (error) {
    console.error('Lecture du personnel à prévenir:', error.message)
    return { sent: 0 }
  }

  return sendPushToUsers(staff.map((p) => p.id).filter((id) => id !== exceptUserId), notification)
}
