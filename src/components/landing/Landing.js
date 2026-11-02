import Link from 'next/link'
import LandingHeader from './LandingHeader'
import LandingFooter from './LandingFooter'
import HeroDelivery from './HeroDelivery'
import PricingPlans from './PricingPlans'
import Faq from './Faq'
import Reveal from './Reveal'
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
export default function Landing({ account = null }) {
  return (
    <div className={styles.page}>
      <LandingHeader account={account} />

      <main>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <h1>
              <span className={styles.line}>Le client voit où est sa commande.</span>{' '}
              <span className={styles.line}>Vous, vous cuisinez.</span>
            </h1>
            <p className={styles.lead}>
              Tchopi donne à votre restaurant sa propre app de commande : un lien à partager,
              la cuisine et les livreurs connectés, et le suivi en direct jusqu’à la porte du client.
            </p>
            <div className={styles.heroActions}>
              <Link href="/creer" className={styles.primaryCta}>Créer mon restaurant</Link>
              <Link href="/best-pizza" className={styles.secondaryCta}>Voir une vitrine en vrai</Link>
            </div>
            <p className={styles.reassure}>Offre Pro gratuite pendant 14 jours, sans carte bancaire. En ligne en 5 minutes.</p>
          </div>
          <HeroDelivery />
        </section>

        {/* Le problème, tel que le restaurant le vit */}
        <Reveal as="section" className={styles.chat}>
          <div className={styles.chatPhone} aria-label="Messages d’un client sans suivi de commande">
            <p className={styles.chatHead}><span aria-hidden="true">A</span>Awa, Bonapriso</p>
            {MESSAGES.map((m, i) => (
              <div key={m.time} className={styles.slot} style={{ '--d': `${0.9 + i * 1.5}s` }}>
                <span className={styles.typing} aria-hidden="true"><i /><i /><i /></span>
                <p className={styles.bubble}>
                  {m.text}<time>{m.time}</time>
                </p>
              </div>
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
        </Reveal>

        {/* De la commande à la porte : un vrai enchaînement, d'où les numéros */}
        <Reveal as="section" id="fonctionnalites" className={styles.flowSection} threshold={0.25}>
          <h2 className={styles.title}>De la commande à la porte, chacun voit ce qu’il doit faire</h2>
          <ol className={styles.flow}>
            <li style={{ '--i': 0 }}>
              <h3><span>1</span>Awa commande</h3>
              <p>Depuis votre lien, sans compte, sans rien installer.</p>
              <div className={`${styles.mock} ${styles.mockOrder}`} aria-hidden="true">
                <div className={styles.mockLine}><b>2× Poulet DG</b><span>9 000 F</span></div>
                <div className={styles.mockLine}><span>Livraison Bonapriso</span><span>500 F</span></div>
                <div className={styles.mockPin}>📍 Position partagée</div>
                <div className={styles.mockButton}>Commander · 9 500 F</div>
              </div>
            </li>
            <li style={{ '--i': 1 }}>
              <h3><span>2</span>La cuisine sonne</h3>
              <p>La commande s’affiche avec les choix d’Awa et le temps écoulé.</p>
              <div className={`${styles.mock} ${styles.mockKitchen}`} aria-hidden="true">
                <div className={styles.ticketHead}><b>#12</b><span>🔔 Nouvelle</span></div>
                <p>2× Poulet DG<br /><small>Sans piment, plantain mûr</small></p>
                <div className={styles.ticketTime}>depuis 2 min</div>
              </div>
            </li>
            <li style={{ '--i': 2 }}>
              <h3><span>3</span>Paul la prend</h3>
              <p>Itinéraire jusqu’au point exact d’Awa, montant à encaisser, appel en un geste.</p>
              <div className={`${styles.mock} ${styles.mockDriver}`} aria-hidden="true">
                <div className={styles.mockLine}><b>Bonapriso</b><span>#12</span></div>
                <div className={styles.cash}>À encaisser <b>9 500 F</b></div>
                <div className={styles.driverActions}><span>Appeler</span><span>Itinéraire</span></div>
              </div>
            </li>
            <li style={{ '--i': 3 }}>
              <h3><span>4</span>Awa suit Paul</h3>
              <p>Chaque étape, l’heure d’arrivée, et une notification même app fermée.</p>
              <div className={`${styles.mock} ${styles.mockTrack}`} aria-hidden="true">
                <small>Arrivée estimée</small>
                <b>vers 20 h 15</b>
                <div className={styles.dots}><i /><i /><i /><i className={styles.dotNow} /><i /></div>
              </div>
            </li>
          </ol>
        </Reveal>

        {/* Le lien du restaurant, à ses couleurs : « chez-mama » se tape tout seul */}
        <Reveal as="section" className={styles.linkSection} threshold={0.4}>
          <p className={styles.bigLink} aria-label="tchopi.cm/chez-mama">
            <span className={styles.domain}>tchopi.cm/</span><wbr /><span className={styles.slug}>chez-mama</span><span className={styles.caret} aria-hidden="true" />
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
                <div key={s.name} className={styles.shop} style={{ '--shop': s.color, '--i': SHOPS.indexOf(s) }}>
                  <div className={styles.shopBar}><i>{s.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('')}</i>{s.name}</div>
                  <div className={styles.shopHero}>{s.name},<br />livré chez vous.</div>
                  <div className={styles.shopDish}><span>{s.dish}</span><b>+</b></div>
                </div>
              ))}
              <p className={styles.shopsNote}>Exemples de vitrines</p>
            </div>
          </div>
        </Reveal>

        {/* Le reste, en simple liste */}
        <section className={styles.moreSection}>
          <Reveal>
          <h2 className={styles.title}>Et aussi</h2>
          <dl className={styles.more}>
            {MORE.map(([term, text], i) => (
              <div key={term} style={{ '--i': i }}>
                <dt>{term}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
          </Reveal>
          <Reveal className={styles.demo} threshold={0.6}>
            <p>Best Pizza commande et livre déjà avec Tchopi. Ouvrez sa vitrine comme un client.</p>
            <Link href="/best-pizza" className={styles.secondaryCta}>Ouvrir la vitrine de Best Pizza</Link>
          </Reveal>
        </section>

        <Reveal as="section" id="tarifs" className={styles.pricingSection} threshold={0.2}>
          <h2 className={styles.title}>Un abonnement fixe, en FCFA, sans commission sur vos ventes</h2>
          <PricingPlans />
        </Reveal>

        <Reveal as="section" className={styles.faqSection} threshold={0.2}>
          <h2 className={styles.title}>Vos questions</h2>
          <Faq />
        </Reveal>

        {/* La fin : le livreur traverse, comme au début de la page */}
        <Reveal as="section" className={styles.final} threshold={0.4}>
          <div className={styles.road} aria-hidden="true">
            <span className={styles.roadTrail} />
            <span className={styles.roadRider}>🛵</span>
          </div>
          <h2>Votre restaurant peut prendre ses commandes en ligne dès ce soir.</h2>
          <Link href="/creer" className={styles.primaryCta}>Créer mon restaurant</Link>
          <p>L’offre Pro est gratuite pendant 14 jours : essayez-la avec vos vrais clients.</p>
        </Reveal>
      </main>

      <LandingFooter />
    </div>
  )
}
