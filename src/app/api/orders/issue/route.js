import { NextResponse } from 'next/server'
import { createAdminClient, requireStaff, MANAGER_ROLES } from '@/utils/supabase/admin'
import { sendPushToCustomer, sendPushToStaff } from '@/lib/push'
import { DELIVERY_ISSUES } from '@/lib/delivery-issues'

/**
 * Le livreur signale un problème sur SA livraison en cours (client injoignable, absent,
 * adresse introuvable). Le gérant du point de vente et le client sont prévenus.
 */
export async function POST(request) {
  const auth = await requireStaff(['livreur'])
  if (auth.response) return auth.response

  const { orderId, issue } = await request.json().catch(() => ({}))
  const problem = DELIVERY_ISSUES[issue]
  if (!orderId || !problem) return NextResponse.json({ error: 'Problème inconnu' }, { status: 400 })

  const db = createAdminClient()
  const { data: order } = await db
    .from('orders')
    .select('id, short_id, status, driver_id, user_id, organization_id, location_id, tracking_token')
    .eq('id', orderId)
    .maybeSingle()
  if (!order || order.driver_id !== auth.user.id || order.status !== 'en_route') {
    return NextResponse.json({ error: 'Ce n’est pas une de vos livraisons en cours.' }, { status: 403 })
  }

  const { error } = await db
    .from('orders')
    .update({ delivery_issue: issue, delivery_issue_at: new Date().toISOString() })
    .eq('id', order.id)
  if (error) {
    console.error('Problème de livraison:', error.message)
    return NextResponse.json({ error: "Le signalement n'a pas pu être enregistré." }, { status: 500 })
  }

  const { data: store } = await db.from('organizations').select('slug').eq('id', order.organization_id).maybeSingle()
  const title = `Commande ${order.short_id || ''}`.trim()
  await Promise.all([
    sendPushToStaff(
      { organizationId: order.organization_id, locationId: order.location_id, roles: MANAGER_ROLES },
      { title: `⚠️ ${title}`, body: `Le livreur signale : ${problem.staff}.`, url: '/admin/commandes', tag: `issue-${order.id}` },
    ),
    sendPushToCustomer(order, {
      title,
      body: `📞 ${problem.customer}`,
      url: store && order.tracking_token ? `/${store.slug}/suivi/${order.tracking_token}` : '/orders',
      tag: `order-${order.id}`,
    }),
  ])

  return NextResponse.json({ ok: true })
}
