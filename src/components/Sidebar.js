'use client'

import styles from './Sidebar.module.css'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function Sidebar() {
  const pathname = usePathname() || ''
  const router = useRouter()
  const [isGerant, setIsGerant] = useState(false)
  const [isLivreur, setIsLivreur] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [latestOffer, setLatestOffer] = useState(null)

  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (data) {
          if (data.role === 'admin' || data.role === 'gerant') {
            setIsGerant(true)
          } else if (data.role === 'livreur') {
            setIsLivreur(true)
          }
        }
      }

      const { data: offersData, error } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (!error && offersData) {
        const now = new Date()
        const activeOffers = offersData.filter(o => !o.valid_until || new Date(o.valid_until) >= now)
        if (activeOffers.length > 0) {
          setLatestOffer(activeOffers[0])
        }
      }
    }
    checkRole()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <svg viewBox="0 0 24 24" width="28" height="28" className={styles.logoIcon} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        Foodora
      </div>

      <nav className={styles.nav}>
        {pathname.startsWith('/kitchen') ? (
          <>
            <Link href="/kitchen" className={`${styles.navItem} ${pathname === '/kitchen' ? styles.active : ''}`}>
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
              Dashboard Cuisine
            </Link>
          </>
        ) : pathname.startsWith('/delivery') || isLivreur ? (
          <>
            <Link href="/delivery" className={`${styles.navItem} ${pathname === '/delivery' ? styles.active : ''}`}>
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
              Espace Livreur
            </Link>
          </>
        ) : (
          <>
            <Link href="/" className={`${styles.navItem} ${pathname === '/' ? styles.active : ''}`}>
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              Accueil
            </Link>

            <Link href="/categories" className={`${styles.navItem} ${pathname === '/categories' ? styles.active : ''}`}>
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              Catégories
            </Link>
            <Link href="/orders" className={`${styles.navItem} ${pathname === '/orders' ? styles.active : ''}`}>
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Commandes
            </Link>
            <Link href="/favorites" className={`${styles.navItem} ${pathname === '/favorites' ? styles.active : ''}`}>
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              Favoris
            </Link>
            <Link href="/offers" className={`${styles.navItem} ${pathname === '/offers' ? styles.active : ''}`}>
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 8v4l3 3"></path>
              </svg>
              Offres
            </Link>
            <Link href="/help" className={`${styles.navItem} ${pathname === '/help' ? styles.active : ''}`}>
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              Aide
            </Link>

            {isGerant && (
              <Link href="/admin" className={`${styles.navItem} ${pathname.startsWith('/admin') ? styles.active : ''}`}>
                <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <path d="M12 8v4"></path>
                  <path d="M12 16h.01"></path>
                </svg>
                Administration
              </Link>
            )}
          </>
        )}
        <Link href={pathname.startsWith('/kitchen') ? "/kitchen/settings" : "/settings"} className={`${styles.navItem} ${pathname.includes('/settings') ? styles.active : ''}`}>
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          Paramètres
        </Link>
        
        <button onClick={() => setShowLogoutConfirm(true)} className={styles.logoutBtn}>
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Déconnexion
        </button>
      </nav>

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

      {!pathname.startsWith('/kitchen') && !pathname.startsWith('/delivery') && !isLivreur && latestOffer && (
        <div className={`${styles.promoCard} ${styles['offerTheme' + latestOffer.theme]}`}>
          <h4>{latestOffer.title}</h4>
          {latestOffer.description && <p style={{ fontSize: '0.8rem', opacity: 0.9, marginBottom: '8px' }}>{latestOffer.description}</p>}
          <p style={{ marginTop: '0' }}>Code: <span className={styles.code}>{latestOffer.code}</span></p>
          <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '12px' }}>
            {latestOffer.valid_until ? `Jusqu'au ${new Date(latestOffer.valid_until).toLocaleDateString('fr-FR')}` : 'Valable actuellement'}
          </div>
          <Link href="/offers" className={styles.orderBtn}>
            Voir les Offres
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </Link>
        </div>
      )}
    </div>
  )
}
