'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { formatPrice } from '@/context/CartContext'
import styles from './Retour.module.css'

const MAX_TRIES = 8 // ~24 s : le temps qu'une validation USSD aboutisse

function Contenu() {
  const params = useSearchParams()
  const reference = params.get('reference') || params.get('trxref') || params.get('payment_reference')

  const [state, setState] = useState({ phase: reference ? 'checking' : 'unknown' })
  const [retrying, setRetrying] = useState(false)

  const check = useCallback(async (tries = 0) => {
    try {
      const res = await fetch(`/api/payments/notchpay/verify?reference=${encodeURIComponent(reference)}`)
      const data = await res.json()

      if (!res.ok) {
        setState({ phase: 'unknown', message: data.error })
        return
      }

      if (data.paymentStatus === 'paye') {
        setState({ phase: 'paid', ...data })
        return
      }
      if (data.paymentStatus === 'echec' || data.paymentStatus === 'annule') {
        setState({ phase: 'failed', ...data })
        return
      }
      if (tries >= MAX_TRIES) {
        setState({ phase: 'slow', ...data })
        return
      }
      setTimeout(() => check(tries + 1), 3000)
    } catch {
      setState({ phase: 'unknown' })
    }
  }, [reference])

  useEffect(() => {
    if (reference) check(0)
  }, [reference, check])

  const retry = async () => {
    setRetrying(true)
    const res = await fetch('/api/payments/notchpay/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shortId: state.shortId }),
    })
    const data = await res.json()
    setRetrying(false)
    if (data.paymentUrl) window.location.assign(data.paymentUrl)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {state.phase === 'checking' && (
          <>
            <div className={`${styles.icon} ${styles.waiting}`} aria-hidden="true">
              <span className={styles.spinner} />
            </div>
            <h1>Paiement en cours de vérification</h1>
            <p>Si votre téléphone vous demande de valider, faites-le maintenant. Restez sur cette page.</p>
          </>
        )}

        {state.phase === 'paid' && (
          <>
            <div className={`${styles.icon} ${styles.ok}`} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h1>Paiement reçu</h1>
            <p>
              Votre commande <strong>{state.shortId}</strong> est partie en cuisine.
              {state.amount ? ` Montant réglé : ${formatPrice(state.amount)}.` : ''}
            </p>
            <Link href="/orders" className={styles.primary}>Suivre ma commande</Link>
          </>
        )}

        {state.phase === 'failed' && (
          <>
            <div className={`${styles.icon} ${styles.ko}`} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </div>
            <h1>Paiement non abouti</h1>
            <p>
              Rien n’a été débité. La commande <strong>{state.shortId}</strong> vous attend :
              vous pouvez réessayer, ou appeler la pizzeria pour payer à la livraison.
            </p>
            <button className={styles.primary} onClick={retry} disabled={retrying}>
              {retrying ? 'Un instant…' : 'Réessayer le paiement'}
            </button>
            <Link href="/orders" className={styles.secondary}>Voir mes commandes</Link>
          </>
        )}

        {state.phase === 'slow' && (
          <>
            <div className={`${styles.icon} ${styles.waiting}`} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            </div>
            <h1>Paiement en attente</h1>
            <p>
              Votre opérateur met plus de temps que d’habitude. Dès que le paiement est validé,
              la commande <strong>{state.shortId}</strong> part en cuisine : vous le verrez dans vos commandes.
            </p>
            <Link href="/orders" className={styles.primary}>Voir mes commandes</Link>
          </>
        )}

        {state.phase === 'unknown' && (
          <>
            <div className={`${styles.icon} ${styles.waiting}`} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
            </div>
            <h1>Paiement introuvable</h1>
            <p>{state.message || 'Nous n’avons pas retrouvé ce paiement. Vos commandes en cours vous diront où en est la vôtre.'}</p>
            <Link href="/orders" className={styles.primary}>Voir mes commandes</Link>
          </>
        )}
      </div>
    </div>
  )
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <Contenu />
    </Suspense>
  )
}
