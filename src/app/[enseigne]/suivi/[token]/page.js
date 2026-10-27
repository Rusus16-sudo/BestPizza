import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getTrackedOrder } from '@/lib/tracked-orders'
import TrackingClient from './TrackingClient'

// Le lien secret de suivi d'une commande : tchopi.cm/<restaurant>/suivi/<jeton>.
// Il suffit pour suivre sa commande, avec ou sans compte.
export const metadata = {
  title: 'Suivi de commande',
  // Un lien personnel : jamais dans les moteurs de recherche
  robots: { index: false, follow: false },
}

export default async function TrackingPage({ params }) {
  const { enseigne, token } = await params
  const order = await getTrackedOrder(token)
  // Le lien d'une commande ne s'ouvre que dans la vitrine de son restaurant
  if (!order || order.restaurant?.slug !== enseigne) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <TrackingClient initialOrder={order} token={token} isLoggedIn={Boolean(user)} />
}
