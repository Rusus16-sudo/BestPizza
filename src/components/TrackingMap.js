'use client'

import dynamic from 'next/dynamic'

const Map = dynamic(
  () => import('./TrackingMapComponent'),
  {
    ssr: false,
    loading: () => <div style={{ height: '300px', background: 'var(--color-surface-muted)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement de la carte…</div>
  }
)

/** La carte d'une livraison : le livreur (`position`) et la maison du client (`destination`). */
export default function TrackingMap({ position, destination }) {
  return <Map position={position} destination={destination} />
}
