import { NextResponse } from 'next/server'
import { fetchPayment, isNotchPayConfigured } from '@/lib/notchpay'
import { applyPaymentResult, findOrderByReferences } from '@/lib/payment-orders'
import { requireRole, MANAGER_ROLES } from '@/utils/supabase/admin'

// Vérification à la demande, utilisée par la page de retour du client :
// si le webhook est en retard, le client n'attend pas pour être fixé.
export async function GET(request) {
  const auth = await requireRole(null)
  if (auth.response) return auth.response

  if (!isNotchPayConfigured()) {
    return NextResponse.json({ error: 'Paiement en ligne non configuré' }, { status: 503 })
  }

  const reference = new URL(request.url).searchParams.get('reference')
  if (!reference) {
    return NextResponse.json({ error: 'Référence manquante' }, { status: 400 })
  }

  const order = await findOrderByReferences([reference])
  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  // Chacun ne consulte que ses propres commandes ; le gérant, toutes
  const isOwner = order.user_id === auth.user.id
  if (!isOwner && !MANAGER_ROLES.includes(auth.profile.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  try {
    const payment = await fetchPayment(order.payment_reference || reference)
    const result = await applyPaymentResult({
      order,
      notchStatus: payment.status,
      amount: payment.amount,
    })

    return NextResponse.json({
      shortId: order.short_id,
      paymentStatus: result.paymentStatus,
      orderStatus: result.status,
      amount: order.total_amount,
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
