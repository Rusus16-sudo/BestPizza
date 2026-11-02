import Link from 'next/link'
import LandingHeader from './LandingHeader'
import LandingFooter from './LandingFooter'
import PricingPlans from './PricingPlans'
import Faq from './Faq'
import styles from './Landing.module.css'

const PAINS = [
  { icon: '📞', title: '« Mon livreur est où ? »', text: 'Les clients appellent sans arrêt pendant le rush. Vous décrochez au lieu de cuisiner.' },
  { icon: '💬', title: 'Des commandes perdues sur WhatsApp', text: 'Un message noyé, une adresse mal notée, un plat oublié : et le client ne revient pas.' },
  { icon: '🛵', title: 'Des livreurs qu’on ne voit pas', text: 'Qui a pris quelle commande ? Est-il parti ? Impossible de le savoir sans l’appeler.' },
]

const STEPS = [
  { title: 'Créez votre vitrine', text: 'Votre nom, votre logo, vos couleurs, vos plats et vos horaires. 5 minutes, depuis votre téléphone.' },
  { title: 'Partagez votre lien', text: 'tchopi.cm/votre-restaurant : dans votre bio, vos statuts WhatsApp, et en QR code sur vos sacs et votre comptoir.' },
  { title: 'Recevez, préparez, livrez', text: 'La commande sonne en cuisine, le livreur est prévenu, le client suit tout en direct jusqu’à sa porte.' },
]

const FEATURES = [
  { icon: '📍', title: 'Suivi en direct', text: 'Le client voit chaque étape, l’heure d’arrivée estimée, et son livreur sur la carte jusqu’à sa porte.' },
  { icon: '🔔', title: 'Écran cuisine qui sonne', text: 'Chaque nouvelle commande sonne et s’affiche, avec les choix du client et le temps écoulé.' },
  { icon: '🛵', title: 'App livreur', text: 'Les commandes prêtes, l’itinéraire jusqu’au point exact du client, l’appel en un geste, le montant à encaisser.' },
  { icon: '🎨', title: 'Votre marque, pas la nôtre', text: 'Votre logo, vos couleurs, votre photo, votre lien. Vos clients installent l’app de VOTRE restaurant.' },
  { icon: '📲', title: 'Notifications, même app fermée', text: 'Le client est prévenu à chaque étape ; la cuisine, les livreurs et le gérant aussi, chacun pour ce qui le concerne.' },
  { icon: '🏪', title: 'Plusieurs adresses', text: 'Une carte commune, des ruptures et des prix par point de vente, une équipe et un lien pour chacun.' },
]

/** La page d'accueil de Tchopi, pour les restaurants. */
export default function Landing() {
  return (
    <div className={styles.page}>
      <LandingHeader />

      <main>
        {/* Accueil */}
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <p className={styles.kicker}>Pour les restaurants, fast-foods et pizzerias du Cameroun</p>
            <h1>Vos clients suivent leur livraison en direct. <span>Vous, vous cuisinez.</span></h1>
            <p className={styles.lead}>
              Tchopi donne à votre restaurant sa propre app de commande : un lien à partager,
              la cuisine et les livreurs connectés, et le suivi en temps réel pour chaque client.
            </p>
            <div className={styles.heroActions}>
              <Link href="/creer" className={styles.primaryCta}>Essayer gratuitement 14 jours</Link>
              <Link href="/best-pizza" className={styles.secondaryCta}>Voir une vitrine en action</Link>
            </div>
            <p className={styles.reassure}>Sans carte bancaire · Prêt en 5 minutes · Sans engagement</p>
          </div>

          {/* Ce que voit le client : son suivi de commande */}
          <div className={styles.phone} aria-hidden="true">
            <div className={styles.phoneScreen}>
              <p className={styles.phoneKicker}>Chez Mama · Commande #12</p>
              <div className={styles.phoneEta}>
                <span>Arrivée estimée</span>
                <strong>vers 20 h 15</strong>
              </div>
              <ol className={styles.phoneSteps}>
                <li className={styles.done}><span />Commande reçue<time>19 h 42</time></li>
                <li className={styles.done}><span />En préparation<time>19 h 44</time></li>
                <li className={styles.done}><span />Prête<time>20 h 01</time></li>
                <li className={styles.now}><span />En route<time>20 h 03</time><small>Paul arrive avec votre commande.</small></li>
                <li><span />Livrée</li>
              </ol>
              <div className={styles.phoneMap}>
                <i className={styles.road1} /><i className={styles.road2} /><i className={styles.road3} />
                <b className={styles.pinDriver}>🛵</b>
                <b className={styles.pinHome}>🏠</b>
              </div>
            </div>
          </div>
        </section>

        {/* Le problème */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>La livraison, c’est là que vous perdez des clients</h2>
          <div className={styles.pains}>
            {PAINS.map((p) => (
              <article key={p.title} className={styles.pain}>
                <span aria-hidden="true">{p.icon}</span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Comment ça marche */}
        <section className={`${styles.section} ${styles.dark}`}>
          <h2 className={styles.sectionTitle}>En ligne aujourd’hui, en trois étapes</h2>
          <ol className={styles.steps}>
            {STEPS.map((s, i) => (
              <li key={s.title} className={styles.step}>
                <span className={styles.stepNumber}>{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Fonctionnalités */}
        <section id="fonctionnalites" className={styles.section}>
          <h2 className={styles.sectionTitle}>Tout ce qu’il faut, de la commande à la porte</h2>
          <div className={styles.features}>
            {FEATURES.map((f) => (
              <article key={f.title} className={styles.feature}>
                <span aria-hidden="true">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Démonstration */}
        <section className={styles.demo}>
          <div>
            <h2>Voyez par vous-même</h2>
            <p>Best Pizza commande et livre déjà avec Tchopi. Ouvrez sa vitrine comme un client : la carte, le panier, la commande sans compte.</p>
          </div>
          <Link href="/best-pizza" className={styles.primaryCta}>Ouvrir la vitrine de Best Pizza</Link>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className={styles.section}>
          <h2 className={styles.sectionTitle}>Un prix simple, en FCFA</h2>
          <p className={styles.sectionLead}>Pas de commission sur vos ventes : un abonnement fixe, c’est tout.</p>
          <PricingPlans />
        </section>

        {/* Questions */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Vos questions</h2>
          <Faq />
        </section>

        <section className={styles.final}>
          <h2>Votre restaurant en ligne ce soir</h2>
          <p>14 jours gratuits pour essayer avec vos vrais clients.</p>
          <Link href="/creer" className={styles.primaryCta}>Créer mon restaurant</Link>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
