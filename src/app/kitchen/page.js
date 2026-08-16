'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'
import SkeletonList from '@/components/SkeletonList'
import styles from './Kitchen.module.css'

export default function KitchenPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState('')
  const supabase = createClient()

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        short_id,
        status,
        special_instructions,
        created_at,
        order_items (
          product_name,
          quantity,
          size
        )
      `)
      .in('status', ['en_attente', 'en_preparation'])
      .order('created_at', { ascending: true })

    if (data) {
      setOrders(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()

    // Realtime subscription
    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        console.log('Changement détecté dans orders:', payload)
        fetchOrders()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const updateOrderStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      console.error('Erreur lors de la mise à jour:', error)
      toast.error("Erreur lors de la mise à jour du statut")
    } else {
      setToastMessage("Statut de la commande mis à jour avec succès !")
      setTimeout(() => setToastMessage(''), 3000)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR', { 
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit' 
    })
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Tableau de Bord - Cuisine</h1>
          <p>Gérez les commandes en cours de préparation.</p>
        </header>
        <div style={{ marginTop: '24px' }}>
          <SkeletonList count={3} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg viewBox="0 0 24 24" width="36" height="36" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          <h1>Écran Cuisine</h1>
        </div>
        <div className={styles.statusIndicator}>
          <div className={styles.liveDot}></div>
          En direct
        </div>
      </header>

      <div className={styles.grid}>
        {orders.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>Aucune commande en attente</h2>
            <p>La cuisine est calme pour le moment.</p>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className={styles.orderCard}>
              <div className={styles.orderHeader}>
                <div>
                  <div className={styles.orderId}>{order.short_id}</div>
                  <div className={styles.orderTime}>{formatDate(order.created_at)}</div>
                </div>
                <div className={`${styles.orderStatus} ${styles['status_' + order.status]}`}>
                  {order.status === 'en_attente' ? 'À préparer' : 'En préparation'}
                </div>
              </div>

              <div className={styles.orderItems}>
                {order.order_items.map((item, idx) => (
                  <div key={idx} className={styles.item}>
                    <div>
                      <span className={styles.qty}>{item.quantity}x</span>
                      {item.product_name}
                    </div>
                    {item.size !== 'Moyenne' && (
                      <span style={{fontSize: '0.8rem', color: '#666'}}>({item.size})</span>
                    )}
                  </div>
                ))}
              </div>

              {order.special_instructions && (
                <div className={styles.instructionsBox}>
                  <div className={styles.instructionsTitle}>Instructions du client:</div>
                  <div className={styles.instructionsText}>{order.special_instructions}</div>
                </div>
              )}

              <div className={styles.actions}>
                {order.status === 'en_attente' && (
                  <button 
                    className={styles.btnPrepare}
                    onClick={() => updateOrderStatus(order.id, 'en_preparation')}
                  >
                    Commencer la préparation
                  </button>
                )}
                {order.status === 'en_preparation' && (
                  <button 
                    className={styles.btnReady}
                    onClick={() => updateOrderStatus(order.id, 'en_route')}
                  >
                    Marquer comme Prêt
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {toastMessage && (
        <div className="globalToast">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="#10b981" strokeWidth="2" fill="none">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {toastMessage}
        </div>
      )}
    </div>
  )
}
