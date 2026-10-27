import { createAdminClient } from '@/utils/supabase/admin'

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
      id, short_id, order_number, status, payment_status, payment_method, total_amount,
      created_at, customer_name, user_id, organization_id,
      order_items ( product_name, quantity, price, size )
    `)
    .eq('tracking_token', token)
    .maybeSingle()
  if (!order) return null

  const { data: restaurant } = await db
    .from('organizations')
    .select('slug, name')
    .eq('id', order.organization_id)
    .maybeSingle()

  return {
    id: order.id,
    shortId: order.short_id,
    number: order.order_number,
    status: order.status,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
    total: order.total_amount,
    createdAt: order.created_at,
    customerName: order.customer_name,
    hasAccount: Boolean(order.user_id),
    restaurant: restaurant || null,
    items: (order.order_items || []).map((i) => ({
      name: i.product_name,
      quantity: i.quantity,
      price: i.price,
      size: i.size,
    })),
  }
}
