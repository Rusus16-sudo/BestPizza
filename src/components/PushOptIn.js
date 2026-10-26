'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import styles from './PushOptIn.module.css'
import { getPushState, enablePush } from '@/lib/push-client'

// Invite le client à recevoir le suivi de sa commande même app fermée.
// Ne s'affiche que s'il peut encore l'activer.
export default function PushOptIn() {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    getPushState().then(setState).catch(() => setState('unsupported'))
  }, [])

  if (dismissed || (state !== 'disabled' && state !== 'ios-install')) return null

  const handleEnable = async () => {
    setBusy(true)
    try {
      const next = await enablePush()
      setState(next)
      if (next === 'enabled') toast.success('Notifications activées')
      else if (next === 'denied') toast.error('Notifications bloquées dans le navigateur')
    } catch {
      toast.error("Les notifications n'ont pas pu être activées.")
    }
    setBusy(false)
  }

  return (
    <div className={styles.card}>
      <div className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </div>
      <div className={styles.text}>
        <strong>Suivez votre commande, même app fermée</strong>
        {state === 'ios-install' ? (
          <span>
            Sur iPhone, ajoutez d’abord Best Pizza à l’écran d’accueil :
            bouton Partager, puis « Sur l’écran d’accueil ».
          </span>
        ) : (
          <span>On vous prévient quand elle passe en cuisine, part en livraison et arrive.</span>
        )}
      </div>
      <div className={styles.actions}>
        {state === 'disabled' && (
          <button className={styles.enableBtn} onClick={handleEnable} disabled={busy}>
            {busy ? 'Un instant…' : 'Activer'}
          </button>
        )}
        <button className={styles.closeBtn} onClick={() => setDismissed(true)} aria-label="Fermer">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
