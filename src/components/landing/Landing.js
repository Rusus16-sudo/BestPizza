import Link from 'next/link'
import LandingHeader from './LandingHeader'
import LandingFooter from './LandingFooter'
import HeroDelivery from './HeroDelivery'
import PricingPlans from './PricingPlans'
import Faq from './Faq'
import styles from './Landing.module.css'

// Les messages que reçoit un restaurant sans suivi, un soir de rush
const MESSAGES = [
  { time: '19:58', text: 'Bonsoir, ma commande est où ?' },
  { time: '20:14', text: 'Allô ?? Le livreur ne décroche pas 😤' },
  { time: '20:31', text: 'Laissez tomber, j’ai commandé ailleurs.' },
]

// Les autres outils, pour une simple liste
const MORE = [
  ['Commande sans compte', 'Le client commande avec son nom et son numéro. Il crée un compte s’il le veut, après.'],
  ['Notifications, même app fermée', 'Le client à chaque étape ; la cuisine, les livreurs et le gérant pour ce qui les concerne.'],
  ['Plusieurs adresses', 'Une carte commune, des ruptures et des prix par point de vente, une équipe et un lien pour chacun.'],
  ['Le livreur signale un problème', 'Client injoignable, adresse introuvable : le gérant et le client sont prévenus tout de suite.'],
  ['Codes promo et avis', 'Vos offres sur la vitrine, et les avis de vos clients après chaque livraison.'],
  ['Alertes de retard', 'Une commande qui traîne passe en tête de l’écran du gérant, avec le temps écoulé.'],
]

// Une même vitrine, aux couleurs de trois restaurants
const SHOPS = [
  { name: 'Chez Mama', color: '#d93a1f', dish: 'Poulet DG' },
  { name: 'Le Soya d’Or', color: '#1f6f4a', dish: 'Soya de bœuf' },
  { name: 'Bao Pizza', color: '#7048e8', dish: 'Pizza reine' },
]

