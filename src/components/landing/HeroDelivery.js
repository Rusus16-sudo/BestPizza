import styles from './HeroDelivery.module.css'

// Le trajet du livreur, de Chez Mama (en haut à gauche) à la maison d'Awa (en bas à droite)
const ROUTE = 'M118 132 L214 132 Q244 132 258 156 L300 226 Q312 246 336 246 L436 246 Q466 246 471 276 L486 372 Q491 404 522 414 L560 426'

/**
 * Une livraison en direct, comme le client la vit : la carte de Douala, le livreur
 * qui roule, et le suivi qui avance tout seul (12 s, en boucle). Une seule animation
 * sur la page : celle-ci. Sans animation (préférence du système), le livreur est arrêté en route.
 */
export default function HeroDelivery() {
  return (
    <div className={styles.stage}>
      <svg className={styles.map} viewBox="0 0 640 560" aria-hidden="true" focusable="false">
        <rect width="640" height="560" fill="#ece6d9" />

        {/* Le Wouri */}
        <path d="M0 410 C70 392 120 430 170 470 C210 502 230 560 230 560 L0 560 Z" fill="#cfe1e4" />
        <text x="40" y="500" className={styles.water}>Wouri</text>

        {/* Les pâtés de maisons */}
        <g fill="#e1d9c8">
          <rect x="30" y="30" width="150" height="70" rx="8" />
          <rect x="230" y="30" width="170" height="80" rx="8" />
          <rect x="440" y="30" width="170" height="100" rx="8" />
          <rect x="30" y="170" width="120" height="120" rx="8" />
          <rect x="190" y="280" width="90" height="110" rx="8" />
          <rect x="340" y="140" width="80" height="70" rx="8" />
          <rect x="520" y="170" width="100" height="160" rx="8" />
          <rect x="320" y="300" width="120" height="100" rx="8" />
          <rect x="290" y="440" width="150" height="90" rx="8" />
          <rect x="520" y="460" width="100" height="80" rx="8" />
          <rect x="60" y="320" width="90" height="60" rx="8" />
        </g>
        <rect x="350" y="150" width="60" height="50" rx="8" fill="#d6e4cf" />

        {/* Les rues : un liseré, puis la chaussée */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <g stroke="#d6cdb9" strokeWidth="26">
            <path d="M0 132 H640" /><path d="M0 246 H640" /><path d="M214 0 L330 560" />
            <path d="M471 0 V560" /><path d="M300 226 L180 560" /><path d="M471 414 H640" />
          </g>
          <g stroke="#fbf8f2" strokeWidth="20">
            <path d="M0 132 H640" /><path d="M0 246 H640" /><path d="M214 0 L330 560" />
            <path d="M471 0 V560" /><path d="M300 226 L180 560" /><path d="M471 414 H640" />
          </g>
        </g>

        {/* Le trajet : en pointillés, puis en jaune taxi à mesure que le livreur avance */}
        <path id="tchopi-route" d={ROUTE} fill="none" stroke="#221e1a" strokeOpacity=".25" strokeWidth="4" strokeDasharray="2 9" strokeLinecap="round" />
        <path className={styles.trail} d={ROUTE} pathLength="1" fill="none" stroke="#f2b10a" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1">
          <animate attributeName="stroke-dashoffset" values="1;1;0;0" keyTimes="0;.28;.92;1" dur="12s" repeatCount="indefinite" />
        </path>

        {/* Repères, comme on donne une adresse à Douala */}
        <g className={styles.landmark} style={{ animationDelay: '0.7s' }} transform="translate(336 214)">
          <rect x="-4" y="-16" width="132" height="24" rx="12" />
          <text x="10" y="1">Carrefour Ndokoti</text>
        </g>
        <g className={styles.landmark} style={{ animationDelay: '0.85s' }} transform="translate(498 462)">
          <rect x="-4" y="-16" width="114" height="24" rx="12" />
          <text x="10" y="1">Face pharmacie</text>
        </g>

        {/* Le restaurant et la maison du client */}
        <g transform="translate(118 132)">
          <circle r="22" fill="#d2361b" stroke="#fff" strokeWidth="4" />
          <text className={styles.emoji} y="7">🍲</text>
          <g className={styles.landmark} style={{ animationDelay: '0.55s' }} transform="translate(-58 -46)">
            <rect x="-4" y="-16" width="96" height="24" rx="12" />
            <text x="10" y="1">Chez Mama</text>
          </g>
        </g>
        <g transform="translate(560 426)">
          <circle r="22" fill="#221e1a" stroke="#fff" strokeWidth="4" />
          <text className={styles.emoji} y="7">🏠</text>
        </g>

        {/* Le livreur */}
        {/* Il arrive au restaurant quand la commande est prête, puis part */}
        <g className={styles.rider} opacity="0">
          <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;.2;.23;.99;1" dur="12s" repeatCount="indefinite" />
          <circle className={styles.pulse} r="24" fill="#f2b10a" />
          <circle r="24" fill="#f2b10a" stroke="#fff" strokeWidth="4" />
          <text className={styles.emoji} y="7">🛵</text>
          <animateMotion dur="12s" repeatCount="indefinite" keyPoints="0;0;1;1" keyTimes="0;.28;.92;1" calcMode="linear">
            <mpath href="#tchopi-route" />
          </animateMotion>
        </g>
        {/* Sans animation : arrêté en route */}
        <g className={styles.riderStill} transform="translate(386 246)">
          <circle r="24" fill="#f2b10a" stroke="#fff" strokeWidth="4" />
          <text className={styles.emoji} y="7">🛵</text>
        </g>
      </svg>

      {/* Le suivi, synchronisé avec le livreur */}
      <div className={styles.card} aria-hidden="true">
        <div className={styles.cardTop}>
          <span className={styles.order}>Commande n° 12</span>
          <span className={styles.eta}>
            <span className={styles.e1}>Arrivée vers 20 h 15</span>
            <span className={styles.e2}>Arrivée dans 12 min</span>
            <span className={styles.e3}>Arrivée dans 7 min</span>
            <span className={styles.e4}>Arrivée dans 2 min</span>
            <span className={styles.e5}>Livrée à 20 h 13</span>
          </span>
        </div>
        <p className={styles.status}>
          <span className={styles.s1}>Commande reçue par le restaurant</span>
          <span className={styles.s2}>La cuisine prépare 2 Poulet DG</span>
          <span className={styles.s3}>Prête, Paul la récupère</span>
          <span className={styles.s4}>Paul arrive avec votre commande</span>
          <span className={styles.s5}>Livrée. Bon appétit, Awa !</span>
        </p>
        <div className={styles.progress}><span /></div>
      </div>
    </div>
  )
}
