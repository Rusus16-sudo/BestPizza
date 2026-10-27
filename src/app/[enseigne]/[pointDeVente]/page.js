import { notFound } from 'next/navigation'
import { loadStorefront } from '@/lib/storefront-data'
import ChooseLocation from './ChooseLocation'

// Lien direct vers un point de vente : tchopi.cm/best-pizza/bastos.
// Le point de vente est retenu, puis le client arrive sur la vitrine.
export default async function LocationLink({ params }) {
  const { enseigne, pointDeVente } = await params
  const storefront = await loadStorefront(enseigne)
  const location = storefront?.locations.find(l => l.slug === pointDeVente)
  if (!location) notFound()

  return <ChooseLocation slug={location.slug} />
}
