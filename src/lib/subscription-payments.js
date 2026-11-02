import { checkoutStatus } from '@/lib/saspay'
import { extendPaidUntil } from '@/lib/subscription'

/**
 * Vérifie un paiement d'abonnement auprès de SasPay et, s'il est payé, active l'offre
 * (une seule fois, même si on vérifie plusieurs fois). `db` : client clé service.
 * Renvoie le statut du paiement : 'pending' | 'paid' | 'failed' | 'cancelled'.
 */
export async function settleSubscriptionPayment(db, payment) {
  if (payment.status !== 'pending' || !payment.provider_session_id) return payment.status

  const { status, transactionId } = await checkoutStatus(payment.provider_session_id)
  if (status === 'EXPIRED' || status === 'CANCELLED') {
    await db.from('subscription_payments').update({ status: 'cancelled' }).eq('id', payment.id).eq('status', 'pending')
    return 'cancelled'
  }
  if (status !== 'PAID') return 'pending'

  // Le paiement passe à « payé » une seule fois : c'est ce qui autorise l'activation
  const { data: claimed } = await db
    .from('subscription_payments')
    .update({ status: 'paid', paid_at: new Date().toISOString(), provider_transaction_id: transactionId })
    .eq('id', payment.id)
    .eq('status', 'pending')
    .select('id')
  if (!claimed?.length) return 'paid'

  await activateSubscription(db, payment.organization_id, payment.plan, payment.months)
  return 'paid'
}

/** Active (ou prolonge) l'offre d'un restaurant pour ce nombre de mois. */
export async function activateSubscription(db, organizationId, plan, months) {
  const { data: org } = await db.from('organizations').select('plan_status, paid_until').eq('id', organizationId).single()
  // Un essai en cours ne compte pas : la période payée commence maintenant
  const paidUntil = extendPaidUntil(org?.plan_status === 'active' ? org.paid_until : null, months)
  const { error } = await db
    .from('organizations')
    .update({ plan, plan_status: 'active', paid_until: paidUntil.toISOString() })
    .eq('id', organizationId)
  if (error) throw new Error(error.message)
  return paidUntil
}
