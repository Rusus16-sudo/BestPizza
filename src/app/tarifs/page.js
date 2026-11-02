import LandingHeader from '@/components/landing/LandingHeader'
import LandingFooter from '@/components/landing/LandingFooter'
import PricingPlans from '@/components/landing/PricingPlans'
import Faq from '@/components/landing/Faq'
import styles from '@/components/landing/Landing.module.css'

export const metadata = {
  title: 'Tarifs · Tchopi',
  description: 'Starter 10 000 FCFA, Pro 25 000 FCFA, Business 50 000 FCFA par mois. 2 mois offerts à l’année. 14 jours gratuits, sans engagement.',
}

// tchopi.cm/tarifs : les trois offres, pour les restaurants
export default function PricingPage() {
  return (
    <div className={styles.page}>
      <LandingHeader />
      <main>
        <section className={styles.pricingHero}>
          <h1>Un prix simple, en FCFA</h1>
          <p>Pas de commission sur vos ventes : un abonnement fixe, c’est tout. 14 jours gratuits pour essayer.</p>
        </section>
        <section className={styles.section}>
          <PricingPlans />
        </section>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Vos questions</h2>
          <Faq />
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}
