import Link from 'next/link'
import BrandMark from '@/components/BrandMark'
import styles from './Landing.module.css'

// En-tête des pages de Tchopi (accueil, tarifs) : pour les restaurants
export default function LandingHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" aria-label="Tchopi, accueil"><BrandMark size="lg" /></Link>
        <nav className={styles.nav} aria-label="Tchopi">
          <Link href="/#fonctionnalites" className={styles.navLink}>Fonctionnalités</Link>
          <Link href="/tarifs" className={styles.navLink}>Tarifs</Link>
          <Link href="/login?next=/admin" className={styles.navLink}>Connexion</Link>
          <Link href="/creer" className={styles.navCta}>Créer mon restaurant</Link>
        </nav>
      </div>
    </header>
  )
}
