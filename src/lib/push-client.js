// Notifications push, côté navigateur : abonner l'appareil, le désabonner,
// et le garder lié au compte connecté.

const OPT_OUT_KEY = 'push_order_updates_off'

function readOptOut() {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === '1'
  } catch {
    return false
  }
}

function writeOptOut(off) {
  try {
    if (off) localStorage.setItem(OPT_OUT_KEY, '1')
    else localStorage.removeItem(OPT_OUT_KEY)
  } catch {}
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export function isPushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
    && Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
}

// Sur iPhone, le push n'existe que dans l'app ajoutée à l'écran d'accueil
export function needsInstallForPush() {
  if (typeof window === 'undefined') return false
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
  return isIOS && !isStandalone
}

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null
  return navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
}

/** 'unsupported' | 'ios-install' | 'denied' | 'enabled' | 'disabled' */
export async function getPushState() {
  if (needsInstallForPush()) return 'ios-install'
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted' || readOptOut()) return 'disabled'

  // Permission déjà donnée : juste après une reconnexion, l'appareil est en train
  // d'être réabonné (syncPush). On attend la fin avant de répondre « pas activé ».
  if (!(await currentSubscription())) await syncPush()
  return (await currentSubscription()) ? 'enabled' : 'disabled'
}

async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration('/')
  return registration?.pushManager.getSubscription()
}

async function subscribeDevice() {
  const registration = (await navigator.serviceWorker.getRegistration('/')) || (await registerServiceWorker())
  await navigator.serviceWorker.ready
  const options = {
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
  }

  let subscription
  try {
    subscription = await registration.pushManager.subscribe(options)
  } catch (err) {
    // Abonnement créé avec une autre clé : on le remplace
    const existing = await registration.pushManager.getSubscription()
    if (!existing) throw err
    await existing.unsubscribe()
    subscription = await registration.pushManager.subscribe(options)
  }

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  })
  if (!res.ok) throw new Error("L'appareil n'a pas pu être enregistré")
}

/** À appeler depuis un clic : le navigateur demande alors la permission. */
export async function enablePush() {
  if (!isPushSupported()) return getPushState()

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return getPushState()

  writeOptOut(false)
  await subscribeDevice()
  return 'enabled'
}

export async function disablePush() {
  writeOptOut(true)
  await forgetDevice()
  return 'disabled'
}

/**
 * Compte connecté qui a déjà accepté les notifications : on s'assure que
 * l'appareil est abonné et lié à ce compte (après une reconnexion ou un changement de compte).
 * Les appels simultanés (app + encart) partagent le même abonnement en cours.
 */
let pendingSync = null

export function syncPush() {
  if (!isPushSupported() || Notification.permission !== 'granted' || readOptOut()) return Promise.resolve()
  if (!pendingSync) {
    pendingSync = subscribeDevice()
      .catch((err) => console.error('Abonnement push:', err.message))
      .finally(() => { pendingSync = null })
  }
  return pendingSync
}

/** Envoie une notification de test sur les appareils du compte connecté. */
export async function sendTestPush(url) {
  const res = await fetch('/api/push/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "La notification de test n'a pas pu partir")
  return data
}

/** Déconnexion ou refus : l'appareil ne reçoit plus rien pour ce compte. */
export async function forgetDevice() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return

  // keepalive : la requête part même si la page change juste après
  fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
    keepalive: true,
  }).catch(() => {})
  await subscription.unsubscribe()
}
