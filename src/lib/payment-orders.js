import { createAdminClient } from '@/utils/supabase/admin'
import { mapPaymentStatus } from '@/lib/notchpay'

/**
 * Applique l'état d'un paiement à une commande.
 * Appelé aussi bien par le webhook Notch Pay que par le retour du client :
 * les deux chemins peuvent arriver, dans n'importe quel ordre, sans dégât.
 */
export async function applyPaymentResult({ order, notchStatus, amount }) {
  const db = createAdminClient()
  const paymentStatus = mapPaymentStatus(notchStatus)

  // Déjà traité : on ne refait rien
  if (order.payment_status === paymentStatus && paymentStatus !== 'en_attente') {
    return { changed: false, paymentStatus, status: order.status }
  }

  const patch = { payment_status: paymentStatus }
  let status = order.status

  if (paymentStatus === 'paye') {
    // Le montant annoncé doit correspondre à la commande
    if (amount != null && Math.round(Number(amount)) !== Math.round(Number(order.total_amount))) {
      console.error(`Montant payé (${amount}) différent de la commande ${order.short_id} (${order.total_amount})`)
      return { changed: false, paymentStatus: order.payment_status, status, mismatch: true }
    }
    patch.paid_at = new Date().toISOString()
    // La commande part en cuisine maintenant, et pas avant
    if (order.status === 'paiement') status = 'en_attente'
  } else if (paymentStatus === 'annule' && order.status === 'paiement') {
    status = 'annule'
  }

  patch.status = status

  const { error } = await db.from('orders').update(patch).eq('id', order.id)
  if (error) {
    console.error('Mise à jour du paiement:', error.message)
    return { changed: false, paymentStatus: order.payment_status, status: order.status, error: error.message }
  }

  return { changed: true, paymentStatus, status }
}

/** Retrouve une commande à partir des références connues de Notch Pay. */
export async function findOrderByReferences(references) {
  const db = createAdminClient()
  const clean = [...new Set(references.filter(Boolean).map(String))]
  if (clean.length === 0) return null

  const { data } = await db
    .from('orders')
    .select('id, short_id, status, total_amount, payment_status, payment_reference, user_id')
    .or(clean.map((r) => `payment_reference.eq.${r},short_id.eq.${r}`).join(','))
    .limit(1)

  return data?.[0] || null
}
