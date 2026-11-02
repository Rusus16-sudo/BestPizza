import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getStaffMembership, screenRole, HOME_BY_ROLE } from '@/lib/staff'
import { LAST_STOREFRONT_COOKIE } from '@/lib/storefront-paths'
import Landing from '@/components/landing/Landing'

export const metadata = {
  title: 'Tchopi · L’app de commande et de livraison de votre restaurant',
  description: 'Votre restaurant en ligne en 5 minutes : un lien à partager, la cuisine et les livreurs connectés, et le suivi de livraison en direct pour vos clients. 14 jours gratuits.',
}

// tchopi.cm : le personnel va à son écran de travail, un client revient sur le dernier
// restaurant visité ; tous les autres découvrent Tchopi.
export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const role = screenRole(await getStaffMembership(supabase, user.id))
    if (role !== 'client') redirect(HOME_BY_ROLE[role])
  }

  const last = (await cookies()).get(LAST_STOREFRONT_COOKIE)?.value
  if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(last || '')) redirect(`/${last}`)

  return <Landing />
}
