'use client'

import { usePathname } from 'next/navigation'
import { Toaster } from 'react-hot-toast'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'

export default function LayoutWrapper({ children }) {
  const pathname = usePathname()
  
  // Pages without the global layout (Sidebar/BottomNav)
  const isAuthPage = pathname === '/login' || pathname === '/signup'

  if (isAuthPage) {
    return (
      <main style={{ minHeight: '100vh', width: '100vw' }}>
        {children}
      </main>
    )
  }

  return (
    <>
      <Toaster position="top-center" />
      <div className="layout-wrapper">
        <aside className="layout-sidebar">
          <Sidebar />
        </aside>
        <main className="layout-content">
          {children}
        </main>
      </div>
      <BottomNav />
    </>
  )
}
