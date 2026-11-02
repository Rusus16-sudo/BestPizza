'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import toast from 'react-hot-toast'
import { useStorefront } from '@/context/StorefrontContext'
import { formatPrice } from '@/lib/format'
import { rememberOrder } from '@/lib/guest-orders'
import PushOptIn from '@/components/PushOptIn'
import TrackingMap from '@/components/TrackingMap'
import { estimatedArrival } from '@/lib/eta'
import styles from './Tracking.module.css'

// Les étapes d'une commande, dans l'ordre où le client les vit
// `at` : l'heure à laquelle l'étape a commencé
const STEPS = [
  { status: 'en_attente', label: 'Commande reçue', detail: 'Le restaurant l’a bien reçue.', at: 'createdAt' },
  { status: 'en_preparation', label: 'En préparation', detail: 'La cuisine s’en occupe.', at: 'acceptedAt' },
  { status: 'prete', label: 'Prête', detail: 'Un livreur va la récupérer.', at: 'readyAt' },
  { status: 'en_route', label: 'En route', detail: 'Le livreur arrive.', at: 'pickedAt' },
  { status: 'livre', label: 'Livrée', detail: 'Bon appétit !', at: 'deliveredAt' },
]
const FINAL = ['livre', 'annule']
const REFRESH_MS = 15000
// En route, la position du livreur est relue plus souvent
const REFRESH_EN_ROUTE_MS = 8000

