import { getProductById } from '@/data/products'
import ProductClient from './ProductClient'
import { notFound } from 'next/navigation'

export default async function ProductPage({ params }) {
  const { id } = await params
  const product = getProductById(id)

  if (!product) {
    notFound()
  }

  return <ProductClient product={product} />
}
