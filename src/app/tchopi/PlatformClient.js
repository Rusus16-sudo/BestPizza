'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'
import { formatPrice } from '@/lib/format'
import { PLAN_NAMES, PLAN_ORDER, subscriptionPrice } from '@/lib/plans'
import { subscriptionState } from '@/lib/subscription'
import BrandMark from '@/components/BrandMark'
import Select from '@/components/Select'
import styles from './Platform.module.css'

const PHASES = {
  trial: { label: 'Essai', tone: 'trial' },
  active: { label: 'Payé', tone: 'ok' },
  ending: { label: 'Se termine', tone: 'warn' },
  grace: { label: 'En grâce', tone: 'danger' },
  paused: { label: 'En pause', tone: 'danger' },
  suspended: { label: 'Suspendu', tone: 'muted' },
}

const FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'trial', label: 'En essai' },
  { id: 'paying', label: 'Payants' },
  { id: 'follow', label: 'À relancer' },
]

const shortDate = (date) => new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

/** L'espace Tchopi : tous les restaurants, leur abonnement, et les gestes pour les gérer. */
export default function PlatformClient({ restaurants, revenue30 }) {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(null)
  // Le restaurant dont on active l'offre à la main, et le choix en cours
  const [activating, setActivating] = useState(null)
  const [plan, setPlan] = useState('pro')
  const [months, setMonths] = useState(1)

  const rows = restaurants.map((r) => ({ ...r, state: subscriptionState(r) }))
  const follow = (r) => ['ending', 'grace', 'paused'].includes(r.state.phase)
  const visible = rows
    .filter((r) => filter === 'all'
      || (filter === 'trial' && r.state.trial)
      || (filter === 'paying' && !r.state.trial && r.plan_status === 'active')
      || (filter === 'follow' && follow(r)))
    .filter((r) => !query.trim() || `${r.name} ${r.slug} ${r.ownerEmail || ''}`.toLowerCase().includes(query.trim().toLowerCase()))

  const act = async (r, body, done) => {
    setBusy(r.id)
    try {
      const res = await fetch(`/api/platform/organizations/${r.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Échec')
      toast.success(done)
      setActivating(null)
      router.refresh()
    } catch (err) {
      toast.error(err.message)
    }
    setBusy(null)
  }

  const stats = [
    { label: 'Restaurants', value: rows.length },
    { label: 'En essai', value: rows.filter((r) => r.state.trial).length },
    { label: 'Payants', value: rows.filter((r) => !r.state.trial && r.plan_status === 'active').length },
    { label: 'À relancer', value: rows.filter(follow).length },
    { label: 'Encaissé (30 j)', value: formatPrice(revenue30) },
  ]

  return (
    <div className={styles.page}>
      <Toaster position="top-center" />
      <header className={styles.header}>
        <BrandMark size="lg" />
        <span className={styles.tag}>Espace Tchopi</span>
      </header>

      <dl className={styles.stats}>
        {stats.map((s) => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className={styles.toolbar}>
        <div className={styles.filters} role="tablist">
          {FILTERS.map((f) => (
            <button key={f.id} role="tab" aria-selected={filter === f.id} className={`${styles.filter} ${filter === f.id ? styles.filterOn : ''}`} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <input className={styles.search} type="search" placeholder="Rechercher un restaurant, un email…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <ul className={styles.list}>
        {visible.map((r) => {
          const phase = PHASES[r.state.phase]
          return (
            <li key={r.id} className={styles.card}>
              <div className={styles.cardHead}>
                <div>
                  <a href={`/${r.slug}`} target="_blank" rel="noopener noreferrer" className={styles.name}>{r.name}</a>
                  <span className={styles.slug}>/{r.slug}</span>
                </div>
                <span className={styles.plan}>{PLAN_NAMES[r.plan]}</span>
                <span className={`${styles.phase} ${styles[phase.tone]}`}>{phase.label}</span>
              </div>

              <p className={styles.meta}>
                {r.state.endsAt
                  ? `${r.state.trial ? 'Essai jusqu’au' : 'Payé jusqu’au'} ${shortDate(r.state.endsAt)}`
                  : r.state.phase === 'suspended' ? 'Suspendu par Tchopi' : 'Sans date de fin'}
                {' · '}{r.locations} point{r.locations > 1 ? 's' : ''} de vente
                {' · '}{r.orders30} commande{r.orders30 > 1 ? 's' : ''} sur 30 jours
              </p>
              <p className={styles.meta}>
                {r.ownerEmail || 'Propriétaire inconnu'}{r.ownerPhone && ` · ${r.ownerPhone}`} · inscrit le {shortDate(r.created_at)}
              </p>

              {activating === r.id ? (
                <div className={styles.activate}>
                  <Select label="Offre" value={plan} onChange={setPlan} options={PLAN_ORDER.map((p) => ({ value: p, label: PLAN_NAMES[p] }))} />
                  <Select label="Durée" value={months} onChange={setMonths} options={[{ value: 1, label: '1 mois' }, { value: 12, label: '12 mois' }]} />
                  <span className={styles.amount}>{formatPrice(subscriptionPrice(plan, months, r.locations))}</span>
                  <button type="button" className={styles.primaryBtn} disabled={busy === r.id} onClick={() => act(r, { action: 'activate', plan, months }, `${r.name} : ${PLAN_NAMES[plan]} activé`)}>
                    Paiement reçu, activer
                  </button>
                  <button type="button" className={styles.ghostBtn} onClick={() => setActivating(null)}>Annuler</button>
                </div>
              ) : (
                <div className={styles.actions}>
                  <button type="button" className={styles.primaryBtn} disabled={busy === r.id} onClick={() => { setPlan(r.plan); setMonths(1); setActivating(r.id) }}>Activer une offre</button>
                  <button type="button" className={styles.ghostBtn} disabled={busy === r.id} onClick={() => act(r, { action: 'extend_trial', days: 7 }, `${r.name} : 7 jours d’essai en plus`)}>+7 jours d’essai</button>
                  {r.state.phase === 'suspended'
                    ? <button type="button" className={styles.ghostBtn} disabled={busy === r.id} onClick={() => act(r, { action: 'resume' }, `${r.name} réactivé`)}>Réactiver</button>
                    : <button type="button" className={styles.dangerBtn} disabled={busy === r.id} onClick={() => confirm(`Suspendre ${r.name} ? Sa vitrine disparaît jusqu’à sa réactivation.`) && act(r, { action: 'suspend' }, `${r.name} suspendu`)}>Suspendre</button>}
                </div>
              )}
            </li>
          )
        })}
        {visible.length === 0 && <li className={styles.empty}>Aucun restaurant ici.</li>}
      </ul>
    </div>
  )
}
