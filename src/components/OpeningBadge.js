'use client'

import { useEffect, useState } from 'react'
import { useStorefront } from '@/context/StorefrontContext'
import { openingState, describeOpening } from '@/lib/opening-hours'
import styles from './OpeningBadge.module.css'

/**
 * « Ouvert jusqu'à 23 h » ou « Fermé · ouvre demain à 11 h », pour le point de vente
 * choisi, à l'heure du restaurant. Calculé dans le navigateur et remis à jour chaque minute.
 */
export function useOpening() {
  const { location, timezone } = useStorefront()
  const [state, setState] = useState(null)

  useEffect(() => {
    if (!location) return
    const update = () => setState(openingState(location, timezone))
    update()
    const timer = setInterval(update, 60000)
    return () => clearInterval(timer)
  }, [location, timezone])

  return state
}

// `dark` : sur un fond sombre
export default function OpeningBadge({ dark = false, className = '' }) {
  const state = useOpening()
  if (!state) return null

  return (
    <span className={`${styles.badge} ${state.open ? styles.open : styles.closed} ${dark ? styles.dark : ''} ${className}`}>
      <span className={styles.dot} aria-hidden="true" />
      {describeOpening(state)}
    </span>
  )
}
