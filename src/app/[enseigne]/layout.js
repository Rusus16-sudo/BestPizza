import { notFound } from 'next/navigation'
import { loadStorefront } from '@/lib/storefront-data'
import { brandColorVars } from '@/lib/brand'
import { StorefrontProvider } from '@/context/StorefrontContext'

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
    appleWebApp: { capable: true, statusBarStyle: 'default', title: storefront.name },
  }
}

export default async function StorefrontLayout({ children, params }) {
  const { enseigne } = await params
  const storefront = await loadStorefront(enseigne)
  if (!storefront) notFound()

  return (
    <StorefrontProvider storefront={storefront}>
      {/* La couleur est posée ici dès le rendu serveur, sans attendre le navigateur */}
      <div style={brandColorVars(storefront.primary_color)}>
        {children}
      </div>
    </StorefrontProvider>
  )
}
