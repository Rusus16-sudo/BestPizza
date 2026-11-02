'use client'

import { useState, useEffect, useCallback } from 'react'
import { getBrowserClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import { formatPrice } from '@/context/CartContext'
import { getStaffMembership } from '@/lib/staff'
import { DELIVERY_ISSUES } from '@/lib/delivery-issues'
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

// Une commande qui traîne à une étape : au-delà de ces minutes, le gérant est alerté
const LATE_AFTER = {
  en_attente: { minutes: 10, since: 'created_at', message: 'pas encore lancée en cuisine' },
  en_preparation: { minutes: 30, since: 'accepted_at', message: 'longue à préparer' },
  prete: { minutes: 15, since: 'ready_at', message: 'attend un livreur' },
  en_route: { minutes: 45, since: 'picked_at', message: 'longue à livrer' },
}

const minutesSince = (date, now) => Math.max(0, Math.floor((now - new Date(date).getTime()) / 60000))

/** { minutes, late, message } : depuis combien de temps la commande est à son étape. */
function stepTiming(order, now) {
  const rule = LATE_AFTER[order.status]
  if (!rule) return null
  const minutes = minutesSince(order[rule.since] || order.created_at, now)
  return { minutes, late: minutes >= rule.minutes, message: rule.message }
}

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
  const [toUnassign, setToUnassign] = useState(null)
  const [locations, setLocations] = useState([])
  const [locationFilter, setLocationFilter] = useState('all')
  const [now, setNow] = useState(() => Date.now())

  // Les minutes écoulées avancent toutes seules
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  // Ses points de vente, pour filtrer quand le restaurant en a plusieurs
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const membership = await getStaffMembership(supabase, user?.id)
      if (!membership || membership.location_id) return
      const { data } = await supabase.from('locations').select('id, name').eq('organization_id', membership.organization_id).order('created_at')
      setLocations(data || [])
    }
    load()
  }, [supabase])

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, short_id, status, total_amount, created_at, delivery_address, customer_name, payment_method, payment_status,
        location_id, accepted_at, ready_at, picked_at, delivery_issue,
        driver:profiles!orders_driver_id_fkey ( email ),
        order_items ( product_name, quantity )
      `)
      // Celles du jour, et celles encore en cours même passées avant minuit
      .or(`created_at.gte.${startOfToday().toISOString()},status.in.(paiement,${ACTIVE.join(',')})`)
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

  // Le livreur ne répond plus : la commande redevient « prête » pour un autre livreur
  const unassignOrder = async () => {
    const order = toUnassign
    setToUnassign(null)
    const { error } = await supabase
      .from('orders')
      .update({ status: 'prete', driver_id: null, picked_at: null, ready_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', 'en_route')
    if (error) {
      toast.error("La commande n'a pas pu être retirée au livreur.")
      return
    }
    toast.success(`${order.short_id} est de nouveau proposée aux livreurs`)
    fetchOrders()
  }

  const today = startOfToday()
  const delivered = orders.filter(o => o.status === 'livre' && new Date(o.created_at) >= today)
  const revenue = delivered.reduce((s, o) => s + Number(o.total_amount || 0), 0)
  const atLocation = locationFilter === 'all' ? orders : orders.filter(o => o.location_id === locationFilter)
  const active = atLocation.filter(o => ACTIVE.includes(o.status))
  // Les commandes en retard ou avec un problème passent en premier
  const urgent = (o) => Boolean(o.delivery_issue) || Boolean(stepTiming(o, now)?.late)
  const visible = filter === 'active'
    ? [...active].sort((a, b) => urgent(b) - urgent(a))
    : atLocation.filter(o => o.status === filter)
  const urgentCount = active.filter(urgent).length
  const locationName = (id) => locations.find(l => l.id === id)?.name

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

      {urgentCount > 0 && (
        <p className={styles.alert} role="alert">
          ⚠️ {urgentCount} commande{urgentCount > 1 ? 's demandent' : ' demande'} votre attention : en retard ou avec un problème de livraison.
        </p>
      )}

      {locations.length > 1 && (
        <div className={styles.locations} role="tablist" aria-label="Point de vente">
          {[{ id: 'all', name: 'Tous les points de vente' }, ...locations].map(l => (
            <button
              key={l.id}
              role="tab"
              aria-selected={locationFilter === l.id}
              className={`${styles.location} ${locationFilter === l.id ? styles.locationActive : ''}`}
              onClick={() => setLocationFilter(l.id)}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}

      <div className={styles.filters} role="tablist" aria-label="Filtrer les commandes">
        {FILTERS.map(f => {
          const n = f.id === 'active' ? active.length : atLocation.filter(o => o.status === f.id).length
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
            const timing = stepTiming(order, now)
            return (
              <li key={order.id} className={`${styles.row} ${urgent(order) ? styles.rowUrgent : ''}`}>
                <div className={styles.main}>
                  <div className={styles.topLine}>
                    <strong className={styles.id}>{order.short_id}</strong>
                    <span className={`${styles.badge} ${styles[st.tone]}`}>{st.label}</span>
                    <time className={styles.time}>
                      {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </time>
                    {timing && (
                      <span className={`${styles.elapsed} ${timing.late ? styles.elapsedLate : ''}`}>
                        {timing.late ? `En retard · ${timing.message} (${timing.minutes} min)` : `depuis ${timing.minutes} min`}
                      </span>
                    )}
                  </div>
                  {order.delivery_issue && order.status === 'en_route' && (
                    <p className={styles.issue}>⚠️ Le livreur signale : {DELIVERY_ISSUES[order.delivery_issue]?.staff}.</p>
                  )}
                  <p className={styles.items}>
                    {order.order_items.map(i => `${i.quantity}× ${i.product_name}`).join(', ')}
                  </p>
                  <p className={styles.meta}>
                    {order.customer_name} — {quartierOf(order.delivery_address)}
                    {order.payment_status === 'paye'
                      ? <> — payé en ligne</>
                      : order.payment_method === 'mobile_money' ? <> — paiement en attente</> : <> — à encaisser</>}
                    {order.driver?.email && <> — livreur : {order.driver.email.split('@')[0]}</>}
                    {locations.length > 1 && locationName(order.location_id) && <> — {locationName(order.location_id)}</>}
                  </p>
                </div>
                <div className={styles.side}>
                  <span className={styles.total}>{formatPrice(order.total_amount)}</span>
                  {order.status === 'en_route' && (
                    <button className={styles.unassignBtn} onClick={() => setToUnassign(order)}>Retirer au livreur</button>
                  )}
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

      <ConfirmDialog
        open={!!toUnassign}
        title="Retirer la commande au livreur ?"
        message={toUnassign ? `${toUnassign.short_id} redevient « prête » : les livreurs sont prévenus et un autre pourra la prendre. Prévenez le livreur actuel.` : ''}
        confirmLabel="Retirer au livreur"
        cancelLabel="Garder"
        onConfirm={unassignOrder}
        onCancel={() => setToUnassign(null)}
      />
    </div>
  )
}
