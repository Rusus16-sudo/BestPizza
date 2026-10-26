// Service worker de Best Pizza : affiche les notifications push,
// même quand l'application est fermée.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data && event.data.text() }
  }

  const title = data.title || 'Best Pizza'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: data.tag,
      // La nouvelle étape d'une commande refait vibrer le téléphone
      renotify: Boolean(data.tag),
      vibrate: [100, 50, 100],
      data: { url: data.url || '/orders' },
    })
  )
})

// Toucher la notification ouvre l'espace qu'elle concerne (data.url),
// en réutilisant l'app si elle est déjà ouverte.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/orders', self.location.origin).href

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const client = windows.find((c) => new URL(c.url).origin === self.location.origin)

    if (!client) {
      await self.clients.openWindow(url)
      return
    }

    await client.focus()
    if (client.url === url) return
    try {
      // Possible seulement si la page est déjà pilotée par ce service worker
      await client.navigate(url)
    } catch {
      // Sinon, c'est l'app elle-même qui change de page (GlobalNotifications)
      client.postMessage({ type: 'open-url', url })
    }
  })())
})
