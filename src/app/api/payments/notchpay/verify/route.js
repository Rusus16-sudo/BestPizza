import { NextResponse } from 'next/server'
import { fetchPayment, isNotchPayConfigured } from '@/lib/notchpay'
import { applyPaymentResult, findOrderByReferences } from '@/lib/payment-orders'
import { createAdminClient, requireUser, MANAGER_ROLES } from '@/utils/supabase/admin'

// Vérification à la demande, utilisée par la page de retour du client :
// si le webhook est en retard, le client n'attend pas pour être fixé.
export async function GET(request) {
  const auth = await requireUser()
  if (auth.response && auth.response.status !== 401) return auth.response
  const user = auth.response ? null : auth.user

  if (!isNotchPayConfigured()) {
    return NextResponse.json({ error: 'Paiement en ligne non configuré' }, { status: 503 })
  }

  const params = new URL(request.url).searchParams
  const reference = params.get('reference')
  // Le lien de suivi, revenu avec le client : la preuve d'un client sans compte
  const trackingToken = params.get('suivi')
  if (!reference) {
    return NextResponse.json({ error: 'Référence manquante' }, { status: 400 })
  }

  const order = await findOrderByReferences([reference])
  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  // Chacun ne consulte que ses propres commandes ; le gérant, celles de son établissement
  const isOwner = (user && order.user_id === user.id) || (trackingToken && trackingToken === order.tracking_token)
  const { data: manager } = isOwner || !user ? { data: null } : await createAdminClient()
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .eq('organization_id', order.organization_id)
    .eq('is_active', true)
    .in('role', MANAGER_ROLES)
    .maybeSingle()
  if (!isOwner && !manager) {
    if (!user) return NextResponse.json({ error: 'Connexion requise' }, { status: 401 })
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  try {
    const payment = await fetchPayment(order.payment_reference || reference)
    const result = await applyPaymentResult({
      order,
      notchStatus: payment.status,
      amount: payment.amount,
    })

    // Le client retrouve sa commande sur sa page de suivi, compte ou pas
    const { data: store } = await createAdminClient()
      .from('organizations').select('slug').eq('id', order.organization_id).maybeSingle()

    return NextResponse.json({
      shortId: order.short_id,
      paymentStatus: result.paymentStatus,
      orderStatus: result.status,
      amount: order.total_amount,
      trackingUrl: isOwner && store ? `/${store.slug}/suivi/${order.tracking_token}` : null,
    })
  } catch (error) {
    console.error('Vérification Notch Pay:', error.message)
    return NextResponse.json({
      shortId: order.short_id,
      paymentStatus: order.payment_status,
      orderStatus: order.status,
      amount: order.total_amount,
      pending: true,
    })
  }
}
