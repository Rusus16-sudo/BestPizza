'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './TimePicker.module.css'

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
const MINUTES = ['00', '15', '30', '45']

/**
 * Choix d'une heure (« HH:MM ») sans le sélecteur du navigateur : une pastille,
 * puis un panneau avec la grille des heures et les minutes par quart d'heure.
 * Sur téléphone, le panneau monte du bas de l'écran.
 */
export default function TimePicker({ value, onChange, label }) {
  const [open, setOpen] = useState(false)
  const [hour, setHour] = useState('11')
  const [minute, setMinute] = useState('00')
  const wrapRef = useRef(null)
  const triggerRef = useRef(null)

  const openPanel = () => {
    const [h = '11', m = '00'] = String(value || '').split(':')
    setHour(h.padStart(2, '0'))
    setMinute(m.padStart(2, '0'))
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  const confirm = () => {
    onChange(`${hour}:${minute}`)
    close()
  }

  // Fermeture : toucher à côté, ou Échap
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Une minute qui n'est pas un quart d'heure (déjà enregistrée) reste proposée
  const minutes = MINUTES.includes(minute) ? MINUTES : [...MINUTES, minute].sort()

  return (
    <span className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => (open ? close() : openPanel())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label} : ${value || 'non défini'}`}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        <span className={styles.value}>{value || '--:--'}</span>
      </button>

      {open && (
        <>
          <div className={styles.backdrop} aria-hidden="true" />
          <div className={styles.panel} role="dialog" aria-label={label}>
            <div className={styles.grabber} aria-hidden="true" />
            <div className={styles.head}>
              <span className={styles.caption}>{label}</span>
              <span className={styles.preview}>{hour}<span className={styles.colon}>:</span>{minute}</span>
            </div>

            <p className={styles.groupLabel}>Heure</p>
            <div className={styles.hours}>
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`${styles.chip} ${h === hour ? styles.chipActive : ''}`}
                  onClick={() => setHour(h)}
                  aria-pressed={h === hour}
                >
                  {h}
                </button>
              ))}
            </div>

            <p className={styles.groupLabel}>Minutes</p>
            <div className={styles.minutes}>
              {minutes.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`${styles.chip} ${styles.minuteChip} ${m === minute ? styles.chipActive : ''}`}
                  onClick={() => setMinute(m)}
                  aria-pressed={m === minute}
                >
                  :{m}
                </button>
              ))}
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.cancel} onClick={close}>Annuler</button>
              <button type="button" className={styles.confirm} onClick={confirm}>Valider {hour}:{minute}</button>
            </div>
          </div>
        </>
      )}
    </span>
  )
}