const phoneHref = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`

export default function TrackingClient({ initialOrder, token, isLoggedIn }) {
  const { href, timezone } = useStorefront()
  // « 20 h 15 », à l'heure du restaurant
  const clock = useCallback((date) => (date
    ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: timezone || 'Africa/Douala' }).format(new Date(date)).replace(':', ' h ')
    : null), [timezone])
  const [now, setNow] = useState(() => Date.now())
  const pathname = usePathname()
  const [order, setOrder] = useState(initialOrder)
  const [paying, setPaying] = useState(false)

  // La commande reste retrouvable depuis cet appareil, même sans compte
  useEffect(() => {
    rememberOrder({ token, slug: initialOrder.restaurant?.slug, shortId: initialOrder.shortId, claimed: initialOrder.hasAccount })
  }, [token, initialOrder])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/suivi/${token}`, { cache: 'no-store' })
      if (res.ok) setOrder(await res.json())
    } catch {}
  }, [token])

  // Relue régulièrement tant qu'elle n'est pas terminée, et dès qu'on revient sur la page
  useEffect(() => {
    if (FINAL.includes(order.status)) return
    const timer = setInterval(() => {
      refresh()
      setNow(Date.now())
    }, order.status === 'en_route' ? REFRESH_EN_ROUTE_MS : REFRESH_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [order.status, refresh])

  const resumePayment = async () => {
    setPaying(true)
    try {
      const res = await fetch('/api/payments/notchpay/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingToken: token }),
      })
      const data = await res.json()
      if (data.paymentUrl) {
        window.location.assign(data.paymentUrl)
        return
      }
      toast.error(data.error || "Le paiement n'a pas pu être relancé.")
    } catch {
      toast.error('Pas de connexion. Réessayez.')
    }
    setPaying(false)
  }

  const cancelled = order.status === 'annule'
  const awaitingPayment = order.status === 'paiement'
  const current = STEPS.findIndex((s) => s.status === order.status)
  const eta = estimatedArrival(order, now)
  const seenMinutes = order.driver?.at ? Math.max(0, Math.round((now - new Date(order.driver.at).getTime()) / 60000)) : null
  const signupHref = `/login?mode=signup&next=${encodeURIComponent(pathname)}`

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={href('/')} className={styles.backBtn} aria-label="Retour à la carte">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
        </Link>
        <div>
          <p className={styles.kicker}>{order.restaurant?.name}</p>
          <h1>Commande {order.shortId}</h1>
        </div>
      </header>

      <section className={styles.card} aria-live="polite">
        {cancelled ? (
          <div className={styles.cancelled}>
            <strong>Commande annulée</strong>
            <span>{order.cancelledAt ? `À ${clock(order.cancelledAt)}. ` : ''}Si vous ne savez pas pourquoi, appelez le restaurant.</span>
          </div>
        ) : awaitingPayment ? (
          <div className={styles.payment}>
            <strong>Paiement à finaliser</strong>
            <span>La commande partira en cuisine dès que le paiement Mobile Money sera validé.</span>
            <button className={styles.primaryBtn} onClick={resumePayment} disabled={paying}>
              {paying ? 'Un instant…' : 'Finaliser le paiement'}
            </button>
          </div>
        ) : (
          <>
          {eta && (
            <div className={styles.eta}>
              <span>Arrivée estimée</span>
              <strong>vers {clock(eta)}</strong>
            </div>
          )}
          {order.status === 'livre' && order.deliveredAt && (
            <div className={styles.eta}>
              <span>Livrée</span>
              <strong>à {clock(order.deliveredAt)}</strong>
            </div>
          )}
          <ol className={styles.steps}>
            {STEPS.map((step, i) => {
              const state = i < current ? 'done' : i === current ? 'current' : 'todo'
              return (
                <li key={step.status} className={`${styles.step} ${styles[state]}`}>
                  <span className={styles.dot} aria-hidden="true">
                    {state === 'done' && (
                      <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </span>
                  <span className={styles.stepText}>
                    <strong>{step.label}</strong>
                    {state === 'current' && (
                      <span>{step.status === 'en_route' && order.driverName ? `${order.driverName} arrive avec votre commande.` : step.detail}</span>
                    )}
                  </span>
                  {state !== 'todo' && order[step.at] && <time className={styles.stepTime}>{clock(order[step.at])}</time>}
                </li>
              )
            })}
          </ol>
          </>
        )}

        {order.status === 'en_route' && order.issue && (
          <p className={styles.issue} role="alert">⚠️ {order.issue}</p>
        )}

        {order.status === 'en_route' && order.features?.liveMap && (
          <div className={styles.map}>
            <TrackingMap position={order.driver} destination={order.destination} />
            <p className={styles.mapNote}>
              {order.driver
                ? seenMinutes < 1 ? 'Position du livreur à l’instant.' : `Position du livreur il y a ${seenMinutes} min.`
                : 'La position du livreur s’affichera dès qu’il partagera sa localisation.'}
            </p>
          </div>
        )}

        {order.restaurantPhone && !['livre'].includes(order.status) && (
          <a href={phoneHref(order.restaurantPhone)} className={styles.callBtn}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
            Appeler {order.locationName ? `${order.restaurant?.name} · ${order.locationName}` : 'le restaurant'}
          </a>
        )}
      </section>

      {!FINAL.includes(order.status) && (
        <PushOptIn
          trackingToken={token}
          className={styles.block}
          title="Être prévenu à chaque étape"
          description="Une notification quand la commande passe en cuisine, part en livraison et arrive, même app fermée."
        />
      )}

      {/* Après la livraison : son avis fait vivre la vitrine du restaurant */}
      {order.status === 'livre' && order.features?.reviews && (
        <section className={styles.review}>
          <span aria-hidden="true">⭐</span>
          <div>
            <strong>C’était bon ?</strong>
            <span>
              {isLoggedIn || order.hasAccount
                ? `Notez vos plats en quelques secondes : votre avis aide ${order.restaurant?.name || 'le restaurant'}.`
                : 'Créez votre compte en 30 secondes pour noter vos plats et retrouver vos commandes.'}
            </span>
          </div>
          <Link href={isLoggedIn || order.hasAccount ? '/orders' : `/login?mode=signup&next=${encodeURIComponent('/orders')}`} className={styles.primaryBtn}>
            Noter mes plats
          </Link>
        </section>
      )}

      {!isLoggedIn && !order.hasAccount && order.status !== 'livre' && (
        <section className={styles.signup}>
          <div>
            {/* Sans compte, le client suit déjà tout ici : le compte sert à garder ses commandes */}
            <strong>Garde tes commandes avec un compte Tchopi</strong>
            <span>Tu suis déjà ta commande ici. Avec un compte, tu la retrouves sur tous tes appareils, même si tu changes de téléphone, et tes prochaines commandes vont plus vite.</span>
          </div>
          <Link href={signupHref} className={styles.primaryBtn}>Créer mon compte</Link>
        </section>
      )}

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Votre commande</h2>
        <ul className={styles.items}>
          {order.items.map((item, i) => (
            <li key={i}>
              <span>
                {item.quantity}× {item.name}{item.size && item.size !== 'Standard' ? ` · ${item.size}` : ''}
                {item.extras?.length > 0 && <small className={styles.extras}>+ {item.extras.join(', ')}</small>}
              </span>
              <span>{formatPrice(item.price)}</span>
            </li>
          ))}
        </ul>
        {order.deliveryZone || order.deliveryFee > 0 ? (
          <div className={styles.deliveryRow}>
            <span>Livraison{order.deliveryZone ? ` · ${order.deliveryZone}` : ''}</span>
            <span>{order.deliveryFee > 0 ? formatPrice(order.deliveryFee) : 'Offerte'}</span>
          </div>
        ) : null}
        <div className={styles.total}>
          <span>Total</span>
          <strong>{formatPrice(order.total)}</strong>
        </div>
        <p className={styles.payNote}>
          {order.paymentStatus === 'paye' ? 'Déjà payée en ligne.' : order.paymentMethod === 'mobile_money' ? 'Paiement Mobile Money.' : 'À régler au livreur, en espèces.'}
        </p>
      </section>

      <p className={styles.keepLink}>
        Gardez cette page : son adresse est le lien de suivi de votre commande.
      </p>
    </div>
  )
}
