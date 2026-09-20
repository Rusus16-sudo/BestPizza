'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '@/utils/supabase/client'
import { formatPrice } from '@/context/CartContext'
import BarChart from './BarChart'
import { formatDuration } from '@/lib/format'
import styles from './AdminDashboard.module.css'

const PERIODS = [
  { id: 'today', label: "Aujourd'hui", compare: 'hier à la même heure' },
  { id: '7d', label: '7 jours', compare: 'les 7 jours précédents' },
  { id: '30d', label: '30 jours', compare: 'les 30 jours précédents' },
]

const LIVE = [
  { status: 'en_attente', label: 'En attente', tone: 'wait' },
  { status: 'en_preparation', label: 'Au four', tone: 'cook' },
  { status: 'prete', label: 'Prêtes', tone: 'ready' },
  { status: 'en_route', label: 'En route', tone: 'road' },
]

const STATUS_LABEL = {
  paiement: 'Paiement en attente',
  en_attente: 'En attente', en_preparation: 'Au four', prete: 'Prête',
  en_route: 'En route', livre: 'Livrée', annule: 'Annulée',
}

const DAY = 86400000
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }

// Bornes de la période et de la période de comparaison
function ranges(period, now) {
  const today = startOfDay(now)
  if (period === 'today') {
    return { start: today, prevStart: new Date(today - DAY), prevEnd: new Date(now - DAY), days: 1 }
  }
  const days = period === '7d' ? 7 : 30
  const start = new Date(today - (days - 1) * DAY)
  return { start, prevStart: new Date(start - days * DAY), prevEnd: start, days }
}

const sumRevenue = (list) => list.filter(o => o.status === 'livre').reduce((s, o) => s + Number(o.total_amount || 0), 0)

function greeting(date) {
  const h = date.getHours()
  return h < 5 || h >= 18 ? 'Bonsoir' : 'Bonjour'
}

