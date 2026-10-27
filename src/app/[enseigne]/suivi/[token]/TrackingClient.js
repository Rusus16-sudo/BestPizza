'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import toast from 'react-hot-toast'
import { useStorefront } from '@/context/StorefrontContext'
import { formatPrice } from '@/lib/format'
import { rememberOrder } from '@/lib/guest-orders'
import PushOptIn from '@/components/PushOptIn'
import ClientTrackingMap from '@/components/ClientTrackingMap'
import styles from './Tracking.module.css'

// Les étapes d'une commande, dans l'ordre où le client les vit
const STEPS = [
  { status: 'en_attente', label: 'Commande reçue', detail: 'Le restaurant l’a bien reçue.' },
  { status: 'en_preparation', label: 'En préparation', detail: 'La cuisine s’en occupe.' },
  { status: 'prete', label: 'Prête', detail: 'Un livreur va la récupérer.' },
  { status: 'en_route', label: 'En route', detail: 'Le livreur arrive.' },
  { status: 'livre', label: 'Livrée', detail: 'Bon appétit !' },
]
const FINAL = ['livre', 'annule']
const REFRESH_MS = 15000

export default function TrackingClient({ initialOrder, token, isLoggedIn }) {
  const { href } = useStorefront()
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
    const timer = setInterval(refresh, REFRESH_MS)
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
            <span>Si vous ne savez pas pourquoi, appelez le restaurant.</span>
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
                    {state === 'current' && <span>{step.detail}</span>}
                  </span>
                </li>
              )
            })}
          </ol>
        )}

        {order.status === 'en_route' && <ClientTrackingMap orderId={order.id} />}
      </section>

      {!FINAL.includes(order.status) && (
        <PushOptIn
          trackingToken={token}
          className={styles.block}
          title="Être prévenu à chaque étape"
          description="Une notification quand la commande passe en cuisine, part en livraison et arrive, même app fermée."
        />
      )}

      {!isLoggedIn && !order.hasAccount && (
        <section className={styles.signup}>
          <div>
            <strong>Inscris-toi sur Tchopi pour suivre ta commande</strong>
            <span>Retrouve toutes tes commandes, chez tous tes restaurants, sur n’importe quel appareil.</span>
          </div>
          <Link href={signupHref} className={styles.primaryBtn}>Créer mon compte</Link>
        </section>
      )}

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Votre commande</h2>
        <ul className={styles.items}>
          {order.items.map((item, i) => (
            <li key={i}>
              <span>{item.quantity}× {item.name}{item.size && item.size !== 'Standard' ? ` · ${item.size}` : ''}</span>
              <span>{formatPrice(item.price)}</span>
            </li>
          ))}
        </ul>
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
