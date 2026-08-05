'use client'

import { useRouter } from 'next/navigation'
import styles from './Settings.module.css'

export default function SettingsPage() {
  const router = useRouter()

  const settingsOptions = [
    {
      id: 'addresses',
      title: 'Adresses de livraison',
      desc: 'Domicile, Bureau, etc.',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      )
    },
    {
      id: 'orders',
      title: 'Historique des commandes',
      desc: 'Recommander vos plats favoris',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      )
    },
    {
      id: 'notifications',
      title: 'Notifications',
      desc: 'Suivi de commande et promos',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      )
    },
    {
      id: 'help',
      title: 'Service Client',
      desc: 'Besoin d\'aide avec une commande ?',
      icon: (
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      )
    }
  ]

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h1>Paramètres</h1>
      </header>

      <div className={styles.settingsSection}>
        <div className={styles.settingsGrid}>
          {settingsOptions.map(option => (
            <div key={option.id} className={styles.settingItem} onClick={() => alert(`${option.title} n'est pas encore implémenté.`)}>
              <div className={styles.iconBox}>
                {option.icon}
              </div>
              <div className={styles.settingInfo}>
                <span className={styles.settingTitle}>{option.title}</span>
                <span className={styles.settingDesc}>{option.desc}</span>
              </div>
              <svg className={styles.chevron} viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
