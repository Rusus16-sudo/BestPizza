import Link from 'next/link'
import BrandMark from '@/components/BrandMark'
import styles from './Landing.module.css'

// En-tête des pages de Tchopi (accueil, tarifs) : pour les restaurants.
// `account` : l'espace du compte connecté, à la place de « Connexion ».
export default function LandingHeader({ account = null }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" aria-label="Tchopi, accueil"><BrandMark size="lg" /></Link>
        <nav className={styles.nav} aria-label="Tchopi">
          <Link href="/#fonctionnalites" className={styles.navLink}>Fonctionnalités</Link>
          <Link href="/tarifs" className={styles.navLink}>Tarifs</Link>
          {account
            ? <Link href={account} className={styles.navLink}>Mon espace</Link>
            : <Link href="/login?next=/admin" className={styles.navLink}>Connexion</Link>}
          <Link href="/creer" className={styles.navCta}>Créer mon restaurant</Link>
        </nav>
      </div>
    </header>
  )
}
