'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getBrowserClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import PushOptIn from '@/components/PushOptIn'
import styles from './Kitchen.module.css'
import { formatDuration } from '@/lib/format'
import { signOut } from '@/lib/sign-out'

const COLUMNS = [
  { status: 'en_attente', title: 'À préparer', action: 'Lancer la préparation', next: 'en_preparation' },
  { status: 'en_preparation', title: 'Au four', action: 'Commande prête', next: 'prete' },
  { status: 'prete', title: 'Prêtes, en attente du livreur', action: null, next: null },
]

// Choix du son, retenu sur l'appareil
const SOUND_KEY = 'tchopi_cuisine_son'
// Rappel sonore tant qu'une commande attend d'être lancée
const REMIND_EVERY_MS = 30000

// Seuils d'alerte (minutes depuis la commande)
const WARN_AFTER = 15
const LATE_AFTER = 25

function minutesSince(date, now) {
  return Math.max(0, Math.floor((now - new Date(date).getTime()) / 60000))
}

function customizationLabels(item) {
  const chosen = Object.entries(item.customizations || {}).filter(([, on]) => on).map(([id]) => id)
  if (chosen.length === 0) return []
  const catalog = item.products?.customizations || []
  return chosen.map(id => catalog.find(c => c.id === id)?.label || id.replace(/_/g, ' '))
}

// Petit signal sonore (deux notes) sans fichier audio
function playChime(ctx) {
  if (!ctx) return
  const now = ctx.currentTime
  ;[880, 1320].forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = freq
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.0001, now + i * 0.18)
    gain.gain.exponentialRampToValueAtTime(0.35, now + i * 0.18 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.4)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now + i * 0.18)
    osc.stop(now + i * 0.18 + 0.45)
  })
}

