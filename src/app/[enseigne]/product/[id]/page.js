import ProductClient from './ProductClient'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { loadStorefront } from '@/lib/storefront-data'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Un plat de CE restaurant : l'identifiant d'un plat d'un autre restaurant ne s'ouvre pas ici
async function loadProduct(enseigne, id, columns) {
  if (!UUID.test(id)) return null
  const storefront = await loadStorefront(enseigne)
  if (!storefront) return null
  const supabase = await createClient()
  const { data } = await supabase.from('products').select(columns)
    .eq('id', id).eq('organization_id', storefront.id).maybeSingle()
  return data
}

export async function generateMetadata({ params }) {
  const { enseigne, id } = await params
  const product = await loadProduct(enseigne, id, 'title, image, description')
  if (!product) return {}

  // Le nom du restaurant est ajouté par le modèle de titre de la vitrine
  return {
    title: product.title,
    description: product.description || `Commandez ${product.title} en ligne.`,
    openGraph: {
      title: product.title,
      description: product.description || `Commandez ${product.title} en ligne.`,
      images: product.image ? [product.image] : [],
    },
  }
}

export default async function ProductPage({ params }) {
  const { enseigne, id } = await params
  const product = await loadProduct(enseigne, id, '*, reviews(*)')
  if (!product) notFound()

  const rating = product.reviews?.length
    ? (product.reviews.reduce((a, b) => a + b.rating, 0) / product.reviews.length).toFixed(1)
    : null

  return <ProductClient product={{ ...product, rating }} />
}
