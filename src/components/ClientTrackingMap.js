'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import TrackingMap from './TrackingMap'

export default function ClientTrackingMap({ orderId }) {
  const [driverPosition, setDriverPosition] = useState(null)
  
  useEffect(() => {
    const supabase = createClient()
    
    // Subscribe to driver's location broadcasts
    const channel = supabase.channel(`tracking_${orderId}`)
    
    channel.on('broadcast', { event: 'location' }, (payload) => {
      console.log('Location received:', payload)
      if (payload.payload) {
        setDriverPosition(payload.payload)
      }
    }).subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId])

  return (
    <div style={{ marginTop: '16px' }}>
      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
        Suivi du livreur en temps réel
      </h4>
      <TrackingMap position={driverPosition} />
      {!driverPosition && (
        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>
          En attente de la position du livreur...
        </p>
      )}
    </div>
  )
}
