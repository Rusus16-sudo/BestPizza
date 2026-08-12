'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix missing marker icons in leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const scooterIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3753/3753230.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
})

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] !== 0) {
      map.flyTo(center, map.getZoom(), { animate: true, duration: 1 });
    }
  }, [center, map]);
  return null;
}

export default function TrackingMapComponent({ position }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div style={{ height: '300px', background: '#f3f4f6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement de la carte...</div>

  // default to center of Paris if no position
  const validPosition = position && position.lat && position.lng ? [position.lat, position.lng] : [48.8566, 2.3522];

  return (
    <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb', zIndex: 1, position: 'relative' }}>
      <MapContainer center={validPosition} zoom={15} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {position && position.lat && position.lng && (
          <Marker position={validPosition} icon={scooterIcon}>
            <Popup>
              Livreur
            </Popup>
          </Marker>
        )}
        <ChangeView center={validPosition} />
      </MapContainer>
    </div>
  )
}
