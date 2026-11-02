import { NextResponse } from 'next/server'
import { createAdminClient, requireStaff, MANAGER_ROLES } from '@/utils/supabase/admin'
import { settleSubscriptionPayment } from '@/lib/subscription-payments'
import { isSasPayConfigured } from '@/lib/saspay'

/**
 * Au retour de la page de paiement (ou à la demande du gérant) : SasPay confirme-t-il
 * le paiement ? Si oui, l'offre est activée. Le navigateur n'est jamais cru sur parole.
 */
export async function POST(request) {
  const auth = await requireStaff(MANAGER_ROLES)
  if (auth.response) return auth.response

  const { paymentId } = await request.json().catch(() => ({}))
  const db = createAdminClient()
  const { data: payment } = await db
    .from('subscription_payments')
    .select('id, organization_id, plan, months, status, provider_session_id')
    .eq('id', paymentId || '00000000-0000-0000-0000-000000000000')
    .eq('organization_id', auth.membership.organization_id)
    .maybeSingle()
  if (!payment) return NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 })
  if (payment.status !== 'pending' || !isSasPayConfigured()) return NextResponse.json({ status: payment.status })

  try {
    return NextResponse.json({ status: await settleSubscriptionPayment(db, payment) })
  } catch (err) {
    console.error('Vérification du paiement SasPay:', err.message)
    return NextResponse.json({ status: 'pending', error: 'SasPay ne répond pas pour le moment. Réessayez dans un instant.' })
  }
}
