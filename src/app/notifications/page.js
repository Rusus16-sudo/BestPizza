'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import styles from './Notifications.module.css'
import { getPushState, enablePush, disablePush } from '@/lib/push-client'

// Ce qu'affiche la ligne « Mises à jour de commande » selon l'appareil
const PUSH_DESCRIPTIONS = {
  enabled: 'Activées sur cet appareil, même app fermée',
  disabled: 'Être prévenu à chaque étape, même app fermée',
  denied: 'Bloquées : autorisez-les dans les réglages du navigateur',
  'ios-install': "Sur iPhone : ajoutez d'abord l'app à l'écran d'accueil",
  unsupported: 'Non disponibles sur ce navigateur',
}

export default function NotificationsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState({
    promotions: false,
    emailNewsletter: true
  })
  const [saved, setSaved] = useState(false)
  const [pushState, setPushState] = useState(null)
  const [pushBusy, setPushBusy] = useState(false)

  // Load from local storage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('notificationSettings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
    getPushState().then(setPushState).catch(() => setPushState('unsupported'))
  }, [])

  // Les mises à jour de commande sont de vraies notifications push
  const toggleOrderUpdates = async () => {
    if (pushBusy || (pushState !== 'enabled' && pushState !== 'disabled')) return
    setPushBusy(true)
    try {
      const next = pushState === 'enabled' ? await disablePush() : await enablePush()
      setPushState(next)
      if (next === 'denied') toast.error('Notifications bloquées dans le navigateur')
      else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch {
      toast.error("Le réglage n'a pas pu être enregistré.")
    }
    setPushBusy(false)
  }

  const toggleSetting = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] }
    setSettings(newSettings)
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/settings')}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h1>Notifications</h1>
      </header>

      <div className={styles.content}>
        <p className={styles.description}>
          Gérez comment vous souhaitez être contacté pour vos commandes et nos offres spéciales.
        </p>

        <div className={styles.section}>
          <div className={styles.settingRow} onClick={toggleOrderUpdates}>
            <div className={styles.settingInfo}>
              <span className={styles.settingTitle}>Mises à jour de commande</span>
              <span className={styles.settingDesc}>{PUSH_DESCRIPTIONS[pushState] || 'Suivi de livraison en temps réel'}</span>
            </div>
            <div className={`${styles.toggle} ${pushState === 'enabled' ? styles.active : ''}`}>
              <div className={styles.toggleKnob}></div>
            </div>
          </div>

          <div className={styles.settingRow} onClick={() => toggleSetting('promotions')}>
            <div className={styles.settingInfo}>
              <span className={styles.settingTitle}>Offres et Promotions</span>
              <span className={styles.settingDesc}>Coupons de réduction exclusifs</span>
            </div>
            <div className={`${styles.toggle} ${settings.promotions ? styles.active : ''}`}>
              <div className={styles.toggleKnob}></div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.settingRow} onClick={() => toggleSetting('emailNewsletter')}>
            <div className={styles.settingInfo}>
              <span className={styles.settingTitle}>Newsletter par Email</span>
              <span className={styles.settingDesc}>Actualités et nouveautés du menu</span>
            </div>
            <div className={`${styles.toggle} ${settings.emailNewsletter ? styles.active : ''}`}>
              <div className={styles.toggleKnob}></div>
            </div>
          </div>
        </div>

        {saved && (
          <div className={styles.savedToast}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Préférences sauvegardées
          </div>
        )}
      </div>
    </div>
  )
}
