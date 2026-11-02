'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getBrowserClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'
import TrackingMap from '@/components/TrackingMap'
import ConfirmDialog from '@/components/ConfirmDialog'
import PushOptIn from '@/components/PushOptIn'
import { formatPrice } from '@/context/CartContext'
import { parseAddress, isCash } from '@/lib/delivery-address'
import { DELIVERY_ISSUES } from '@/lib/delivery-issues'
import styles from './Delivery.module.css'

// Position du livreur enregistrée au plus toutes les 15 s
const SEND_EVERY_MS = 15000

export default function DeliveryPage() {
  const [supabase] = useState(() => getBrowserClient())
  const [userId, setUserId] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [driverPosition, setDriverPosition] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [confirmOrder, setConfirmOrder] = useState(null)
  // La commande dont le livreur choisit le problème à signaler
  const [issueFor, setIssueFor] = useState(null)
  const myOrdersRef = useRef([])
  const lastSentRef = useRef(0)

  const fetchOrders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, short_id, status, customer_name, delivery_address, total_amount, created_at, driver_id, payment_method, payment_status,
        delivery_lat, delivery_lng, delivery_issue,
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

  const mine = orders.filter(o => o.status === 'en_route' && o.driver_id === userId)
  const delivering = mine.length > 0

  // Pendant une livraison seulement : la position GPS, enregistrée toutes les 15 s pour
  // chacune de MES commandes en route. Le client la voit sur son suivi, même si mon
  // téléphone perd la connexion un moment (il voit alors « il y a 2 min »).
  useEffect(() => {
    if (!delivering || !('geolocation' in navigator)) return
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude }
        setDriverPosition(pos)
        if (Date.now() - lastSentRef.current < SEND_EVERY_MS) return
        lastSentRef.current = Date.now()
        const rows = myOrdersRef.current.map(o => ({ order_id: o.id, driver_id: userId, ...pos, updated_at: new Date().toISOString() }))
        if (rows.length === 0) return
        const { error } = await supabase.from('driver_positions').upsert(rows)
        if (error) console.error('Position du livreur:', error.message)
      },
      (error) => console.error('Erreur GPS:', error.message),
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [supabase, delivering, userId])

  // L'écran reste allumé pendant une livraison : un téléphone en veille n'envoie plus sa position
  useEffect(() => {
    if (!delivering || !('wakeLock' in navigator)) return
    let lock = null
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {}
    }
    // Le navigateur la relâche quand on quitte l'onglet : on la reprend au retour
    const onVisible = () => { if (document.visibilityState === 'visible') acquire() }
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [delivering])

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

  const reportIssue = async (order, issue) => {
    setIssueFor(null)
    setBusyId(order.id)
    try {
      const res = await fetch('/api/orders/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, issue }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Le signalement n’a pas pu être envoyé.')
      toast.success('Le gérant et le client sont prévenus')
      fetchOrders()
    } catch (err) {
      toast.error(err.message)
    }
    setBusyId(null)
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

      <PushOptIn
        required
        className={styles.pushOptIn}
        title="Soyez prévenu des commandes prêtes"
        description="Une notification dès qu’une commande attend un livreur, même app fermée."
      />

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
              <TrackingMap position={driverPosition} destination={mine.length === 1 && mine[0].delivery_lat != null ? { lat: mine[0].delivery_lat, lng: mine[0].delivery_lng } : null} />
              <p className={styles.mapNote}>Votre position est partagée avec vos clients pendant la livraison. Gardez cette page ouverte.</p>
            </div>
            <div className={styles.list}>
              {mine.map(order => {
                const { quartier, phone, payment } = parseAddress(order.delivery_address)
                // Une commande réglée en ligne ne se paie pas au client
                const cash = order.payment_status !== 'paye' && isCash(payment)
                return (
                  <article key={order.id} className={`${styles.card} ${styles.cardMine}`}>
                    <div className={styles.cardHead}>
                      <span className={styles.orderId}>{order.short_id}</span>
                      <span className={styles.customer}>{order.customer_name}</span>
                    </div>

                    <p className={styles.address}>{quartier}</p>

                    <div className={`${styles.amount} ${cash ? styles.amountCash : ''}`}>
                      <span>{cash ? 'À encaisser' : 'Déjà payé'}</span>
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
                        href={order.delivery_lat != null
                          // Le client a partagé sa position : l'itinéraire va jusqu'à sa porte
                          ? `https://www.google.com/maps/dir/?api=1&destination=${order.delivery_lat},${order.delivery_lng}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(quartier)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.secondaryBtn}
                      >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
                        Itinéraire
                      </a>
                    </div>

                    {order.delivery_issue && (
                      <p className={styles.issueNote}>⚠️ Signalé : {DELIVERY_ISSUES[order.delivery_issue]?.label}. Le gérant est prévenu.</p>
                    )}

                    <button
                      className={styles.primaryBtn}
                      onClick={() => setConfirmOrder(order)}
                      disabled={busyId === order.id}
                    >
                      {busyId === order.id ? 'Enregistrement…' : 'Commande livrée'}
                    </button>

                    {issueFor === order.id ? (
                      <div className={styles.issues} role="group" aria-label="Quel problème ?">
                        {Object.entries(DELIVERY_ISSUES).map(([id, issue]) => (
                          <button key={id} type="button" className={styles.issueBtn} onClick={() => reportIssue(order, id)}>{issue.label}</button>
                        ))}
                        <button type="button" className={styles.issueCancel} onClick={() => setIssueFor(null)}>Annuler</button>
                      </div>
                    ) : (
                      <button type="button" className={styles.issueLink} onClick={() => setIssueFor(order.id)} disabled={busyId === order.id}>
                        Signaler un problème
                      </button>
                    )}
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
