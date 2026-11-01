'use client'

import { useStorefront } from '@/context/StorefrontContext'
import styles from './LocationChip.module.css'

/**
 * « 📍 Bastos · Changer » : le point de vente qui livre le client, s'il y en a plusieurs.
 * `dark` : sur un fond sombre. `label` : texte avant le nom (ex. « Livré par »).
 */
export default function LocationChip({ dark = false, label = '', className = '' }) {
  const { locations, location, openLocationPicker } = useStorefront()
  if (!location || locations.length < 2) return null

  return (
    <button
      type="button"
      className={`${styles.chip} ${dark ? styles.dark : ''} ${className}`}
      onClick={openLocationPicker}
      aria-label={`Point de vente : ${location.name}. Changer`}
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
      <span>{label && <>{label} </>}<strong>{location.name}</strong></span>
      <em>Changer</em>
    </button>
  )
}
