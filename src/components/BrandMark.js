import { initialsOf } from '@/lib/brand'
import styles from './BrandMark.module.css'

const PLATFORM = 'Tchopi'

// Logo et nom : le logo du restaurant, sinon ses initiales sur sa couleur.
// Hors d'une vitrine, le logo de Tchopi (`tone="light"` : version claire, pour les fonds sombres).
export default function BrandMark({ size = 'md', name = PLATFORM, logoUrl = null, tone = 'dark' }) {
  if (name === PLATFORM && !logoUrl) {
    return (
      <span className={`${styles.brand} ${styles[size]}`}>
        <img
          className={styles.platform}
          src={tone === 'light' ? '/brand/tchopi-logo-clair.png' : '/brand/tchopi-logo.png'}
          alt="Tchopi"
        />
      </span>
    )
  }

  return (
    <span className={`${styles.brand} ${styles[size]}`}>
      {logoUrl ? (
        <img className={styles.mark} src={logoUrl} alt="" />
      ) : (
        <span className={`${styles.mark} ${styles.initials}`} aria-hidden="true">{initialsOf(name)}</span>
      )}
      <span className={styles.name}>{name}</span>
    </span>
  )
}
