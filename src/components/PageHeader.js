'use client'

import { useRouter } from 'next/navigation'
import styles from './PageHeader.module.css'

// En-tête de page : bouton retour + titre, collant en haut
export default function PageHeader({ title, subtitle, backHref }) {
  const router = useRouter()
  const goBack = () => (backHref ? router.push(backHref) : router.back())

  return (
    <header className={styles.header}>
      <button className={styles.back} onClick={goBack} aria-label="Retour">
        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <div>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
    </header>
  )
}
