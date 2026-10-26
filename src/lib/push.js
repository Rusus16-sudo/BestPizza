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
 * Envoie une notification sur tous les appareils d'un client.
 * Les appareils que le service de push ne connaît plus sont oubliés.
 */
export async function sendPushToUser(userId, { title, body, url = '/orders', tag }) {
  if (!isPushConfigured() || !userId) return { sent: 0 }
  configure()

  const db = createAdminClient()
  const { data: subscriptions, error } = await db
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error) {
    console.error('Lecture des abonnements push:', error.message)
    return { sent: 0 }
  }
  if (!subscriptions?.length) return { sent: 0 }

  const payload = JSON.stringify({ title, body, url, tag })
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
