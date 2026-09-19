'use client'

import styles from './BottomNav.module.css'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useCart } from '@/context/CartContext'
import ConfirmDialog from './ConfirmDialog'

const svg = (children, filled) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const tabIcons = {
  home: (a) => a
    ? svg(<path d="M11.47 3.84a.75.75 0 0 1 1.06 0l8.69 8.69V20a1.9 1.9 0 0 1-1.88 1.88H15a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75v4.5a.75.75 0 0 1-.75.75H4.63A1.9 1.9 0 0 1 2.75 20v-7.47z" />, true)
    : svg(<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />),
  menu: () => svg(<path d="M4 6h16M4 12h16M4 18h10" />),
  cart: () => svg(<><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>),
  orders: () => svg(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8" /></>),
  more: () => svg(<><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></>),
  truck: () => svg(<><rect x="1" y="3" width="15" height="13" /><path d="M16 8h4l3 3v5h-7z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>),
  chart: () => svg(<><path d="M3 3v18h18" /><path d="M7 15v2M11 11v6M15 7v10M19 12v5" /></>),
  store: () => svg(<><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v11h16V9" /><path d="M3 9h18" /><path d="M9 20v-6h6v6" /></>),
  user: () => svg(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
}

// Écrans où la barre du bas gêne : ils ont leur propre action principale en bas
const HIDDEN_ON = [/^\/kitchen/, /^\/product\//, /^\/checkout/]

export default function BottomNav() {
  const pathname = usePathname() || ''
  const router = useRouter()
  const { totalItems } = useCart()
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)

  useEffect(() => {
    const checkRole = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (data) setRole(data.role)
      }
    }
    checkRole()
  }, [])

  useEffect(() => {
    if (!showMenu) return
    const onKey = (e) => { if (e.key === 'Escape') setShowMenu(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showMenu])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setConfirmLogout(false)
    setShowMenu(false)
    router.push('/login')
  }

  if (role === 'cuisinier' || HIDDEN_ON.some(r => r.test(pathname))) return null

  const tab = ({ href, icon, label, match, badge }) => {
    const active = match ? match(pathname) : pathname === href
    return (
      <Link href={href} className={`${styles.navItem} ${active ? styles.active : ''}`} aria-current={active ? 'page' : undefined}>
        <span className={styles.iconWrap}>
          {tabIcons[icon](active)}
          {badge > 0 && <span className={styles.badge}>{badge}</span>}
        </span>
        <span className={styles.label}>{label}</span>
      </Link>
    )
  }

  if (role === 'livreur') {
    return (
      <nav className={styles.navContainer} aria-label="Navigation">
        {tab({ href: "/delivery", icon: "truck", label: "Livraisons" })}
        {tab({ href: "/profile", icon: "user", label: "Profil" })}
      </nav>
    )
  }

  const isGerant = role === 'admin' || role === 'gerant'
  const close = () => setShowMenu(false)

  return (
    <>
      <nav className={styles.navContainer} aria-label="Navigation">
        {isGerant ? (
          <>
            {tab({ href: '/admin', icon: 'chart', label: 'Tableau' })}
            {tab({ href: '/admin/commandes', icon: 'orders', label: 'Commandes' })}
            {tab({ href: '/admin/carte', icon: 'menu', label: 'Carte' })}
            {tab({ href: '/', icon: 'store', label: 'Boutique' })}
          </>
        ) : (
          <>
            {tab({ href: "/", icon: "home", label: "Accueil" })}
            {tab({ href: "/menu", icon: "menu", label: "Carte", match: p => p === '/menu' || p === '/categories' })}
            {tab({ href: "/cart", icon: "cart", label: "Panier", badge: totalItems })}
            {tab({ href: "/orders", icon: "orders", label: "Commandes" })}
          </>
        )}
        <button
          className={`${styles.navItem} ${showMenu ? styles.active : ''}`}
          onClick={() => setShowMenu(true)}
          aria-haspopup="dialog"
          aria-expanded={showMenu}
        >
          <span className={styles.iconWrap}>{tabIcons.more()}</span>
          <span className={styles.label}>Plus</span>
        </button>
      </nav>

      {showMenu && (
        <div className={styles.menuOverlay} onClick={close}>
          <div className={styles.menuContent} role="dialog" aria-modal="true" aria-label="Plus d'options" onClick={(e) => e.stopPropagation()}>
            <div className={styles.grabber} aria-hidden="true" />

            {user ? (
              <Link href="/profile" className={styles.profileRow} onClick={close}>
                <span className={styles.avatar}>{user.email?.[0]?.toUpperCase()}</span>
                <span className={styles.profileText}>
                  <strong>{user.user_metadata?.full_name || user.email?.split('@')[0]}</strong>
                  <span>Voir mon profil</span>
                </span>
              </Link>
            ) : (
              <Link href="/login" className={styles.loginRow} onClick={close}>
                <strong>Connectez-vous</strong>
                <span>pour suivre vos commandes et retrouver vos favoris.</span>
              </Link>
            )}

            <div className={styles.menuList}>
              {isGerant ? (
                <>
                  <Link href="/admin/promotions" className={styles.menuItem} onClick={close}>Promotions</Link>
                  <Link href="/admin/equipe" className={styles.menuItem} onClick={close}>Équipe</Link>
                  <Link href="/admin/avis" className={styles.menuItem} onClick={close}>Avis clients</Link>
                  <Link href="/kitchen" className={styles.menuItem} onClick={close}>Écran cuisine</Link>
                  <Link href="/delivery" className={styles.menuItem} onClick={close}>Livraisons</Link>
                  <Link href="/settings" className={styles.menuItem} onClick={close}>Paramètres</Link>
                </>
              ) : (
                <>
                  <Link href="/favorites" className={styles.menuItem} onClick={close}>Favoris</Link>
                  <Link href="/offers" className={styles.menuItem} onClick={close}>Offres et codes promo</Link>
                  {user && <Link href="/settings" className={styles.menuItem} onClick={close}>Paramètres</Link>}
                  <Link href="/help" className={styles.menuItem} onClick={close}>Aide</Link>
                </>
              )}
              {user && (
                <button className={`${styles.menuItem} ${styles.logoutItem}`} onClick={() => setConfirmLogout(true)}>
                  Se déconnecter
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmLogout}
        title="Se déconnecter ?"
        message="Votre panier reste enregistré sur cet appareil."
        confirmLabel="Se déconnecter"
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </>
  )
}
