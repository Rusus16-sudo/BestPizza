import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { isPlatformAdmin } from '@/lib/platform'
import PlatformClient from './PlatformClient'

export const metadata = { title: 'Espace Tchopi' }

const thirtyDaysAgo = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

// tchopi.cm/tchopi : tous les restaurants, leur offre et leur abonnement. Réservé à Tchopi.
export default async function PlatformPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/tchopi')

  if (!(await isPlatformAdmin(user.id))) {
    return (
      <div style={{ padding: '64px 20px', textAlign: 'center', maxWidth: '420px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.6rem' }}>Espace réservé à Tchopi</h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: '8px 0 20px' }}>Ce compte n’administre pas la plateforme.</p>
        <Link href="/" className="btn btn-primary">Retour</Link>
      </div>
    )
  }

  const db = createAdminClient()
  const since = thirtyDaysAgo()
  const [{ data: orgs }, { data: locations }, { data: owners }, { data: orders }, { data: payments }] = await Promise.all([
    db.from('organizations').select('id, slug, name, plan, plan_status, trial_ends_at, paid_until, created_at').order('created_at', { ascending: false }),
    db.from('locations').select('organization_id'),
    db.from('memberships').select('organization_id, user_id').eq('role', 'proprietaire'),
    db.from('orders').select('organization_id').gte('created_at', since),
    db.from('subscription_payments').select('organization_id, amount').eq('status', 'paid').gte('paid_at', since),
  ])
  const { data: profiles } = owners?.length
    ? await db.from('profiles').select('id, email, phone').in('id', owners.map((o) => o.user_id))
    : { data: [] }

  const count = (rows, id) => (rows || []).filter((r) => r.organization_id === id).length
  const restaurants = (orgs || []).map((o) => {
    const owner = (owners || []).find((m) => m.organization_id === o.id)
    const profile = (profiles || []).find((p) => p.id === owner?.user_id)
    return {
      ...o,
      locations: count(locations, o.id),
      orders30: count(orders, o.id),
      ownerEmail: profile?.email || null,
      ownerPhone: profile?.phone || null,
    }
  })
  const revenue30 = (payments || []).reduce((sum, p) => sum + p.amount, 0)

  return <PlatformClient restaurants={restaurants} revenue30={revenue30} />
}
