'use client'

import styles from './Sidebar.module.css'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useCart } from '@/context/CartContext'
import BrandMark from './BrandMark'
import ConfirmDialog from './ConfirmDialog'

const Icon = ({ children }) => (
  <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const icons = {
  home: <Icon><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></Icon>,
  menu: <Icon><path d="M4 6h16M4 12h16M4 18h10" /></Icon>,
  cart: <Icon><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></Icon>,
  orders: <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8" /></Icon>,
  heart: <Icon><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" /></Icon>,
  tag: <Icon><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><circle cx="7" cy="7" r="1.5" /></Icon>,
  help: <Icon><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" /></Icon>,
  shield: <Icon><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Icon>,
  truck: <Icon><rect x="1" y="3" width="15" height="13" /><path d="M16 8h4l3 3v5h-7z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></Icon>,
  grid: <Icon><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></Icon>,
  settings: <Icon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Icon>,
  logout: <Icon><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Icon>,
  login: <Icon><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" /></Icon>,
  chart: <Icon><path d="M3 3v18h18" /><path d="M7 15v2M11 11v6M15 7v10M19 12v5" /></Icon>,
  users: <Icon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></Icon>,
  star: <Icon><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></Icon>,
  flame: <Icon><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></Icon>,
  store: <Icon><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v11h16V9" /><path d="M3 9h18" /><path d="M9 20v-6h6v6" /></Icon>,
}

export default function Sidebar() {
  const pathname = usePathname() || ''
  const router = useRouter()
  const { totalItems } = useCart()
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [latestOffer, setLatestOffer] = useState(null)
  const [activeOrders, setActiveOrders] = useState(0)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (data) setRole(data.role)
        if (data && ['admin', 'gerant'].includes(data.role)) {
          const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .in('status', ['en_attente', 'en_preparation', 'prete', 'en_route'])
          setActiveOrders(count || 0)
        }
      }

      const { data: offersData, error } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && offersData) {
        const now = new Date()
        const active = offersData.filter(o => !o.valid_until || new Date(o.valid_until) >= now)
        if (active.length > 0) setLatestOffer(active[0])
      }
    }
    load()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setShowLogoutConfirm(false)
    router.push('/login')
  }

  const isGerant = role === 'admin' || role === 'gerant'
  const isLivreur = role === 'livreur'
  const inKitchen = pathname.startsWith('/kitchen')
  const inDelivery = pathname.startsWith('/delivery') || isLivreur

  const navLink = ({ href, icon, label, match, badge }) => {
    const active = match ? match(pathname) : pathname === href
    return (
      <Link href={href} className={`${styles.navItem} ${active ? styles.active : ''}`} aria-current={active ? 'page' : undefined}>
        {icons[icon]}
        <span className={styles.label}>{label}</span>
        {badge > 0 && <span className={styles.badge}>{badge}</span>}
      </Link>
    )
  }

  return (
    <div className={styles.sidebar}>
      <Link href="/" className={styles.logo} aria-label="Best Pizza, accueil">
        <BrandMark size="lg" />
      </Link>

      <nav className={styles.nav} aria-label="Navigation principale">
        {isGerant ? (
          <>
            <span className={styles.groupLabel}>Gestion</span>
            {navLink({ href: '/admin', icon: 'chart', label: 'Tableau de bord' })}
            {navLink({ href: '/admin/commandes', icon: 'orders', label: 'Commandes', badge: activeOrders })}
            {navLink({ href: '/admin/carte', icon: 'menu', label: 'La carte' })}
            {navLink({ href: '/admin/promotions', icon: 'tag', label: 'Promotions' })}
            {navLink({ href: '/admin/equipe', icon: 'users', label: 'Équipe' })}
            {navLink({ href: '/admin/avis', icon: 'star', label: 'Avis clients' })}

            <span className={styles.groupLabel}>Opérations</span>
            {navLink({ href: '/kitchen', icon: 'flame', label: 'Écran cuisine', match: p => p.startsWith('/kitchen') })}
            {navLink({ href: '/delivery', icon: 'truck', label: 'Livraisons' })}
            {navLink({ href: '/', icon: 'store', label: 'Voir la boutique', match: () => false })}
          </>
        ) : inKitchen ? (
          navLink({ href: "/kitchen", icon: "grid", label: "Cuisine" })
        ) : inDelivery ? (
          navLink({ href: "/delivery", icon: "truck", label: "Mes livraisons" })
        ) : (
          <>
            {navLink({ href: "/", icon: "home", label: "Accueil" })}
            {navLink({ href: "/menu", icon: "menu", label: "La carte", match: p => p === '/menu' || p === '/categories' })}
            {navLink({ href: "/cart", icon: "cart", label: "Panier", badge: totalItems, match: p => p === '/cart' || p === '/checkout' })}
            {navLink({ href: "/orders", icon: "orders", label: "Commandes" })}
            {navLink({ href: "/favorites", icon: "heart", label: "Favoris" })}
            {navLink({ href: "/offers", icon: "tag", label: "Offres" })}
          </>
        )}

        <div className={styles.divider} />

        {!isGerant && !inKitchen && !inDelivery && navLink({ href: "/help", icon: "help", label: "Aide" })}
        {user && (
          navLink({ href: inKitchen ? '/kitchen/settings' : '/settings', icon: "settings", label: "Paramètres", match: p => p.includes('/settings') })
        )}
        {user ? (
          <button onClick={() => setShowLogoutConfirm(true)} className={styles.navItem}>
            {icons.logout}
            <span className={styles.label}>Se déconnecter</span>
          </button>
        ) : (
          navLink({ href: "/login", icon: "login", label: "Se connecter" })
        )}
      </nav>

      {!isGerant && !inKitchen && !inDelivery && latestOffer && (
        <Link href="/offers" className={styles.promoCard}>
          <span className={styles.promoTitle}>{latestOffer.title || `-${latestOffer.discount_percentage}%`}</span>
          {latestOffer.description && <span className={styles.promoText}>{latestOffer.description}</span>}
          <span className={styles.promoCode}>
            Code <strong>{latestOffer.code}</strong>
          </span>
          {latestOffer.valid_until && (
            <span className={styles.promoDate}>Jusqu’au {new Date(latestOffer.valid_until).toLocaleDateString('fr-FR')}</span>
          )}
        </Link>
      )}

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Se déconnecter ?"
        message="Votre panier reste enregistré sur cet appareil."
        confirmLabel="Se déconnecter"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  )
}
