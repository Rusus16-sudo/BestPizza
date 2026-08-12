'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import styles from './Settings.module.css'

export default function KitchenSettings() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
      } else {
        router.push('/login')
      }
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!user) return <div className={styles.container}>Chargement...</div>

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Paramètres Cuisinier</h1>
      </header>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Profil Professionnel
        </h2>
        
        <div className={styles.profileInfo}>
          <div className={styles.infoGroup}>
            <span className={styles.infoLabel}>Adresse Email</span>
            <div className={styles.infoValue}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="#64748b" strokeWidth="2" fill="none">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              {user.email}
            </div>
          </div>
          <div className={styles.infoGroup}>
            <span className={styles.infoLabel}>Rôle</span>
            <div className={styles.infoValue}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="#64748b" strokeWidth="2" fill="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span className={styles.badge}>Cuisinier</span>
            </div>
          </div>
        </div>
        
        <div className={styles.footer}>
          <p className={styles.helperText}>
            Si vous souhaitez modifier votre mot de passe ou vos informations personnelles, veuillez contacter votre <strong>Gérant</strong>.
          </p>
          <button onClick={() => setShowLogoutConfirm(true)} className={styles.logoutBtn}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Se déconnecter
          </button>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Déconnexion</h3>
            <p className={styles.modalText}>Voulez-vous vraiment vous déconnecter de votre session ?</p>
            <div className={styles.modalActions}>
              <button onClick={() => setShowLogoutConfirm(false)} className={styles.cancelBtn}>Annuler</button>
              <button onClick={handleLogout} className={styles.confirmBtn}>Se déconnecter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
