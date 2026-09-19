import { getProductById } from '@/data/products'
import ProductClient from './ProductClient'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function generateMetadata({ params }) {
  const { id } = await params
  let title = "Best Pizza"
  let image = "/margherita.png"
  
  if (id.length > 10) {
    const supabase = await createClient()
    const { data } = await supabase.from('products').select('title, image').eq('id', id).single()
    if (data) {
      title = `${data.title} - Best Pizza`
      image = data.image
    }
  } else {
    const product = getProductById(id)
    if (product) {
      title = `${product.title} - Best Pizza`
      image = product.image
    }
  }

  return {
    title: title,
    description: `Commandez ${title} en ligne sur Best Pizza !`,
    openGraph: {
      title: title,
      description: `Délicieux ! Commandez ${title} chez Best Pizza.`,
      images: [image],
    },
  }
}

export default async function ProductPage({ params }) {
  const { id } = await params
  
  const supabase = await createClient()
  
  let product = null
  
  // Si c'est un UUID valide, on cherche dans supabase
  if (id.length > 10) {
    const { data } = await supabase.from('products').select('*, reviews(*)').eq('id', id).single()
    if (data) {
      product = { ...data }
      const avg = product.reviews && product.reviews.length > 0 ? (product.reviews.reduce((a, b) => a + b.rating, 0) / product.reviews.length).toFixed(1) : null
      product.rating = avg
    }
  }
  
  // Fallback sur le mock
  if (!product) {
    product = getProductById(id)
  }

  if (!product) {
    notFound()
  }

  return <ProductClient product={product} />
}
