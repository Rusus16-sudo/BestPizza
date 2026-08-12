'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import styles from './Notifications.module.css'

export default function NotificationsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState({
    orderUpdates: true,
    promotions: false,
    emailNewsletter: true
  })
  const [saved, setSaved] = useState(false)

  // Load from local storage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('notificationSettings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

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
          <div className={styles.settingRow} onClick={() => toggleSetting('orderUpdates')}>
            <div className={styles.settingInfo}>
              <span className={styles.settingTitle}>Mises à jour de commande</span>
              <span className={styles.settingDesc}>Suivi de livraison en temps réel</span>
            </div>
            <div className={`${styles.toggle} ${settings.orderUpdates ? styles.active : ''}`}>
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
