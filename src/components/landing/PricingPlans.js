'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatPrice } from '@/lib/format'
import { PLAN_NAMES, PLAN_ORDER, PLAN_PRICES, BUSINESS_INCLUDED_LOCATIONS, EXTRA_LOCATION_PRICE } from '@/lib/plans'
import styles from './Landing.module.css'

const PLANS = {
  starter: {
    pitch: 'Pour le petit fast-food qui démarre.',
    features: ['1 point de vente', 'Jusqu’à 30 plats', '1 livreur', 'Écran cuisine et notifications', 'Paiement à la livraison', 'Mention « Propulsé par Tchopi »'],
  },
  pro: {
    pitch: 'Pour le restaurant installé.',
    features: ['Carte illimitée', 'Livreurs illimités', 'Suivi du livreur en direct sur la carte', 'Codes promo et avis clients', 'Horaires et zones de livraison complets', 'Votre marque seule, sans mention Tchopi'],
    soon: 'Paiement MTN MoMo et Orange Money',
  },
  business: {
    pitch: 'Pour l’enseigne à plusieurs adresses.',
    features: ['Tout Pro, et :', `${BUSINESS_INCLUDED_LOCATIONS} points de vente inclus`, `+${formatPrice(EXTRA_LOCATION_PRICE)} / mois par adresse en plus`, 'Une carte commune, des prix par adresse', 'Un responsable par point de vente', 'Installation de votre carte par notre équipe'],
    soon: 'Paiement MTN MoMo et Orange Money',
  },
}

/** Les trois offres, au mois ou à l'année (2 mois offerts). */
export default function PricingPlans() {
  const [yearly, setYearly] = useState(false)

  return (
    <div>
      <div className={styles.cycle} role="radiogroup" aria-label="Durée">
        <button type="button" role="radio" aria-checked={!yearly} className={`${styles.cycleBtn} ${!yearly ? styles.cycleOn : ''}`} onClick={() => setYearly(false)}>Mensuel</button>
        <button type="button" role="radio" aria-checked={yearly} className={`${styles.cycleBtn} ${yearly ? styles.cycleOn : ''}`} onClick={() => setYearly(true)}>
          Annuel <em>2 mois offerts</em>
        </button>
      </div>

      <div className={styles.plans}>
        {PLAN_ORDER.map((plan, i) => {
          const monthly = PLAN_PRICES[plan]
          return (
            <article key={plan} className={`${styles.plan} ${plan === 'pro' ? styles.planPro : ''}`} style={{ '--i': i }}>
              {plan === 'pro' && <span className={styles.planBadge}>Recommandé</span>}
              <h3>{PLAN_NAMES[plan]}</h3>
              <p className={styles.planPitch}>{PLANS[plan].pitch}</p>
              <p key={yearly ? 'an' : 'mois'} className={`${styles.planPrice} ${styles.priceSwap}`}>
                <strong>{formatPrice(yearly ? monthly * 10 : monthly)}</strong>
                <span>{yearly ? '/ an' : '/ mois'}</span>
              </p>
              {yearly && <p className={styles.planSaving}>Soit {formatPrice(Math.round((monthly * 10) / 12))} par mois</p>}
              <ul>
                {PLANS[plan].features.map((f) => <li key={f}>{f}</li>)}
                {PLANS[plan].soon && (
                  <li className={styles.planSoon}>
                    {PLANS[plan].soon} <span>🔒 Bientôt disponible</span>
                  </li>
                )}
              </ul>
              <Link href="/creer" className={styles.planCta}>Essayer 14 jours gratuits</Link>
            </article>
          )
        })}
      </div>
      <p className={styles.planNote}>14 jours d’essai gratuit de l’offre Pro, sans engagement et sans carte bancaire. Vous choisissez votre offre à la fin de l’essai.</p>
    </div>
  )
}
