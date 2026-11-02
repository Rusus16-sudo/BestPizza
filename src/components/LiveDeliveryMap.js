'use client'

import { useEffect, useState } from 'react'
import TrackingMap from './TrackingMap'

const REFRESH_MS = 8000

/**
 * Le livreur en route et la maison du client, d'après le lien de suivi de la commande
 * (le même que la page de suivi : il marche avec ou sans compte).
 */
export default function LiveDeliveryMap({ trackingToken }) {
  const [order, setOrder] = useState(null)

  useEffect(() => {
    if (!trackingToken) return
    let stopped = false
    const load = async () => {
      try {
        const res = await fetch(`/api/suivi/${trackingToken}`, { cache: 'no-store' })
        if (res.ok && !stopped) setOrder(await res.json())
      } catch {}
    }
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [trackingToken])

  // Suivi sur la carte non inclus dans l'offre du restaurant (Starter)
  if (order && !order.features?.liveMap) return null

  return (
    <div style={{ marginTop: '16px' }}>
      <TrackingMap position={order?.driver} destination={order?.destination} />
      {order && !order.driver && (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '6px' }}>
          La position du livreur s’affichera dès qu’il partagera sa localisation.
        </p>
      )}
    </div>
  )
}
