import AdminClient from '../AdminClient'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { getStaffMembership, STAFF_ROLES } from '@/lib/staff'

export const metadata = { title: 'Équipe · Tchopi' }

export default async function AdminStaffPage() {
  // Le layout /admin a déjà vérifié que c'est un gérant ; on ne montre que SON équipe
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const db = createAdminClient()
  const membership = await getStaffMembership(db, user?.id)

  const { data: members } = membership
    ? await db
      .from('memberships')
      .select('user_id, role, is_active, created_at')
      .eq('organization_id', membership.organization_id)
      .in('role', STAFF_ROLES)
      .order('created_at', { ascending: false })
    : { data: [] }

  const { data: profiles } = members?.length
    ? await db.from('profiles').select('id, email').in('id', members.map((m) => m.user_id))
    : { data: [] }
  const emailOf = new Map((profiles || []).map((p) => [p.id, p.email]))

  const staff = (members || []).map((m) => ({
    id: m.user_id,
    email: emailOf.get(m.user_id) || '',
    role: m.role,
    is_active: m.is_active,
    created_at: m.created_at,
  }))

  return <AdminClient section="staff" initialStaff={staff} />
}
