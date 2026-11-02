import Link from 'next/link'
import styles from './PlanLock.module.css'

/** À la place d'un outil que l'offre du restaurant n'inclut pas : ce qu'il apporte, et l'offre qui l'ouvre. */
export default function PlanLock({ title, text, plan = 'Pro' }) {
  return (
    <section className={styles.lock}>
      <span className={styles.badge} aria-hidden="true">🔒</span>
      <h2>{title}</h2>
      <p>{text}</p>
      <Link href="/admin/abonnement" className={styles.cta}>Passer à {plan}</Link>
    </section>
  )
}