export default function AdminDashboard() {
  const [supabase] = useState(() => getBrowserClient())
  const [period, setPeriod] = useState('today')
  const [orders, setOrders] = useState([])
  const [live, setLive] = useState([])
  const [rating, setRating] = useState(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => new Date())

  const fetchAll = useCallback(async () => {
    const current = new Date()
    const { prevStart } = ranges(period, current)

    const [ordersRes, liveRes, reviewsRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, short_id, status, total_amount, created_at, customer_name, payment_status, order_items ( product_name, quantity, price )')
        .gte('created_at', prevStart.toISOString())
        .order('created_at', { ascending: false }),
      supabase
        .from('orders')
        .select('id, status, created_at')
        .in('status', LIVE.map(l => l.status)),
      supabase.from('reviews').select('rating'),
    ])

    if (!ordersRes.error) setOrders(ordersRes.data)
    if (!liveRes.error) setLive(liveRes.data)
    if (!reviewsRes.error && reviewsRes.data.length > 0) {
      const avg = reviewsRes.data.reduce((s, r) => s + r.rating, 0) / reviewsRes.data.length
      setRating({ avg, count: reviewsRes.data.length })
    } else {
      setRating(null)
    }
    setNow(current)
    setLoading(false)
  }, [supabase, period])

  useEffect(() => {
    const loadName = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('first_name, email').eq('id', user.id).single()
      setName(data?.first_name || (data?.email || user.email || '').split('@')[0])
    }
    loadName()
  }, [supabase])

  useEffect(() => {
    fetchAll()
    const channel = supabase
      .channel('dashboard-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchAll())
      .subscribe()
    const tick = setInterval(() => setNow(new Date()), 60000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(tick)
    }
  }, [supabase, fetchAll])

  const stats = useMemo(() => {
    const { start, prevStart, prevEnd, days } = ranges(period, now)
    const inRange = (o, a, b) => { const t = new Date(o.created_at); return t >= a && t < b }
    const cur = orders.filter(o => new Date(o.created_at) >= start)
    const prev = orders.filter(o => inRange(o, prevStart, prevEnd))

    const revenue = sumRevenue(cur)
    const prevRevenue = sumRevenue(prev)
    const delivered = cur.filter(o => o.status === 'livre')
    // Une commande jamais payée n'est pas une commande
    const placed = cur.filter(o => o.status !== 'annule' && o.status !== 'paiement')
    const prevPlaced = prev.filter(o => o.status !== 'annule' && o.status !== 'paiement')

    // Histogramme : par heure aujourd'hui, par jour sinon
    let buckets
    if (period === 'today') {
      const hours = delivered.map(o => new Date(o.created_at).getHours())
      const from = Math.min(10, ...hours)
      const to = Math.max(22, ...hours)
      buckets = Array.from({ length: to - from + 1 }, (_, i) => {
        const h = from + i
        return {
          label: `${h} h – ${h + 1} h`,
          tick: h % 2 === 0 ? `${h} h` : '',
          value: delivered.filter(o => new Date(o.created_at).getHours() === h).reduce((s, o) => s + Number(o.total_amount || 0), 0),
        }
      })
    } else {
      buckets = Array.from({ length: days }, (_, i) => {
        const dayStart = new Date(start.getTime() + i * DAY)
        const dayEnd = new Date(dayStart.getTime() + DAY)
        const every = days > 7 ? 5 : 1
        return {
          label: dayStart.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
          tick: (days - 1 - i) % every === 0 ? dayStart.toLocaleDateString('fr-FR', days > 7 ? { day: 'numeric', month: 'numeric' } : { weekday: 'short' }).replace('.', '') : '',
          value: delivered.filter(o => inRange(o, dayStart, dayEnd)).reduce((s, o) => s + Number(o.total_amount || 0), 0),
        }
      })
    }

    // Plats les plus vendus sur la période (commandes non annulées)
    const byProduct = new Map()
    placed.forEach(o => (o.order_items || []).forEach(it => {
      const p = byProduct.get(it.product_name) || { name: it.product_name, qty: 0, revenue: 0 }
      p.qty += it.quantity
      p.revenue += Number(it.price || 0)
      byProduct.set(it.product_name, p)
    }))
    const top = [...byProduct.values()].sort((a, b) => b.qty - a.qty).slice(0, 5)

    return {
      revenue,
      delta: prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null,
      placed: placed.length,
      prevPlaced: prevPlaced.length,
      basket: delivered.length ? Math.round(revenue / delivered.length) : 0,
      cancelled: cur.filter(o => o.status === 'annule').length,
      buckets,
      top,
      recent: cur.slice(0, 5),
    }
  }, [orders, period, now])

  const liveCounts = LIVE.map(l => ({ ...l, count: live.filter(o => o.status === l.status).length }))
  const liveTotal = live.length
  const oldestWaiting = live
    .filter(o => o.status === 'en_attente' || o.status === 'en_preparation')
    .reduce((m, o) => Math.max(m, Math.floor((now - new Date(o.created_at)) / 60000)), 0)

  const periodInfo = PERIODS.find(p => p.id === period)
  const maxQty = Math.max(1, ...stats.top.map(t => t.qty))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.date}>{now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>{greeting(now)}{name ? `, ${name}` : ''}</h1>
        </div>
        <div className={styles.periods} role="tablist" aria-label="Période">
          {PERIODS.map(p => (
            <button
              key={p.id}
              role="tab"
              aria-selected={period === p.id}
              className={`${styles.period} ${period === p.id ? styles.periodActive : ''}`}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.grid}>
        {/* Le chiffre qui compte */}
        <section className={styles.hero} aria-labelledby="revenue-title">
          <div className={styles.heroTop}>
            <div>
              <h2 id="revenue-title" className={styles.heroLabel}>
                Chiffre d’affaires {period === 'today' ? "aujourd’hui" : `sur ${periodInfo.label}`}
              </h2>
              <p className={styles.heroValue}>
                {loading ? '—' : stats.revenue.toLocaleString('fr-FR')}
                <span className={styles.heroUnit}>FCFA</span>
              </p>
            </div>
            {!loading && (
              stats.delta === null ? (
                <p className={styles.deltaNeutral}>Pas de ventes {period === 'today' ? 'hier' : 'sur la période précédente'} pour comparer</p>
              ) : (
                <p className={`${styles.delta} ${stats.delta >= 0 ? styles.deltaUp : styles.deltaDown}`}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {stats.delta >= 0 ? <polyline points="4 15 12 7 20 15" /> : <polyline points="4 9 12 17 20 9" />}
                  </svg>
                  {stats.delta >= 0 ? '+' : ''}{stats.delta} % par rapport à {periodInfo.compare}
                </p>
              )
            )}
          </div>
          <BarChart
            data={stats.buckets}
            format={formatPrice}
            height={190}
            tone="dark"
            title={`Chiffre d’affaires ${period === 'today' ? 'par heure' : 'par jour'}`}
            emptyText={loading ? '' : 'Les ventes apparaîtront ici dès la première commande livrée.'}
          />
        </section>

        {/* Le service en direct */}
        <section className={styles.live} aria-labelledby="live-title">
          <div className={styles.cardHead}>
            <h2 id="live-title">Service en direct</h2>
            <span className={styles.liveBadge}><span className={styles.liveDot} />{liveTotal} en cours</span>
          </div>
          <ul className={styles.pipeline}>
            {liveCounts.map(l => (
              <li key={l.status} className={styles.stage}>
                <span className={`${styles.stageDot} ${styles[l.tone]}`} aria-hidden="true" />
                <span className={styles.stageLabel}>{l.label}</span>
                <strong className={styles.stageCount}>{l.count}</strong>
              </li>
            ))}
          </ul>
          {oldestWaiting >= 20 ? (
            <p className={styles.alert}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 7v5l3 2" /></svg>
              Une commande attend depuis {formatDuration(oldestWaiting)}
            </p>
          ) : (
            <p className={styles.calm}>{liveTotal > 0 ? 'Le service suit son cours.' : 'Aucune commande en cours pour le moment.'}</p>
          )}
          <Link href="/admin/commandes" className={styles.liveLink}>Suivre les commandes</Link>
        </section>

        {/* Chiffres clés */}
        <div className={styles.tiles}>
          <div className={styles.tile}>
            <span className={styles.tileLabel}>Commandes</span>
            <strong className={styles.tileValue}>{loading ? '—' : stats.placed}</strong>
            <span className={styles.tileHint}>
              {stats.cancelled > 0 ? `${stats.cancelled} annulée${stats.cancelled > 1 ? 's' : ''}` : `${stats.prevPlaced} sur ${period === 'today' ? 'hier' : 'la période précédente'}`}
            </span>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileLabel}>Panier moyen</span>
            <strong className={styles.tileValue}>{loading ? '—' : stats.basket ? formatPrice(stats.basket) : '—'}</strong>
            <span className={styles.tileHint}>par commande livrée</span>
          </div>
          <div className={styles.tile}>
            <span className={styles.tileLabel}>Note des clients</span>
            <strong className={styles.tileValue}>
              {rating ? (
                <>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--color-crust)" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  {rating.avg.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
                </>
              ) : '—'}
            </strong>
            <span className={styles.tileHint}>{rating ? `${rating.count} avis` : 'Aucun avis pour l’instant'}</span>
          </div>
        </div>

        {/* Plats vedettes */}
        <section className={`${styles.card} ${styles.wide}`} aria-labelledby="top-title">
          <div className={styles.cardHead}>
            <h2 id="top-title">Plats les plus vendus</h2>
            <Link href="/admin/carte" className={styles.cardLink}>Gérer la carte</Link>
          </div>
          {stats.top.length === 0 ? (
            <p className={styles.empty}>Votre classement apparaîtra avec les premières commandes.</p>
          ) : (
            <ol className={styles.topList}>
              {stats.top.map((t, i) => (
                <li key={t.name} className={styles.topItem}>
                  <span className={styles.rank}>{i + 1}</span>
                  <div className={styles.topBody}>
                    <div className={styles.topLine}>
                      <span className={styles.topName}>{t.name}</span>
                      <span className={styles.topQty}>{t.qty} vendu{t.qty > 1 ? 's' : ''}</span>
                    </div>
                    <div className={styles.track} aria-hidden="true">
                      <div className={styles.fill} style={{ width: `${(t.qty / maxQty) * 100}%` }} />
                    </div>
                    <span className={styles.topRevenue}>{formatPrice(t.revenue)}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Dernières commandes */}
        <section className={styles.card} aria-labelledby="recent-title">
          <div className={styles.cardHead}>
            <h2 id="recent-title">Dernières commandes</h2>
            <Link href="/admin/commandes" className={styles.cardLink}>Tout voir</Link>
          </div>
          {stats.recent.length === 0 ? (
            <p className={styles.empty}>Aucune commande {period === 'today' ? "aujourd’hui" : 'sur la période'} pour l’instant.</p>
          ) : (
            <ul className={styles.recent}>
              {stats.recent.map(o => (
                <li key={o.id}>
                  <div>
                    <strong>{o.short_id}</strong>
                    <span className={styles.recentMeta}>
                      {new Date(o.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — {o.customer_name}
                    </span>
                  </div>
                  <div className={styles.recentSide}>
                    <span className={styles.recentAmount}>{formatPrice(o.total_amount)}</span>
                    <span className={`${styles.status} ${styles['s_' + o.status]}`}>{STATUS_LABEL[o.status] || o.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
