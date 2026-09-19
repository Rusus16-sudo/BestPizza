'use client'

import { useState, useEffect } from 'react'
import styles from './InstallPrompt.module.css'

export default function InstallPrompt({ hidden = false }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e)
      
      // Check if we should show it based on localStorage (1 hour cooldown)
      const lastDismissed = localStorage.getItem('pwa_prompt_dismissed')
      if (lastDismissed) {
        const timeSinceDismissed = Date.now() - parseInt(lastDismissed, 10)
        // 1 hour = 3600000 ms
        if (timeSinceDismissed < 3600000) {
          return // Don't show if dismissed less than 1 hour ago
        }
      }

      // If we reach here, we can show the prompt
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Handle when the app is successfully installed
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }
    
    // Clear the saved prompt since it can't be used again
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleCloseClick = () => {
    setShowPrompt(false)
    // Save current time in localStorage
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString())
  }

  if (!showPrompt || hidden) return null

  return (
    <div className={styles.promptContainer}>
      <div className={styles.promptContent}>
        <div className={styles.leftSection}>
          <div className={styles.iconWrapper}>
            <img src="/icon-192x192.png" alt="Best Pizza" className={styles.appIcon} />
          </div>
          <div className={styles.promptText}>
            <div className={styles.promptTitle}>L'app Best Pizza</div>
            <div className={styles.promptDesc}>Commandez depuis votre écran d’accueil</div>
          </div>
        </div>
        <div className={styles.promptActions}>
          <button onClick={handleInstallClick} className={styles.installBtn}>Installer</button>
          <button onClick={handleCloseClick} className={styles.closeBtn} aria-label="Fermer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
