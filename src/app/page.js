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

// tchopi.cm : la page d'accueil de Tchopi, pour tout le monde. Seuls la cuisine et les
// livreurs vont directement à leur écran (leur app installée s'ouvre ici). Les clients,
// eux, arrivent par le lien de leur restaurant.
// tchopi.cm/?boutique : « retour à la boutique », vers le dernier restaurant visité.
export default async function Home({ searchParams }) {
  if ((await searchParams).boutique !== undefined) {
    const last = (await cookies()).get(LAST_STOREFRONT_COOKIE)?.value
    if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(last || '')) redirect(`/${last}`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user ? screenRole(await getStaffMembership(supabase, user.id)) : null

  if (role === 'cuisinier' || role === 'livreur') redirect(HOME_BY_ROLE[role])

  // Connecté : « Mon espace » à la place de « Connexion »
  const account = role === 'gerant' ? '/admin' : user ? '/orders' : null
  return <Landing account={account} />
}
