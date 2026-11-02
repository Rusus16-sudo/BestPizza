'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Repères dessinés par le site (pas d'image à télécharger ailleurs), à la couleur du restaurant
const pin = (emoji, className) => L.divIcon({
  className: '',
  html: `<span class="tchopi-pin ${className}">${emoji}</span>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
})
const DRIVER = pin('🛵', 'tchopi-pin-driver')
const HOME = pin('🏠', 'tchopi-pin-home')

// Douala, tant qu'aucune position n'est connue
const FALLBACK = [4.0511, 9.7679]

// Garde le livreur et la maison du client à l'écran
function Frame({ points }) {
  const map = useMap()
  const key = points.map((p) => p.join(',')).join('|')
  useEffect(() => {
    if (points.length === 1) map.flyTo(points[0], Math.max(map.getZoom(), 15), { duration: 1 })
    else if (points.length > 1) map.flyToBounds(points, { padding: [48, 48], maxZoom: 16, duration: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map])
  return null
}

const toPoint = (p) => (p && Number.isFinite(p.lat) && Number.isFinite(p.lng) ? [p.lat, p.lng] : null)

/** `position` : le livreur ; `destination` : le client, s'il a partagé sa position. */
export default function TrackingMapComponent({ position, destination }) {
  const driver = toPoint(position)
  const home = toPoint(destination)
  const points = [driver, home].filter(Boolean)

  return (
    <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)', zIndex: 1, position: 'relative' }}>
      <MapContainer center={points[0] || FALLBACK} zoom={15} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {home && <Marker position={home} icon={HOME} />}
        {driver && <Marker position={driver} icon={DRIVER} />}
        <Frame points={points} />
      </MapContainer>
    </div>
  )
}
