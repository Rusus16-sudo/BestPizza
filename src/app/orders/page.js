'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './Orders.module.css'
import { mockOrders } from '@/data/orders'

export default function OrdersPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('en_cours') // 'en_cours' or 'historique'
  const [orders, setOrders] = useState([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const savedOrders = localStorage.getItem('pizza_orders')
    if (savedOrders) {
      try {
        setOrders(JSON.parse(savedOrders))
      } catch (e) {
        setOrders(mockOrders)
      }
    } else {
      setOrders(mockOrders)
      localStorage.setItem('pizza_orders', JSON.stringify(mockOrders))
    }
    setIsLoaded(true)
  }, [])

  const activeOrders = orders.filter(o => o.status === 'en_preparation' || o.status === 'en_route')
  const historyOrders = orders.filter(o => o.status === 'livre' || o.status === 'annule')

  const ordersToDisplay = activeTab === 'en_cours' ? activeOrders : historyOrders

  const getStatusDisplay = (status) => {
    switch(status) {
      case 'en_preparation':
        return { 
          label: 'En préparation', 
          icon: <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
          class: styles.status_en_preparation 
        }
      case 'en_route':
        return { 
          label: 'En route', 
          icon: <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>, 
          class: styles.status_en_route 
        }
      case 'livre':
        return { 
          label: 'Livré', 
          icon: <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>, 
          class: styles.status_livre 
        }
      case 'annule':
        return { 
          label: 'Annulé', 
          icon: <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>, 
          class: styles.status_annule 
        }
      default:
        return { label: status, icon: null, class: '' }
    }
  }

  const formatDate = (dateString) => {
    const options = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  }

  if (!isLoaded) {
    return <div className={styles.container}>Chargement...</div>
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h1>Commandes</h1>
      </header>

      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tab} ${activeTab === 'en_cours' ? styles.active : ''}`}
          onClick={() => setActiveTab('en_cours')}
        >
          En cours
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'historique' ? styles.active : ''}`}
          onClick={() => setActiveTab('historique')}
        >
          Historique
        </button>
      </div>

      <div className={styles.ordersList}>
        {ordersToDisplay.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <p>Aucune commande à afficher.</p>
          </div>
        ) : (
          ordersToDisplay.map(order => {
            const statusInfo = getStatusDisplay(order.status)
            return (
              <div key={order.id} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <div>
                    <div className={styles.orderId}>{order.id}</div>
                    <div className={styles.orderDate}>{formatDate(order.date)} • {order.restaurant}</div>
                  </div>
                  <div className={`${styles.orderStatus} ${statusInfo.class}`}>
                    <span>{statusInfo.icon}</span> {statusInfo.label}
                  </div>
                </div>

                <div className={styles.orderDetails}>
                  {order.items.map((item, idx) => (
                    <div key={idx} className={styles.orderItem}>
                      <span>{item.quantity}x {item.name}</span>
                      <span>{item.price} FCFA</span>
                    </div>
                  ))}
                </div>

                <div className={styles.orderTotalRow}>
                  <div>
                    <span className={styles.totalLabel}>Total : </span>
                    <span className={styles.totalPrice}>{order.total} FCFA</span>
                  </div>
                  
                  {activeTab === 'historique' && order.status === 'livre' && (
                    <button className={styles.reorderBtn} onClick={() => alert('Plats ajoutés au panier !')}>
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                        <polyline points="1 4 1 10 7 10"></polyline>
                        <polyline points="23 20 23 14 17 14"></polyline>
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                      </svg>
                      Recommander
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
