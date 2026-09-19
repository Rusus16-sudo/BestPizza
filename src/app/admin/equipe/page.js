import AdminClient from '../AdminClient'
import { createAdminClient } from '@/utils/supabase/admin'

export const metadata = { title: 'Équipe · Best Pizza' }

export default async function AdminStaffPage() {
  // Le layout /admin a déjà vérifié le rôle gérant ; la clé service_role lit tout le personnel
  const { data: staff } = await createAdminClient()
    .from('profiles')
    .select('id, email, role, is_active, created_at')
    .in('role', ['cuisinier', 'livreur'])
    .order('created_at', { ascending: false })

  return <AdminClient section="staff" initialStaff={staff || []} />
}
