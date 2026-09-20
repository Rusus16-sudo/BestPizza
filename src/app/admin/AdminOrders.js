'use client'

import { useState, useEffect, useCallback } from 'react'
import { getBrowserClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import { formatPrice } from '@/context/CartContext'
import styles from './AdminOrders.module.css'

const STATUS = {
  paiement: { label: 'Paiement en attente', tone: 'wait' },
  en_attente: { label: 'En attente', tone: 'wait' },
  en_preparation: { label: 'En préparation', tone: 'cook' },
  prete: { label: 'Prête', tone: 'ready' },
  en_route: { label: 'En route', tone: 'road' },
  livre: { label: 'Livrée', tone: 'done' },
  annule: { label: 'Annulée', tone: 'cancel' },
}
const ACTIVE = ['en_attente', 'en_preparation', 'prete', 'en_route']

const FILTERS = [
  { id: 'active', label: 'En cours' },
  { id: 'paiement', label: 'À payer' },
  { id: 'livre', label: 'Livrées' },
  { id: 'annule', label: 'Annulées' },
]

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function quartierOf(address) {
  const m = /Quartier:\s*([^|]+)/.exec(address || '')
  return (m ? m[1] : address || '').trim()
}

export default function AdminOrders() {
  const [supabase] = useState(() => getBrowserClient())
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')
  const [toCancel, setToCancel] = useState(null)

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, short_id, status, total_amount, created_at, delivery_address, customer_name, payment_method, payment_status,
        driver:profiles!orders_driver_id_fkey ( email ),
        order_items ( product_name, quantity )
      `)
      .gte('created_at', startOfToday().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Commandes gérant:', error.message)
      toast.error('Les commandes n’ont pas pu être chargées.')
    } else {
      setOrders(data)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchOrders()
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchOrders])

  const cancelOrder = async () => {
    const order = toCancel
    setToCancel(null)
    const { error } = await supabase.from('orders').update({ status: 'annule' }).eq('id', order.id)
    if (error) {
      toast.error("La commande n'a pas pu être annulée.")
      return
    }
    toast.success(`Commande ${order.short_id} annulée`)
    fetchOrders()
  }

  const delivered = orders.filter(o => o.status === 'livre')
  const revenue = delivered.reduce((s, o) => s + Number(o.total_amount || 0), 0)
  const active = orders.filter(o => ACTIVE.includes(o.status))
  const visible = filter === 'active' ? active : orders.filter(o => o.status === filter)

  return (
    <div>
      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>En cours</dt>
          <dd>{active.length}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Livrées aujourd’hui</dt>
          <dd>{delivered.length}</dd>
        </div>
        <div className={`${styles.stat} ${styles.statStrong}`}>
          <dt>Chiffre du jour</dt>
          <dd>{formatPrice(revenue)}</dd>
        </div>
      </dl>

      <div className={styles.filters} role="tablist" aria-label="Filtrer les commandes">
        {FILTERS.map(f => {
          const n = f.id === 'active' ? active.length : orders.filter(o => o.status === f.id).length
          return (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              className={`${styles.filter} ${filter === f.id ? styles.filterActive : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label} <span>{n}</span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className={styles.skeleton} />
      ) : visible.length === 0 ? (
        <p className={styles.empty}>
          {filter === 'active' ? 'Aucune commande en cours. Les nouvelles commandes apparaissent ici en temps réel.' : 'Rien pour aujourd’hui.'}
        </p>
      ) : (
        <ul className={styles.list}>
          {visible.map(order => {
            const st = STATUS[order.status] || { label: order.status, tone: 'wait' }
            return (
              <li key={order.id} className={styles.row}>
                <div className={styles.main}>
                  <div className={styles.topLine}>
                    <strong className={styles.id}>{order.short_id}</strong>
                    <span className={`${styles.badge} ${styles[st.tone]}`}>{st.label}</span>
                    <time className={styles.time}>
                      {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                  <p className={styles.items}>
                    {order.order_items.map(i => `${i.quantity}× ${i.product_name}`).join(', ')}
                  </p>
                  <p className={styles.meta}>
                    {order.customer_name} — {quartierOf(order.delivery_address)}
                    {order.payment_status === 'paye'
                      ? <> — payé en ligne</>
                      : order.payment_method === 'mobile_money' ? <> — paiement en attente</> : <> — à encaisser</>}
                    {order.driver?.email && <> — livreur : {order.driver.email.split('@')[0]}</>}
                  </p>
                </div>
                <div className={styles.side}>
                  <span className={styles.total}>{formatPrice(order.total_amount)}</span>
                  {ACTIVE.includes(order.status) && (
                    <button className={styles.cancelBtn} onClick={() => setToCancel(order)}>Annuler</button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!toCancel}
        title="Annuler la commande ?"
        message={toCancel ? `${toCancel.short_id} sera annulée et le client en sera informé. Cette action est définitive.` : ''}
        confirmLabel="Annuler la commande"
        cancelLabel="Garder"
        danger
        onConfirm={cancelOrder}
        onCancel={() => setToCancel(null)}
      />
    </div>
  )
}
