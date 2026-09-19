'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'
import TrackingMap from '@/components/TrackingMap'
import ConfirmDialog from '@/components/ConfirmDialog'
import { formatPrice } from '@/context/CartContext'
import styles from './Delivery.module.css'

// "Quartier: X | Tél: Y | Paiement: Z"
function parseAddress(addressStr) {
  const out = { quartier: addressStr || 'Adresse non précisée', phone: '', payment: 'Paiement à la livraison' }
  if (!addressStr || !addressStr.includes('|')) return out
  addressStr.split('|').map(p => p.trim()).forEach(p => {
    if (p.startsWith('Quartier:')) out.quartier = p.replace('Quartier:', '').trim()
    else if (p.startsWith('Tél:')) out.phone = p.replace('Tél:', '').trim()
    else if (p.startsWith('Paiement:')) out.payment = p.replace('Paiement:', '').trim()
  })
  return out
}

const isCash = (payment) => payment === 'Paiement à la livraison' || /esp[eè]ces/i.test(payment)

export default function DeliveryPage() {
  const [supabase] = useState(() => createClient())
  const [userId, setUserId] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [driverPosition, setDriverPosition] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [confirmOrder, setConfirmOrder] = useState(null)
  const myOrdersRef = useRef([])
  const channelsRef = useRef(new Map())

  const fetchOrders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, short_id, status, customer_name, delivery_address, total_amount, created_at, driver_id,
        order_items ( product_name, quantity )
      `)
      .in('status', ['prete', 'en_route'])
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Livraisons:', error.message)
      setLoadError(error.message)
      setLoading(false)
      return
    }
    setLoadError(null)
    setOrders(data)
    myOrdersRef.current = data.filter(o => o.status === 'en_route' && o.driver_id === user.id)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchOrders()
    const channel = supabase
      .channel('delivery-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchOrders])

  // Position GPS partagée avec les clients de MES livraisons en cours,
  // sur un canal ouvert une seule fois par commande.
  useEffect(() => {
    if (!('geolocation' in navigator)) return
    const channels = channelsRef.current
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude }
        setDriverPosition(pos)
        const activeIds = new Set(myOrdersRef.current.map(o => o.id))

        for (const [id, ch] of channels) {
          if (!activeIds.has(id)) {
            supabase.removeChannel(ch)
            channels.delete(id)
          }
        }
        for (const id of activeIds) {
          let ch = channels.get(id)
          if (!ch) {
            ch = supabase.channel(`tracking_${id}`)
            ch.subscribe()
            channels.set(id, ch)
          }
          ch.send({ type: 'broadcast', event: 'location', payload: pos })
        }
      },
      (error) => console.error('Erreur GPS:', error.message),
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    return () => {
      navigator.geolocation.clearWatch(watchId)
      for (const ch of channels.values()) supabase.removeChannel(ch)
      channels.clear()
    }
  }, [supabase])

  const takeOrder = async (order) => {
    setBusyId(order.id)
    // Ne réussit que si personne ne l'a prise entre-temps
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'en_route', driver_id: userId })
      .eq('id', order.id)
      .eq('status', 'prete')
      .is('driver_id', null)
      .select('id')
    setBusyId(null)
    if (error) {
      toast.error("La commande n'a pas pu être prise. Vérifiez la connexion.")
      return
    }
    if (!data || data.length === 0) {
      toast.error('Un autre livreur a déjà pris cette commande.')
    } else {
      toast.success(`Commande ${order.short_id} prise en charge`)
    }
    fetchOrders()
  }

  const markDelivered = async () => {
    const order = confirmOrder
    setConfirmOrder(null)
    setBusyId(order.id)
    const { error } = await supabase.from('orders').update({ status: 'livre' }).eq('id', order.id)
    setBusyId(null)
    if (error) {
      toast.error("La livraison n'a pas pu être enregistrée. Réessayez.")
      return
    }
    toast.success(`Commande ${order.short_id} livrée`)
    fetchOrders()
  }

  const mine = orders.filter(o => o.status === 'en_route' && o.driver_id === userId)
  const available = orders.filter(o => o.status === 'prete' && !o.driver_id)

  const renderItems = (order) => (
    <p className={styles.items}>
      {order.order_items.map(i => `${i.quantity}× ${i.product_name}`).join(', ')}
    </p>
  )

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Livraisons</h1>
        <p>{mine.length > 0 ? `${mine.length} en cours` : 'Aucune livraison en cours'}</p>
      </header>

      {loadError && (
        <div className={styles.errorBox} role="alert">
          Les livraisons n’ont pas pu être chargées. Si le problème persiste, prévenez le gérant.
        </div>
      )}

      <section className={styles.section} aria-labelledby="mine-title">
        <h2 id="mine-title" className={styles.sectionTitle}>Mes livraisons</h2>

        {loading ? (
          <div className={styles.skeleton} />
        ) : mine.length === 0 ? (
          <p className={styles.empty}>Prenez une commande prête ci-dessous pour démarrer.</p>
        ) : (
          <>
            <div className={styles.map}>
              <TrackingMap position={driverPosition} />
              <p className={styles.mapNote}>Votre position est partagée avec vos clients pendant la livraison.</p>
            </div>
            <div className={styles.list}>
              {mine.map(order => {
                const { quartier, phone, payment } = parseAddress(order.delivery_address)
                const cash = isCash(payment)
                return (
                  <article key={order.id} className={`${styles.card} ${styles.cardMine}`}>
                    <div className={styles.cardHead}>
                      <span className={styles.orderId}>{order.short_id}</span>
                      <span className={styles.customer}>{order.customer_name}</span>
                    </div>

                    <p className={styles.address}>{quartier}</p>

                    <div className={`${styles.amount} ${cash ? styles.amountCash : ''}`}>
                      <span>{cash ? 'À encaisser' : 'Mobile Money'}</span>
                      <strong>{formatPrice(order.total_amount)}</strong>
                    </div>

                    {renderItems(order)}

                    <div className={styles.quickActions}>
                      {phone ? (
                        <a href={`tel:${phone.replace(/\s/g, '')}`} className={styles.secondaryBtn}>
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                          Appeler
                        </a>
                      ) : (
                        <span className={`${styles.secondaryBtn} ${styles.disabled}`}>Pas de numéro</span>
                      )}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(quartier)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.secondaryBtn}
                      >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
                        Itinéraire
                      </a>
                    </div>

                    <button
                      className={styles.primaryBtn}
                      onClick={() => setConfirmOrder(order)}
                      disabled={busyId === order.id}
                    >
                      {busyId === order.id ? 'Enregistrement…' : 'Commande livrée'}
                    </button>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </section>

      <section className={styles.section} aria-labelledby="available-title">
        <h2 id="available-title" className={styles.sectionTitle}>
          À récupérer <span className={styles.count}>{available.length}</span>
        </h2>

        {loading ? (
          <div className={styles.skeleton} />
        ) : available.length === 0 ? (
          <p className={styles.empty}>Aucune commande prête pour le moment. Elles apparaissent ici dès que la cuisine les termine.</p>
        ) : (
          <div className={styles.list}>
            {available.map(order => {
              const { quartier } = parseAddress(order.delivery_address)
              return (
                <article key={order.id} className={styles.card}>
                  <div className={styles.cardHead}>
                    <span className={styles.orderId}>{order.short_id}</span>
                    <span className={styles.amountSmall}>{formatPrice(order.total_amount)}</span>
                  </div>
                  <p className={styles.address}>{quartier}</p>
                  {renderItems(order)}
                  <button className={styles.takeBtn} onClick={() => takeOrder(order)} disabled={busyId === order.id}>
                    {busyId === order.id ? 'Prise en charge…' : 'Je la prends'}
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!confirmOrder}
        title="Commande livrée ?"
        message={confirmOrder ? `Confirmez que ${confirmOrder.short_id} a été remise au client${isCash(parseAddress(confirmOrder.delivery_address).payment) ? ` et que vous avez encaissé ${formatPrice(confirmOrder.total_amount)}` : ''}.` : ''}
        confirmLabel="Oui, livrée"
        onConfirm={markDelivered}
        onCancel={() => setConfirmOrder(null)}
      />
    </div>
  )
}
