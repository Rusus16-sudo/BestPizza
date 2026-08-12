'use client'

import dynamic from 'next/dynamic'

const Map = dynamic(
  () => import('./TrackingMapComponent'),
  { 
    ssr: false,
    loading: () => <div style={{ height: '300px', background: '#f3f4f6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement de la carte...</div>
  }
)

export default function TrackingMap({ position }) {
  return <Map position={position} />
}
