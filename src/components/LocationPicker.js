'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useStorefront } from '@/context/StorefrontContext'
import { openingState, describeOpening } from '@/lib/opening-hours'
import { hasFullDelivery } from '@/lib/delivery'
import { formatPrice } from '@/lib/format'
import styles from './LocationPicker.module.css'

function deliveryHint(location, plan) {
  if (hasFullDelivery(plan) && location.zones?.length) return 'Livraison selon votre quartier'
  const fee = Number(location.delivery_fee) || 0
  return fee > 0 ? `Livraison ${formatPrice(fee)}` : 'Livraison offerte'
}

/**
 * Pour un restaurant à plusieurs adresses : le client choisit celle qui le livre.
 * `required` : premier passage, rien n'est encore choisi, la fenêtre ne se ferme pas sans choix.
 */
export default function LocationPicker({ required = false, onClose }) {
  const { name, locations, location, plan, timezone, chooseLocation } = useStorefront()
  const pathname = usePathname()
  // Le suivi d'une commande ne dépend pas du point de vente choisi
  const hidden = required && /\/suivi\//.test(pathname || '')

  useEffect(() => {
    if (hidden) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && !required && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [hidden, required, onClose])

  if (hidden) return null

  return (
    <div className={styles.overlay} onClick={() => !required && onClose()}>
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.head}>
          <div>
            <h2 id="location-picker-title">{required ? 'Où êtes-vous ?' : 'Changer de point de vente'}</h2>
            <p>{name} a {locations.length} adresses. Choisissez celle qui vous livre : ses horaires et sa livraison s’appliquent à votre commande.</p>
          </div>
          {!required && (
            <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          )}
        </div>

        <ul className={styles.list}>
          {locations.map((l) => {
            const state = openingState(l, timezone)
            const current = !required && l.slug === location?.slug
            return (
              <li key={l.slug}>
                <button
                  type="button"
                  className={`${styles.option} ${current ? styles.current : ''}`}
                  onClick={() => chooseLocation(l.slug)}
                  aria-current={current ? 'true' : undefined}
                >
                  <span className={styles.pin} aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
                  </span>
                  <span className={styles.body}>
                    <strong>{l.name}</strong>
                    {l.address && <span className={styles.address}>{l.address}</span>}
                    <span className={styles.meta}>
                      <span className={state.open ? styles.open : styles.closed}>{describeOpening(state)}</span>
                      <span aria-hidden="true"> · </span>
                      {deliveryHint(l, plan)}
                    </span>
                  </span>
                  {current
                    ? <span className={styles.check} aria-label="Point de vente actuel">✓</span>
                    : <span className={styles.chevron} aria-hidden="true">›</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
