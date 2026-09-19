'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'

export default function GlobalNotifications() {
  const [userId, setUserId] = useState(null)

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
    })

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    // 2. Si pas d'utilisateur, on ne s'abonne à rien
    if (!userId) return

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
    let message = ''
    let icon = ''
    let duration = 4000

    switch (status) {
      case 'en_preparation':
        message = "La cuisine prépare votre commande !"
        icon = '🧑‍🍳'
        break
      case 'prete':
        message = "Votre commande est prête, un livreur va la récupérer."
        icon = '🍕'
        break
      case 'en_route':
        message = "Votre livreur est en route !"
        icon = '🛵'
        duration = 5000
        break
      case 'livre':
        message = "Votre commande a été livrée. Bon appétit !"
        icon = '🎉'
        duration = 6000
        break
      case 'annule':
        message = "Votre commande a été annulée."
        icon = '❌'
        break
      default:
        return // Ne rien afficher pour les autres statuts
    }

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
