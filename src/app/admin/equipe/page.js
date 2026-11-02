import AdminClient from '../AdminClient'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { getStaffMembership } from '@/lib/staff'
import { isOrgManager, managesMember } from '@/lib/team'

export const metadata = { title: 'Équipe · Tchopi' }

export default async function AdminStaffPage() {
  // Le layout /admin a déjà vérifié que c'est un gérant ; on ne montre que SON équipe
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const db = createAdminClient()
  const membership = await getStaffMembership(db, user?.id)
  if (!membership) return <AdminClient section="staff" initialStaff={[]} />

  const [{ data: members }, { data: locations }, { data: org }] = await Promise.all([
    db.from('memberships')
      .select('user_id, organization_id, location_id, role, is_active, created_at')
      .eq('organization_id', membership.organization_id)
      .order('created_at', { ascending: false }),
    db.from('locations').select('id, name').eq('organization_id', membership.organization_id).order('created_at'),
    db.from('organizations').select('plan').eq('id', membership.organization_id).single(),
  ])
  // Le cuisinier, le livreur, et le responsable d'un point de vente, s'il les gère
  const team = (members || []).filter((m) => managesMember(membership, m))

  const { data: profiles } = team.length
    ? await db.from('profiles').select('id, email').in('id', team.map((m) => m.user_id))
    : { data: [] }
  const emailOf = new Map((profiles || []).map((p) => [p.id, p.email]))

  const staff = team.map((m) => ({
    id: m.user_id,
    email: emailOf.get(m.user_id) || '',
    role: m.role,
    location_id: m.location_id,
    is_active: m.is_active,
    created_at: m.created_at,
  }))

  return (
    <AdminClient
      section="staff"
      initialStaff={staff}
      team={{
        locations: locations || [],
        // Le gérant du restaurant choisit l'adresse ; un responsable ajoute à la sienne
        canChooseLocation: isOrgManager(membership) && (locations || []).length > 1,
        canAddManager: isOrgManager(membership) && org?.plan === 'business' && (locations || []).length > 1,
      }}
    />
  )
}