export default function KitchenPage() {
  const router = useRouter()
  const [supabase] = useState(() => getBrowserClient())
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [soundOn, setSoundOn] = useState(false)
  // Le navigateur ne laisse sonner qu'après un geste : tant que personne n'a touché
  // l'écran depuis l'ouverture, le son choisi ne peut pas encore jouer
  const [audioReady, setAudioReady] = useState(false)
  const [freshIds, setFreshIds] = useState(() => new Set())
  const [busyId, setBusyId] = useState(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const knownIds = useRef(null)
  const audioCtx = useRef(null)
  const soundRef = useRef(false)
  const lastChimeAt = useRef(0)
  const waitingRef = useRef(0)

  const chime = useCallback(() => {
    if (!soundRef.current || !audioCtx.current) return
    lastChimeAt.current = Date.now()
    playChime(audioCtx.current)
  }, [])

  // Prépare le son, à appeler pendant un geste (toucher, clic, touche du clavier)
  const unlockAudio = useCallback(() => {
    if (!audioCtx.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) audioCtx.current = new Ctx()
    }
    audioCtx.current?.resume()
    setAudioReady(Boolean(audioCtx.current))
  }, [])

  // Le choix du son est retenu sur la tablette, même après une déconnexion
  useEffect(() => {
    let saved = false
    try {
      saved = localStorage.getItem(SOUND_KEY) === '1'
    } catch {}
    if (!saved) return
    setSoundOn(true)
    soundRef.current = true

    // Le premier geste sur l'écran réveille le son (et le réveille à nouveau si la
    // tablette l'a mis en pause)
    const wake = () => {
      if (soundRef.current) unlockAudio()
    }
    window.addEventListener('pointerdown', wake)
    window.addEventListener('keydown', wake)
    return () => {
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', wake)
    }
  }, [unlockAudio])

  // Rappel : tant qu'une commande attend dans « À préparer », on resonne toutes les 30 s
  useEffect(() => {
    const reminder = setInterval(() => {
      if (waitingRef.current > 0 && Date.now() - lastChimeAt.current >= REMIND_EVERY_MS - 1000) chime()
    }, REMIND_EVERY_MS)
    return () => clearInterval(reminder)
  }, [chime])

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, short_id, status, special_instructions, created_at, updated_at,
        order_items ( product_name, quantity, size, customizations, products ( customizations ) )
      `)
      .in('status', COLUMNS.map(c => c.status))
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Commandes cuisine:', error.message)
      setLoadError(true)
      setLoading(false)
      return
    }

    // Repère les nouvelles commandes pour les signaler
    const incoming = data.filter(o => o.status === 'en_attente').map(o => o.id)
    if (knownIds.current) {
      const fresh = incoming.filter(id => !knownIds.current.has(id))
      if (fresh.length > 0) {
        chime()
        setFreshIds(prev => new Set([...prev, ...fresh]))
        setTimeout(() => setFreshIds(prev => {
          const next = new Set(prev)
          fresh.forEach(id => next.delete(id))
          return next
        }), 60000)
      }
    }
    setLoadError(false)
    knownIds.current = new Set(data.map(o => o.id))
    setOrders(data)
    setLoading(false)
  }, [supabase, chime])

  useEffect(() => {
    fetchOrders()
    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe()
    const tick = setInterval(() => setNow(Date.now()), 30000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(tick)
    }
  }, [supabase, fetchOrders])

  // Nombre de commandes à préparer dans l'onglet du navigateur
  const waiting = orders.filter(o => o.status === 'en_attente').length
  waitingRef.current = waiting
  useEffect(() => {
    document.title = waiting > 0 ? `(${waiting}) Cuisine · Tchopi` : 'Cuisine · Tchopi'
  }, [waiting])

  const toggleSound = () => {
    // Ce clic est le geste qui autorise le son
    unlockAudio()
    const next = !soundOn
    setSoundOn(next)
    soundRef.current = next
    try {
      localStorage.setItem(SOUND_KEY, next ? '1' : '0')
    } catch {}
    if (next) chime()
  }

  const advance = async (order, nextStatus) => {
    setBusyId(order.id)
    const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', order.id)
    setBusyId(null)
    if (error) {
      console.error('Mise à jour du statut:', error.message)
      toast.error("Le statut n'a pas pu être mis à jour. Vérifiez la connexion.")
      return
    }
    setFreshIds(prev => {
      const next = new Set(prev)
      next.delete(order.id)
      return next
    })
    fetchOrders()
  }

  const handleLogout = async () => {
    await signOut(supabase)
    router.push('/login')
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1>Cuisine</h1>
          <span className={styles.live}><span className={styles.liveDot} />En direct</span>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.soundBtn} ${soundOn ? styles.soundOn : ''}`} onClick={toggleSound} aria-pressed={soundOn}>
            {soundOn ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
            )}
            {soundOn ? 'Son activé' : 'Activer le son'}
          </button>
          {/* Sur téléphone, pas de barre latérale : les paramètres s'ouvrent d'ici */}
          <Link href="/kitchen/settings" className={styles.settingsBtn} aria-label="Paramètres">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </Link>
          <button className={styles.logoutBtn} onClick={() => setConfirmLogout(true)} aria-label="Se déconnecter">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
          </button>
        </div>
      </header>

      {!soundOn && (
        <p className={styles.soundHint}>Activez le son pour être prévenu à chaque nouvelle commande.</p>
      )}

      {soundOn && !audioReady && (
        // Toucher n'importe où suffit ; ce bouton rend le geste évident
        <button className={styles.soundTap} onClick={unlockAudio}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
          Touchez l’écran pour réveiller le son
        </button>
      )}

      <PushOptIn
        required
        dark
        className={styles.pushOptIn}
        title="Ne ratez aucune commande"
        description="Une notification à chaque nouvelle commande et à chaque annulation, même tablette en veille."
      />

      {loadError && (
        <p className={styles.errorBox} role="alert">Les commandes n’ont pas pu être chargées. Vérifiez la connexion internet de la tablette.</p>
      )}

      <div className={styles.board}>
        {COLUMNS.map(col => {
          const list = orders.filter(o => o.status === col.status)
          return (
            <section key={col.status} className={styles.column} aria-labelledby={`col-${col.status}`}>
              <h2 id={`col-${col.status}`} className={styles.columnTitle}>
                {col.title} <span className={styles.count}>{list.length}</span>
              </h2>

              {loading ? (
                <div className={styles.skeleton} />
              ) : list.length === 0 ? (
                <p className={styles.empty}>
                  {col.status === 'en_attente' ? 'Aucune nouvelle commande.' : col.status === 'en_preparation' ? 'Rien au four.' : 'Aucune commande en attente de livreur.'}
                </p>
              ) : (
                <div className={styles.cards}>
                  {list.map(order => {
                    const since = minutesSince(col.status === 'prete' ? (order.updated_at || order.created_at) : order.created_at, now)
                    const level = col.status === 'prete' ? '' : since >= LATE_AFTER ? styles.late : since >= WARN_AFTER ? styles.warn : ''
                    return (
                      <article key={order.id} className={`${styles.card} ${level} ${freshIds.has(order.id) ? styles.fresh : ''}`}>
                        <div className={styles.cardHead}>
                          <span className={styles.orderId}>{order.short_id?.replace('CMD-', '#') || '—'}</span>
                          <span className={styles.timer} title={`Reçue à ${new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}>
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" />
                            </svg>
                            {since < 1 ? "à l’instant" : formatDuration(since)}
                          </span>
                        </div>

                        <ul className={styles.items}>
                          {order.order_items.map((item, idx) => {
                            const extras = customizationLabels(item)
                            return (
                              <li key={idx}>
                                <span className={styles.qty}>{item.quantity}×</span>
                                <span className={styles.itemName}>
                                  {item.product_name}
                                  {item.size && !['Moyenne', 'Standard'].includes(item.size) && <em className={styles.size}>{item.size}</em>}
                                  {extras.length > 0 && <span className={styles.extras}>+ {extras.join(', ')}</span>}
                                </span>
                              </li>
                            )
                          })}
                        </ul>

                        {order.special_instructions && (
                          <p className={styles.note}>
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M21 11.5a8.4 8.4 0 0 1-9 8.3L3 21l1.2-3.6A8.4 8.4 0 1 1 21 11.5z" />
                            </svg>
                            <span>{order.special_instructions}</span>
                          </p>
                        )}

                        {col.action && (
                          <button
                            className={`${styles.actionBtn} ${col.next === 'prete' ? styles.actionReady : ''}`}
                            onClick={() => advance(order, col.next)}
                            disabled={busyId === order.id}
                          >
                            {busyId === order.id ? 'Mise à jour…' : col.action}
                          </button>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Se déconnecter ?"
        message="Les nouvelles commandes ne seront plus signalées sur cet écran."
        confirmLabel="Se déconnecter"
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  )
}
