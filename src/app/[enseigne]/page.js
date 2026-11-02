import { createClient } from '@/utils/supabase/server'
import { loadStorefront } from '@/lib/storefront-data'
import HomeClient from './HomeClient'
import { hasFeature } from '@/lib/plans'

// Accueil de la vitrine d'un restaurant : uniquement ses plats et ses offres
export default async function StorefrontHome({ params }) {
  const { enseigne } = await params
  const storefront = await loadStorefront(enseigne)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: productsData }, { data: offers }] = await Promise.all([
    supabase.from('products').select('*, reviews(rating)').eq('organization_id', storefront.id),
    supabase.from('offers').select('*').eq('organization_id', storefront.id).order('created_at', { ascending: false }),
  ])

  // Les avis et les offres sont inclus à partir de Pro
  const withReviews = hasFeature(storefront.plan, 'reviews')
  const products = (productsData || []).map(p => {
    const avg = withReviews && p.reviews && p.reviews.length > 0 ? (p.reviews.reduce((a, b) => a + b.rating, 0) / p.reviews.length).toFixed(1) : null
    return { ...p, rating: avg }
  })

  const now = new Date()
  const latestOffer = hasFeature(storefront.plan, 'promos')
    ? (offers || []).find(o => !o.valid_until || new Date(o.valid_until) >= now) || null
    : null

  return <HomeClient user={user} products={products} latestOffer={latestOffer} />
}
