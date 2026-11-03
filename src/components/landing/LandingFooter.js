import Link from 'next/link'
import BrandMark from '@/components/BrandMark'
import styles from './Landing.module.css'

const thisYear = () => new Date().getFullYear()

export default function LandingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div>
          <BrandMark tone="light" />
          <p>L’app de commande et de livraison des restaurants, pensée pour le Cameroun.</p>
        </div>
        <nav aria-label="Liens">
          <Link href="/tarifs">Tarifs</Link>
          <Link href="/creer">Créer mon restaurant</Link>
          <Link href="/login?next=/admin">Connexion</Link>
        </nav>
      </div>
      <p className={styles.copyright}>© {thisYear()} Tchopi</p>
    </footer>
  )
}
