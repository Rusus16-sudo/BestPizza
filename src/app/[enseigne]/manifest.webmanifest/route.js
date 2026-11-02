import { NextResponse } from 'next/server'
import { loadStorefront } from '@/lib/storefront-data'
import { appIconUrl } from '@/lib/brand'

// L'app installable d'un restaurant : son nom et son icône sur l'écran d'accueil,
// et elle s'ouvre directement sur sa vitrine.
export async function GET(request, { params }) {
  const { enseigne } = await params
  const storefront = await loadStorefront(enseigne)
  if (!storefront) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })

  // Son logo, sinon ses initiales sur sa couleur : jamais l'icône d'un autre
  const icons = storefront.logo_url
    ? [{ src: storefront.logo_url, sizes: '512x512', type: 'image/png', purpose: 'any' }]
    : [192, 512].map((size) => ({ src: appIconUrl(storefront, size), sizes: `${size}x${size}`, type: 'image/png', purpose: 'any maskable' }))

  return NextResponse.json({
    id: `/${storefront.slug}`,
    name: storefront.name,
    short_name: storefront.name.slice(0, 12),
    description: `Commandez chez ${storefront.name}`,
    start_url: `/${storefront.slug}`,
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: storefront.primary_color || '#d93a1f',
    icons,
  }, { headers: { 'Content-Type': 'application/manifest+json' } })
}
