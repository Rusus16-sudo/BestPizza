'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './Offers.module.css'
import { offers } from '@/data/offers'

export default function OffersPage() {
  const router = useRouter()
  const [copiedId, setCopiedId] = useState(null)

  const handleCopy = (offer) => {
    navigator.clipboard.writeText(offer.code)
    setCopiedId(offer.id)
    setTimeout(() => {
      setCopiedId(null)
    }, 2000)
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <div>
          <h1>Offres</h1>
          <p className={styles.subtitle}>Profitez de nos meilleurs bons plans</p>
        </div>
      </header>

      <div className={styles.offersList}>
        {offers.map(offer => (
          <div 
            key={offer.id} 
            className={styles.offerCard}
            style={{ background: offer.color }}
          >
            <h2 className={styles.offerTitle}>{offer.title}</h2>
            <p className={styles.offerDesc}>{offer.description}</p>
            
            <div className={styles.offerBottom}>
              <div className={styles.codeBox}>
                <span className={styles.codeLabel}>Code Promo</span>
                <span className={styles.codeValue}>{offer.code}</span>
              </div>
              <button 
                className={`${styles.copyBtn} ${copiedId === offer.id ? styles.copied : ''}`}
                onClick={() => handleCopy(offer)}
              >
                {copiedId === offer.id ? (
                  <>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Copié !
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copier
                  </>
                )}
              </button>
            </div>
            
            <div className={styles.expiry}>
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              {offer.expiry}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
