'use client'

import styles from './BottomNav.module.css'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useCart } from '@/context/CartContext'

export default function BottomNav() {
  const pathname = usePathname() || ''
  const router = useRouter()
  const { totalItems } = useCart()
  const [isLivreur, setIsLivreur] = useState(false)
  const [isKitchen, setIsKitchen] = useState(false)
  const [isGerant, setIsGerant] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (data) {
          if (data.role === 'livreur') {
            setIsLivreur(true)
          } else if (data.role === 'cuisinier') {
            setIsKitchen(true)
          } else if (data.role === 'admin' || data.role === 'gerant') {
            setIsGerant(true)
          }
        }
      }
    }
    checkRole()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setShowMenu(false)
    router.push('/login')
  }

  if (isKitchen) {
    return null; // Kitchen has its own desktop layout, usually no bottom nav needed, or if needed we can handle differently
  }

  if (pathname.startsWith('/kitchen')) {
    return null;
  }

  if (isLivreur) {
    return (
      <nav className={styles.navContainer}>
        <Link href="/delivery" className={`${styles.navItem} ${pathname === '/delivery' ? styles.active : ''}`}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <rect x="1" y="3" width="15" height="13"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
          </svg>
          <span>Livraisons</span>
        </Link>
        <Link href="/profile" className={`${styles.navItem} ${pathname === '/profile' ? styles.active : ''}`}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>Profil</span>
        </Link>
      </nav>
    )
  }

  return (
    <nav className={styles.navContainer}>
      <Link href="/" className={`${styles.navItem} ${pathname === '/' ? styles.active : ''}`}>
        {pathname === '/' ? (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 1 0 1.06 1.06l8.69-8.689Z" />
            <path d="m12 5.432 8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75V21a.75.75 0 0 1-.75.75H5.625a1.875 1.875 0 0 1-1.875-1.875v-6.198a2.29 2.29 0 0 0 .091-.086L12 5.432Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        )}
        <span>Accueil</span>
      </Link>
      
      <Link href="/orders" className={`${styles.navItem} ${pathname === '/orders' ? styles.active : ''}`}>
        {pathname === '/orders' ? (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" clipRule="evenodd" />
            <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        )}
        <span>Commandes</span>
      </Link>
      
      {/* Bouton Panier Flottant au centre */}
      <Link href="/cart" className={`${styles.navItem} ${styles.navItemCart} ${pathname === '/cart' ? styles.active : ''}`}>
        <div className={styles.cartIconWrapper}>
          {pathname === '/cart' ? (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 0 0 4.25 22.5h15.5a1.875 1.875 0 0 0 1.865-2.071l-1.263-12a1.875 1.875 0 0 0-1.865-1.679H16.5V6a4.5 4.5 0 1 0-9 0ZM12 3a3 3 0 0 0-3 3v.75h6V6a3 3 0 0 0-3-3Zm-3 8.25a3 3 0 1 0 6 0v-.75a.75.75 0 0 1 1.5 0v.75a4.5 4.5 0 1 1-9 0v-.75a.75.75 0 0 1 1.5 0v.75Z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          )}
          {totalItems > 0 && <span className={styles.cartBadgeNav}>{totalItems}</span>}
        </div>
        <span>Panier</span>
      </Link>
      
      <Link href="/favorites" className={`${styles.navItem} ${pathname === '/favorites' ? styles.active : ''}`}>
        {pathname === '/favorites' ? (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        )}
        <span>Favoris</span>
      </Link>
      
      <div className={`${styles.navItem} ${showMenu ? styles.active : ''}`} onClick={() => setShowMenu(true)}>
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
          <circle cx="5" cy="12" r="1.5" fill={showMenu ? "currentColor" : "none"}></circle>
          <circle cx="12" cy="12" r="1.5" fill={showMenu ? "currentColor" : "none"}></circle>
          <circle cx="19" cy="12" r="1.5" fill={showMenu ? "currentColor" : "none"}></circle>
        </svg>
        <span>Plus</span>
      </div>

      {showMenu && (
        <div className={styles.menuOverlay} onClick={() => setShowMenu(false)}>
          <div className={styles.menuContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.menuHeader}>
              <h3>Plus d'options</h3>
              <button className={styles.closeBtn} onClick={() => setShowMenu(false)}>✕</button>
            </div>
            
            <div className={styles.menuList}>
              <Link href="/profile" className={styles.menuItem} onClick={() => setShowMenu(false)}>
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                Mon Profil
              </Link>
              <Link href="/settings" className={styles.menuItem} onClick={() => setShowMenu(false)}>
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                Paramètres
              </Link>
              <Link href="/help" className={styles.menuItem} onClick={() => setShowMenu(false)}>
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                Aide & Support
              </Link>
              
              {isGerant && (
                <Link href="/admin" className={styles.menuItem} onClick={() => setShowMenu(false)}>
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                  Administration
                </Link>
              )}

              <div className={`${styles.menuItem} ${styles.logoutItem}`} onClick={handleLogout}>
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Se déconnecter
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
