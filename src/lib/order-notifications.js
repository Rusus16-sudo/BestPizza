import { ORDER_STATUS_MESSAGES } from '@/lib/order-status-messages'
import { parseAddress, isCash } from '@/lib/delivery-address'
import { formatPrice } from '@/lib/format'

// Qui prévenir, et de quoi, quand une commande est créée ou change de statut.
// Chaque cible est soit le client de la commande ({ customer }), soit un compte ({ userId }),
// soit des rôles ({ roles, exceptUserId }).
// Le `tag` regroupe les notifications d'une même commande : la suivante remplace la précédente.
const KITCHEN = ['cuisinier']
const DRIVERS = ['livreur']

/**
 * `customerUrl` : la page de suivi de la commande, où mène la notification du client.
 */
export function orderNotifications(type, order, previousStatus, { customerUrl = '/orders' } = {}) {
  const targets = []
  const title = `Commande ${order.short_id || ''}`.trim()
  const { status } = order

  // Le client suit sa commande (à la création, il est déjà devant l'écran) : les appareils
  // de son compte, ou, sans compte, ceux abonnés depuis son lien de suivi
  const message = ORDER_STATUS_MESSAGES[status]
  if (type === 'UPDATE' && message) {
    targets.push({
      customer: true,
      notification: { title, body: `${message.icon} ${message.text}`, url: customerUrl, tag: `order-${order.id}` },
    })
  }

  // Cuisine : une commande arrive (en espèces dès sa création, en Mobile Money une fois payée)
  const kitchen = { url: '/kitchen', tag: `kitchen-${order.id}` }
  if (status === 'en_attente') {
    targets.push({
      roles: KITCHEN,
      notification: { ...kitchen, title: `Nouvelle commande ${order.short_id || ''}`.trim(), body: '🔔 Une nouvelle commande attend en cuisine.' },
    })
  }
  if (status === 'annule' && (previousStatus === 'en_attente' || previousStatus === 'en_preparation')) {
    targets.push({
      roles: KITCHEN,
      notification: { ...kitchen, title, body: '❌ Commande annulée : ne la préparez pas.' },
    })
  }

  // Livreurs
  const delivery = { url: '/delivery', tag: `delivery-${order.id}` }
  if (status === 'prete') {
    const { quartier, payment } = parseAddress(order.delivery_address)
    const cash = order.payment_status !== 'paye' && isCash(payment)
    targets.push({
      roles: DRIVERS,
      notification: {
        ...delivery,
        title: `Prête à livrer : ${order.short_id || ''}`.trim(),
        body: `🍕 ${quartier} · ${cash ? `${formatPrice(order.total_amount)} à encaisser` : 'Déjà payée'}`,
      },
    })
  }
  if (status === 'en_route' && previousStatus === 'prete') {
    // Les autres livreurs n'ont plus à se déplacer : leur notification est remplacée, sans sonner
    targets.push({
      roles: DRIVERS,
      exceptUserId: order.driver_id,
      notification: { ...delivery, title, body: '✅ Prise en charge par un autre livreur.', silent: true },
    })
  }
  if (status === 'annule' && previousStatus === 'prete') {
    targets.push({
      roles: DRIVERS,
      notification: { ...delivery, title, body: '❌ Commande annulée : elle n’est plus à livrer.' },
    })
  }
  if (status === 'annule' && previousStatus === 'en_route' && order.driver_id) {
    targets.push({
      userId: order.driver_id,
      notification: { ...delivery, title, body: '❌ Commande annulée : ne la livrez pas.' },
    })
  }

  return targets
}
