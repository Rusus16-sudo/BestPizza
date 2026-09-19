'use client'

import { usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import GlobalNotifications from '@/components/GlobalNotifications'
import InstallPrompt from '@/components/InstallPrompt'

// Mêmes écrans que BottomNav : pas de barre du bas, donc pas de marge réservée
const NO_BOTTOM_NAV = [/^\/kitchen/, /^\/product\//, /^\/checkout/]

export default function LayoutWrapper({ children }) {
  const pathname = usePathname() || ''

  // Pages sans la mise en page globale (barre latérale / barre du bas)
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/reset-password'

  if (isAuthPage) {
    return (
      <main style={{ minHeight: '100vh', width: '100%' }}>
        {children}
      </main>
    )
  }

  const hideBottomNav = NO_BOTTOM_NAV.some(r => r.test(pathname))

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 2600,
          style: {
            background: '#1f1d1b',
            color: '#fff',
            borderRadius: '9999px',
            padding: '10px 18px',
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: '0.95rem',
          },
          success: { iconTheme: { primary: '#2e7d4a', secondary: '#fff' } },
          error: { iconTheme: { primary: '#d93a1f', secondary: '#fff' } },
        }}
      />
      <GlobalNotifications />
      {/* Toujours monté pour capter l'événement d'installation ; masqué sur l'espace gérant */}
      <InstallPrompt hidden={pathname.startsWith('/admin')} />
      <div className="layout-wrapper">
        <aside className="layout-sidebar">
          <Sidebar />
        </aside>
        <main className={`layout-content ${hideBottomNav ? 'no-bottom-nav' : ''}`}>
          {children}
        </main>
      </div>
      <BottomNav />
    </>
  )
}
