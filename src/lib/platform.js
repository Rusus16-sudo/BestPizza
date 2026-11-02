import { createAdminClient } from '@/utils/supabase/admin'

/** Ce compte administre-t-il Tchopi (tous les restaurants) ? Côté serveur. */
export async function isPlatformAdmin(userId) {
  if (!userId) return false
  const { data } = await createAdminClient().from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle()
  return Boolean(data)
}
