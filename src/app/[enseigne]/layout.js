import { notFound } from 'next/navigation'
import { loadStorefront } from '@/lib/storefront-data'
import { brandColorVars, appIconUrl, initialsOf } from '@/lib/brand'
import { StorefrontProvider } from '@/context/StorefrontContext'
import styles from './Storefront.module.css'

// La vitrine d'un restaurant : tchopi.cm/<enseigne>/…
// Les pages de l'application (/admin, /login…) ont des adresses fixes, prioritaires
// sur ce segment : elles ne passent jamais par ici.
export async function generateMetadata({ params }) {
  const { enseigne } = await params
  const storefront = await loadStorefront(enseigne)
  if (!storefront) return {}

  return {
    title: { default: `${storefront.name} · Commandez en ligne`, template: `%s · ${storefront.name}` },
    description: `Commandez chez ${storefront.name} et suivez votre livraison en direct.`,
    manifest: `/${storefront.slug}/manifest.webmanifest`,
    applicationName: storefront.name,
    icons: { apple: appIconUrl(storefront, 180) },
    appleWebApp: { capable: true, statusBarStyle: 'default', title: storefront.name },
  }
}

export default async function StorefrontLayout({ children, params }) {
  const { enseigne } = await params
  const storefront = await loadStorefront(enseigne)
  if (!storefront) notFound()

  // Abonnement fini depuis plus de 3 jours : la vitrine est en pause, rien n'est perdu
  if (!storefront.open) {
    return (
      <main className={styles.paused} style={brandColorVars(storefront.primary_color)}>
        {storefront.logo_url
          ? <img src={storefront.logo_url} alt="" className={styles.pausedLogo} />
          : <span className={styles.pausedLogo}>{initialsOf(storefront.name)}</span>}
        <h1>{storefront.name}</h1>
        <p>Ce restaurant ne prend pas de commandes en ligne pour le moment. Revenez bientôt !</p>
      </main>
    )
  }

  return (
    <StorefrontProvider storefront={storefront}>
      {/* La couleur est posée ici dès le rendu serveur, sans attendre le navigateur */}
      <div style={brandColorVars(storefront.primary_color)}>
        {children}
        {/* En offre Starter, la vitrine dit qu'elle est faite avec Tchopi (retiré en Pro et Business) */}
        {storefront.plan === 'starter' && (
          <footer className={styles.poweredBy}>
            Propulsé par <strong>Tchopi</strong>
          </footer>
        )}
      </div>
    </StorefrontProvider>
  )
}