/** La page d'accueil de Tchopi, pour les restaurants. */
export default function Landing() {
  return (
    <div className={styles.page}>
      <LandingHeader />

      <main>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <h1>Le client voit où est sa commande. Vous, vous cuisinez.</h1>
            <p className={styles.lead}>
              Tchopi donne à votre restaurant sa propre app de commande : un lien à partager,
              la cuisine et les livreurs connectés, et le suivi en direct jusqu’à la porte du client.
            </p>
            <div className={styles.heroActions}>
              <Link href="/creer" className={styles.primaryCta}>Créer mon restaurant</Link>
              <Link href="/best-pizza" className={styles.secondaryCta}>Voir une vitrine en vrai</Link>
            </div>
            <p className={styles.reassure}>14 jours gratuits, sans carte bancaire. En ligne en 5 minutes.</p>
          </div>
          <HeroDelivery />
        </section>

        {/* Le problème, tel que le restaurant le vit */}
        <section className={styles.chat}>
          <div className={styles.chatPhone} aria-label="Messages d’un client sans suivi de commande">
            <p className={styles.chatHead}><span aria-hidden="true">A</span>Awa, Bonapriso</p>
            {MESSAGES.map((m) => (
              <p key={m.time} className={styles.bubble}>
                {m.text}<time>{m.time}</time>
              </p>
            ))}
          </div>
          <div className={styles.chatText}>
            <h2>Chaque soir, le téléphone sonne pour la même question.</h2>
            <p>
              Pendant le rush, vous décrochez au lieu de cuisiner, le livreur ne répond pas,
              et le client finit par commander ailleurs.
            </p>
            <p>
              Avec Tchopi, il a la réponse avant de poser la question : son lien de suivi lui montre
              l’étape, l’heure d’arrivée et son livreur sur la carte.
            </p>
          </div>
        </section>

        {/* De la commande à la porte : un vrai enchaînement, d'où les numéros */}
        <section id="fonctionnalites" className={styles.flowSection}>
          <h2 className={styles.title}>De la commande à la porte, chacun voit ce qu’il doit faire</h2>
          <ol className={styles.flow}>
            <li>
              <h3><span>1</span>Awa commande</h3>
              <p>Depuis votre lien, sans compte, sans rien installer.</p>
              <div className={`${styles.mock} ${styles.mockOrder}`} aria-hidden="true">
                <div className={styles.mockLine}><b>2× Poulet DG</b><span>9 000 F</span></div>
                <div className={styles.mockLine}><span>Livraison Bonapriso</span><span>500 F</span></div>
                <div className={styles.mockPin}>📍 Position partagée</div>
                <div className={styles.mockButton}>Commander · 9 500 F</div>
              </div>
            </li>
            <li>
              <h3><span>2</span>La cuisine sonne</h3>
              <p>La commande s’affiche avec les choix d’Awa et le temps écoulé.</p>
              <div className={`${styles.mock} ${styles.mockKitchen}`} aria-hidden="true">
                <div className={styles.ticketHead}><b>#12</b><span>🔔 Nouvelle</span></div>
                <p>2× Poulet DG<br /><small>Sans piment, plantain mûr</small></p>
                <div className={styles.ticketTime}>depuis 2 min</div>
              </div>
            </li>
            <li>
              <h3><span>3</span>Paul la prend</h3>
              <p>Itinéraire jusqu’au point exact d’Awa, montant à encaisser, appel en un geste.</p>
              <div className={`${styles.mock} ${styles.mockDriver}`} aria-hidden="true">
                <div className={styles.mockLine}><b>Bonapriso</b><span>#12</span></div>
                <div className={styles.cash}>À encaisser <b>9 500 F</b></div>
                <div className={styles.driverActions}><span>Appeler</span><span>Itinéraire</span></div>
              </div>
            </li>
            <li>
              <h3><span>4</span>Awa suit Paul</h3>
              <p>Chaque étape, l’heure d’arrivée, et une notification même app fermée.</p>
              <div className={`${styles.mock} ${styles.mockTrack}`} aria-hidden="true">
                <small>Arrivée estimée</small>
                <b>vers 20 h 15</b>
                <div className={styles.dots}><i /><i /><i /><i className={styles.dotNow} /><i /></div>
              </div>
            </li>
          </ol>
        </section>

        {/* Le lien du restaurant, à ses couleurs */}
        <section className={styles.linkSection}>
          <p className={styles.bigLink} aria-label="tchopi.cm/chez-mama">
            <span className={styles.domain}>tchopi.cm/</span><wbr /><span>chez-mama</span>
          </p>
          <div className={styles.linkBody}>
            <div className={styles.linkText}>
              <h2>Votre lien, votre marque</h2>
              <p>
                Votre nom, votre logo, votre couleur et votre photo. Collez le lien dans votre bio
                et vos statuts WhatsApp, imprimez le QR code sur vos sacs : vos clients installent
                l’app de votre restaurant, pas la nôtre.
              </p>
            </div>
            <div className={styles.shops} aria-hidden="true">
              {SHOPS.map((s) => (
                <div key={s.name} className={styles.shop} style={{ '--shop': s.color }}>
                  <div className={styles.shopBar}><i>{s.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('')}</i>{s.name}</div>
                  <div className={styles.shopHero}>{s.name},<br />livré chez vous.</div>
                  <div className={styles.shopDish}><span>{s.dish}</span><b>+</b></div>
                </div>
              ))}
              <p className={styles.shopsNote}>Exemples de vitrines</p>
            </div>
          </div>
        </section>

        {/* Le reste, en simple liste */}
        <section className={styles.moreSection}>
          <h2 className={styles.title}>Et aussi</h2>
          <dl className={styles.more}>
            {MORE.map(([term, text]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
          <div className={styles.demo}>
            <p>Best Pizza commande et livre déjà avec Tchopi. Ouvrez sa vitrine comme un client.</p>
            <Link href="/best-pizza" className={styles.secondaryCta}>Ouvrir la vitrine de Best Pizza</Link>
          </div>
        </section>

        <section id="tarifs" className={styles.pricingSection}>
          <h2 className={styles.title}>Un abonnement fixe, en FCFA, sans commission sur vos ventes</h2>
          <PricingPlans />
        </section>

        <section className={styles.faqSection}>
          <h2 className={styles.title}>Vos questions</h2>
          <Faq />
        </section>

        <section className={styles.final}>
          <h2>Votre restaurant peut prendre ses commandes en ligne dès ce soir.</h2>
          <Link href="/creer" className={styles.primaryCta}>Créer mon restaurant</Link>
          <p>14 jours gratuits pour essayer avec vos vrais clients.</p>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
