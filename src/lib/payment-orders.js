import { createAdminClient } from '@/utils/supabase/admin'
import { mapPaymentStatus } from '@/lib/notchpay'
import { sendPushToStaff } from '@/lib/push'
import { formatPrice } from '@/lib/format'

/**
 * Applique l'état d'un paiement à une commande.
 * Appelé aussi bien par le webhook Notch Pay que par le retour du client :
 * les deux chemins peuvent arriver, dans n'importe quel ordre, sans dégât.
 */
export async function applyPaymentResult({ order, notchStatus, amount }) {
  const db = createAdminClient()
  const paymentStatus = mapPaymentStatus(notchStatus)

  // Une commande payée le reste : aucune réponse tardive ne la fait reculer
  if (order.payment_status === 'paye') {
    return { changed: false, paymentStatus: 'paye', status: order.status }
  }

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
      // Les gérants de l'établissement doivent le savoir : la commande reste bloquée tant que personne ne vérifie
      await sendPushToStaff({
        organizationId: order.organization_id,
        locationId: order.location_id,
        roles: ['proprietaire', 'gerant'],
      }, {
        title: `Paiement anormal : ${order.short_id}`,
        body: `⚠️ Payé ${formatPrice(amount)} au lieu de ${formatPrice(order.total_amount)}. La commande n’est pas partie en cuisine.`,
        url: '/admin/commandes',
        tag: `payment-${order.id}`,
      }).catch((err) => console.error('Alerte paiement anormal:', err.message))
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Retrouve une commande à partir des références connues de Notch Pay :
 * la référence du paiement, ou l'identifiant de la commande, que nous lui
 * donnons comme référence. Jamais le numéro court : deux restaurants
 * peuvent avoir le même.
 */
export async function findOrderByReferences(references) {
  const db = createAdminClient()
  // Uniquement des caractères sûrs : ces valeurs entrent dans un filtre de requête
  const clean = [...new Set(references.filter(Boolean).map(String))].filter((r) => /^[A-Za-z0-9_.-]{1,100}$/.test(r))
  if (clean.length === 0) return null

  const filters = clean.flatMap((r) => [`payment_reference.eq.${r}`, ...(UUID.test(r) ? [`id.eq.${r}`] : [])])
  const { data } = await db
    .from('orders')
    .select('id, short_id, status, total_amount, payment_status, payment_reference, user_id, organization_id, location_id, tracking_token')
    .or(filters.join(','))
    .limit(1)

  return data?.[0] || null
}
