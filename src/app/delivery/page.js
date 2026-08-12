'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'
import TrackingMap from '@/components/TrackingMap'
import styles from './Delivery.module.css'

export default function DeliveryPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState('')
  const [driverPosition, setDriverPosition] = useState(null)
  const ordersRef = useRef([])
  const supabase = createClient()

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        short_id,
        status,
        customer_name,
        delivery_address,
        total_amount,
        created_at,
        order_items (
          product_name,
          quantity
        )
      `)
      .eq('status', 'en_route')
      .order('created_at', { ascending: true })

    if (data) {
      setOrders(data)
      ordersRef.current = data
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()

    // Realtime subscription
    const channel = supabase
      .channel('public:orders:delivery')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        fetchOrders()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Start GPS tracking
  useEffect(() => {
    let watchId;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setDriverPosition(newPos);
          
          // Broadcast to all active orders
          ordersRef.current.forEach(order => {
            const channel = supabase.channel(`tracking_${order.id}`);
            channel.subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                channel.send({
                  type: 'broadcast',
                  event: 'location',
                  payload: newPos
                });
              }
            });
          });
        },
        (error) => console.error("Erreur GPS:", error),
        { enableHighAccuracy: true }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [supabase])

  const handleDeliver = async (id) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'livre' })
      .eq('id', id)

    if (error) {
      console.error('Erreur lors de la mise à jour:', error)
      toast.error("Erreur lors de la mise à jour du statut")
    } else {
      setToastMessage("Commande marquée comme livrée ! ✅")
      setTimeout(() => setToastMessage(''), 3000)
    }
  }

  const formatAddress = (addressStr) => {
    if (!addressStr) return { quartier: 'Adresse non précisée', phone: '', payment: '' };
    
    // addressStr looks like: "Quartier: X | Tél: Y | Paiement: Z"
    if (!addressStr.includes('Quartier:') && !addressStr.includes('|')) {
      // Old format where it was just the neighborhood string
      return { quartier: addressStr, phone: 'Non renseigné', payment: 'Espèces (Par défaut)' };
    }

    const parts = addressStr.split('|').map(p => p.trim());
    let quartier = '', phone = '', payment = '';
    
    parts.forEach(p => {
      if (p.startsWith('Quartier:')) quartier = p.replace('Quartier:', '').trim();
      else if (p.startsWith('Tél:')) phone = p.replace('Tél:', '').trim();
      else if (p.startsWith('Paiement:')) payment = p.replace('Paiement:', '').trim();
    });
    
    return { 
      quartier: quartier || addressStr, 
      phone: phone || 'Non renseigné', 
      payment: payment || 'Espèces'
    };
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerIcon}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2.5" fill="none">
            <rect x="1" y="3" width="15" height="13"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
          </svg>
        </div>
        <h1>Espace Livreur</h1>
      </header>

      <div className={styles.content}>
        <h2 className={styles.sectionTitle}>
          Commandes prêtes à livrer
          <span className={styles.badge}>{orders.length}</span>
        </h2>
        
        {loading ? (
          <div className={styles.loading}>Chargement des commandes...</div>
        ) : orders.length === 0 ? (
          <div className={styles.emptyState}>
            <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1" fill="none">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <p>Aucune livraison en attente pour le moment.</p>
          </div>
        ) : (
          <div className={styles.ordersGrid}>
            {orders.map(order => {
              const { quartier, phone, payment } = formatAddress(order.delivery_address);
              
              return (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.orderHeader}>
                    <span className={styles.orderId}>{order.short_id}</span>
                    <span className={styles.orderAmount}>{order.total_amount} FCFA</span>
                  </div>
                  
                  <div className={styles.customerInfo}>
                    <div className={styles.infoRow}>
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <strong>{order.customer_name}</strong>
                    </div>
                    
                    <div className={styles.infoRow}>
                      <div className={styles.iconBox}>
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                      </div>
                      <div className={styles.infoContent}>
                        <span className={styles.infoLabel}>Adresse de livraison</span>
                        <span>{quartier}</span>
                      </div>
                    </div>

                    <div className={styles.infoRow}>
                      <div className={styles.iconBox}>
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                      </div>
                      <div className={styles.infoContent}>
                        <span className={styles.infoLabel}>Téléphone</span>
                        {phone !== 'Non renseigné' ? (
                          <a href={`tel:${phone}`} className={styles.phoneLink}>{phone}</a>
                        ) : (
                          <span>{phone}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className={styles.infoRow}>
                      <div className={styles.iconBox}>
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                          <rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect>
                          <circle cx="12" cy="12" r="2"></circle>
                          <path d="M6 12h.01M18 12h.01"></path>
                        </svg>
                      </div>
                      <div className={styles.infoContent}>
                        <span className={styles.infoLabel}>Mode de paiement</span>
                        <span className={styles.paymentMethod}>{payment}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                    <TrackingMap position={driverPosition} />
                    <p style={{ fontSize: '0.8rem', color: '#6b7280', textAlign: 'center', marginTop: '4px' }}>
                      Votre position est partagée en temps réel avec le client
                    </p>
                  </div>
                  
                  {order.order_items && order.order_items.length > 0 && (
                    <div className={styles.orderItems}>
                      {order.order_items.map((item, idx) => (
                        <div key={idx} className={styles.itemRow}>
                          <span className={styles.itemQty}>{item.quantity}x</span>
                          <span className={styles.itemName}>{item.product_name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button 
                    className={styles.deliverBtn}
                    onClick={() => handleDeliver(order.id)}
                  >
                    Marquer comme Livré
                  </button>
                </div>
              )
            })}
          </div>
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
