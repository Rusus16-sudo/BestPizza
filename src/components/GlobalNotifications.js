'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'
import { ORDER_STATUS_MESSAGES } from '@/lib/order-status-messages'
import { registerServiceWorker, syncPush, forgetDevice } from '@/lib/push-client'

export default function GlobalNotifications() {
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    // Le service worker reçoit les notifications push quand l'app est fermée
    registerServiceWorker()?.catch((err) => console.error('Service worker:', err.message))
  }, [])

  useEffect(() => {
    const supabase = createClient()

    // 1. Récupérer l'utilisateur courant
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    
    fetchUser()

    // S'abonner aux changements d'authentification (si l'utilisateur se connecte/déconnecte)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id)
      } else {
        setUserId(null)
      }
      // Après déconnexion, cet appareil ne reçoit plus les notifications du compte
      if (event === 'SIGNED_OUT') forgetDevice().catch(() => {})
    })

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    // 2. Si pas d'utilisateur, on ne s'abonne à rien
    if (!userId) return

    // L'appareil reste lié au compte connecté, si le client a accepté les notifications
    syncPush()

    const supabase = createClient()

    // 3. S'abonner aux mises à jour de la table 'orders' pour cet utilisateur précis
    const subscription = supabase
      .channel('public:orders:user_' + userId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const oldStatus = payload.old.status
          const newStatus = payload.new.status

          if (oldStatus !== newStatus) {
            triggerNotification(newStatus, payload.new.id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [userId])

  const triggerNotification = (status, orderId) => {
    const entry = ORDER_STATUS_MESSAGES[status]
    if (!entry) return // Ne rien afficher pour les autres statuts

    const { icon, text: message } = entry
    const duration = status === 'livre' ? 6000 : status === 'en_route' ? 5000 : 4000

    toast(
      (t) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.5rem' }}>{icon}</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: '#fff' }}>Votre commande</p>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)' }}>{message}</p>
          </div>
        </div>
      ),
      {
        duration: duration,
        position: 'top-center',
        style: {
          background: '#1f1d1b',
          borderRadius: '20px',
          padding: '14px 18px',
          maxWidth: '420px'
        }
      }
    )
  }

  // Ce composant ne rend rien visuellement, il tourne juste en arrière-plan
  return null
}
