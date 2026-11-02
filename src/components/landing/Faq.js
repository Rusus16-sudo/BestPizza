import styles from './Landing.module.css'

const QUESTIONS = [
  {
    q: 'Mes clients doivent-ils télécharger une application ?',
    a: 'Non. Ils ouvrent votre lien (sur WhatsApp, Facebook, TikTok ou en scannant votre QR code) et commandent tout de suite, sans compte. Ils peuvent ensuite ajouter votre restaurant sur l’écran d’accueil de leur téléphone, comme une vraie app.',
  },
  {
    q: 'Comment je reçois l’argent des commandes ?',
    a: 'Aujourd’hui, vos clients paient le livreur à la livraison, et l’argent est à vous. Le paiement par MTN MoMo et Orange Money arrive bientôt dans les offres Pro et Business : il ira directement sur votre compte.',
  },
  {
    q: 'Combien de temps pour être prêt ?',
    a: 'Environ 5 minutes pour créer votre vitrine : le nom, le logo, la couleur, votre quartier et vos horaires. Ensuite vous ajoutez vos plats, et vous partagez votre lien.',
  },
  {
    q: 'Que se passe-t-il à la fin de l’essai gratuit ?',
    a: 'Vous choisissez votre offre et vous payez depuis votre espace. Rien n’est prélevé automatiquement. Sans paiement, votre vitrine est mise en pause après 3 jours de grâce, sans rien perdre : elle revient dès le paiement.',
  },
  {
    q: 'Mes livreurs ont-ils besoin d’un téléphone particulier ?',
    a: 'Non, un smartphone avec internet suffit. Ils reçoivent une notification quand une commande est prête, voient l’adresse et l’itinéraire, et vos clients suivent leur position en direct.',
  },
  {
    q: 'J’ai plusieurs restaurants. Est-ce possible ?',
    a: 'Oui, avec l’offre Business : une carte commune, des prix et des ruptures par adresse, des livreurs et un responsable pour chaque point de vente, et un lien pour chacun.',
  },
]

/** Les questions que se posent les restaurants. */
export default function Faq() {
  return (
    <div className={styles.faq}>
      {QUESTIONS.map(({ q, a }) => (
        <details key={q} className={styles.faqItem}>
          <summary>{q}</summary>
          <p>{a}</p>
        </details>
      ))}
    </div>
  )
}
