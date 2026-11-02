import { createAdminClient } from '@/utils/supabase/admin'
import { DELIVERY_ISSUES } from '@/lib/delivery-issues'
import { hasFeature } from '@/lib/plans'

// Le jeton du lien de suivi : 32 caractères hexadécimaux (voir la migration 2.2)
export const TRACKING_TOKEN = /^[0-9a-f]{32}$/

/**
 * Une commande vue depuis son lien de suivi secret, côté serveur.
 * Ne renvoie que ce que le client a besoin de voir : ni son adresse,
 * ni son téléphone, ni les identifiants internes du personnel.
 */
export async function getTrackedOrder(token) {
  if (!TRACKING_TOKEN.test(String(token || ''))) return null

  const db = createAdminClient()
  const { data: order } = await db
    .from('orders')
    .select(`
      id, short_id, order_number, status, payment_status, payment_method, total_amount, delivery_fee, delivery_zone,
      created_at, accepted_at, ready_at, picked_at, delivered_at, cancelled_at,
      customer_name, user_id, organization_id, location_id, driver_id, delivery_lat, delivery_lng, delivery_issue,
      order_items ( product_name, quantity, price, size, options )
    `)
    .eq('tracking_token', token)
    .maybeSingle()
  if (!order) return null

  // L'offre du restaurant décide de ce que montre le suivi
  const { data: restaurant } = await db.from('organizations').select('slug, name, plan').eq('id', order.organization_id).maybeSingle()
  const restaurantPlan = restaurant?.plan
  const [{ data: location }, { data: driver }, { data: position }] = await Promise.all([
    // Le numéro à appeler : celui du point de vente qui prépare et livre
    order.location_id ? db.from('locations').select('name, phone').eq('id', order.location_id).maybeSingle() : { data: null },
    // Le livreur, par son prénom seulement
    order.driver_id ? db.from('profiles').select('first_name').eq('id', order.driver_id).maybeSingle() : { data: null },
    // Sa dernière position, pendant qu'il livre (le suivi sur la carte est inclus à partir de Pro)
    order.status === 'en_route' && hasFeature(restaurantPlan, 'liveMap') ? db.from('driver_positions').select('lat, lng, updated_at').eq('order_id', order.id).maybeSingle() : { data: null },
  ])

  return {
    id: order.id,
    shortId: order.short_id,
    number: order.order_number,
    status: order.status,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
    total: order.total_amount,
    deliveryFee: Number(order.delivery_fee) || 0,
    deliveryZone: order.delivery_zone,
    createdAt: order.created_at,
    acceptedAt: order.accepted_at,
    readyAt: order.ready_at,
    pickedAt: order.picked_at,
    deliveredAt: order.delivered_at,
    cancelledAt: order.cancelled_at,
    // Le problème signalé par le livreur, tel qu'on le dit au client
    issue: DELIVERY_ISSUES[order.delivery_issue]?.customer || null,
    restaurantPhone: location?.phone || null,
    locationName: location?.name || null,
    driverName: driver?.first_name || null,
    driver: position ? { lat: position.lat, lng: position.lng, at: position.updated_at } : null,
    destination: order.delivery_lat != null && order.delivery_lng != null ? { lat: order.delivery_lat, lng: order.delivery_lng } : null,
    customerName: order.customer_name,
    hasAccount: Boolean(order.user_id),
    restaurant: restaurant ? { slug: restaurant.slug, name: restaurant.name } : null,
    // Ce que l'offre du restaurant inclut sur la page de suivi
    features: { liveMap: hasFeature(restaurantPlan, 'liveMap'), reviews: hasFeature(restaurantPlan, 'reviews') },
    items: (order.order_items || []).map((i) => ({
      name: i.product_name,
      quantity: i.quantity,
      price: i.price,
      size: i.size,
      extras: (i.options || []).filter((o) => !o.single).map((o) => o.label),
    })),
  }
}
