import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getStaffMembership, screenRole, HOME_BY_ROLE } from '@/lib/staff'
import { DEFAULT_STOREFRONT, LAST_STOREFRONT_COOKIE } from '@/lib/storefront-paths'

// tchopi.cm : chacun est envoyé où il doit être. En attendant la page d'accueil
// de Tchopi (phase 6), un client revient sur le dernier restaurant visité.
export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // La cuisine et les livreurs vont directement à leur écran de travail
    const role = screenRole(await getStaffMembership(supabase, user.id))
    if (role === 'livreur' || role === 'cuisinier') redirect(HOME_BY_ROLE[role])
  }

  const last = (await cookies()).get(LAST_STOREFRONT_COOKIE)?.value
  redirect(`/${/^[a-z0-9]+(-[a-z0-9]+)*$/.test(last || '') ? last : DEFAULT_STOREFRONT}`)
}
