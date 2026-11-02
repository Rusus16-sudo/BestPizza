import { NextResponse } from 'next/server'
import { createAdminClient, requireUser } from '@/utils/supabase/admin'
import { isPlatformAdmin } from '@/lib/platform'
import { PLAN_NAMES, subscriptionPrice } from '@/lib/plans'
import { activateSubscription } from '@/lib/subscription-payments'

const DAY = 24 * 60 * 60 * 1000

/**
 * Tchopi agit sur un restaurant : activer une offre payée à la main (1 ou 12 mois),
 * prolonger l'essai, changer d'offre, suspendre ou réactiver.
 */
export async function POST(request, { params }) {
  const auth = await requireUser()
  if (auth.response) return auth.response
  if (!(await isPlatformAdmin(auth.user.id))) return NextResponse.json({ error: 'Réservé à Tchopi' }, { status: 403 })

  const { id } = await params
  const { action, plan, months, days } = await request.json().catch(() => ({}))
  const db = createAdminClient()
  const { data: org } = await db.from('organizations').select('id, plan, plan_status, trial_ends_at, paid_until').eq('id', id).maybeSingle()
  if (!org) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })

  let patch = null
  switch (action) {
    case 'activate': {
      if (!PLAN_NAMES[plan] || ![1, 12].includes(months)) return NextResponse.json({ error: 'Offre ou durée invalide' }, { status: 400 })
      const { count } = await db.from('locations').select('*', { count: 'exact', head: true }).eq('organization_id', id)
      const paidUntil = await activateSubscription(db, id, plan, months)
      // Gardé dans l'historique des paiements du restaurant, comme payé à la main
      await db.from('subscription_payments').insert({
        organization_id: id, plan, months, amount: subscriptionPrice(plan, months, count || 1),
        status: 'paid', provider: 'manuel', created_by: auth.user.id, paid_at: new Date().toISOString(),
      })
      return NextResponse.json({ ok: true, paidUntil })
    }
    case 'extend_trial': {
      const n = Math.min(Math.max(parseInt(days, 10) || 0, 1), 60)
      const from = Math.max(Date.now(), org.trial_ends_at ? new Date(org.trial_ends_at).getTime() : 0)
      patch = { plan_status: 'trial', trial_ends_at: new Date(from + n * DAY).toISOString() }
      break
    }
    case 'set_plan':
      if (!PLAN_NAMES[plan]) return NextResponse.json({ error: 'Offre invalide' }, { status: 400 })
      patch = { plan }
      break
    case 'suspend':
      patch = { plan_status: 'suspended' }
      break
    case 'resume':
      patch = { plan_status: org.paid_until ? 'active' : 'trial' }
      break
    default:
      return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  }

  const { error } = await db.from('organizations').update(patch).eq('id', id)
  if (error) {
    console.error('Espace Tchopi:', error.message)
    return NextResponse.json({ error: "Le changement n'a pas pu être enregistré." }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
