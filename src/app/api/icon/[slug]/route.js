import { ImageResponse } from 'next/og'
import { loadStorefront } from '@/lib/storefront-data'
import { initialsOf } from '@/lib/brand'

const SIZES = [96, 180, 192, 512]

/**
 * L'icône d'un restaurant sans logo : ses initiales sur sa couleur.
 * Pour l'app installée (écran d'accueil) et la proposition d'installation.
 */
export async function GET(request, { params }) {
  const { slug } = await params
  const storefront = await loadStorefront(slug)
  if (!storefront) return new Response('Restaurant introuvable', { status: 404 })

  const asked = Number(new URL(request.url).searchParams.get('size')) || 192
  const size = SIZES.includes(asked) ? asked : 192

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: storefront.primary_color || '#d93a1f',
          color: 'white',
          fontSize: Math.round(size * 0.4),
          fontWeight: 800,
          letterSpacing: -Math.round(size * 0.02),
        }}
      >
        {initialsOf(storefront.name)}
      </div>
    ),
    {
      width: size,
      height: size,
      // Une heure : un changement de nom ou de couleur se voit vite
      headers: { 'Cache-Control': 'public, max-age=3600' },
    },
  )
}
