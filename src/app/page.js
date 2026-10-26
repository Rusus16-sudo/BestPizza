import { createClient } from '@/utils/supabase/server'
import HomeClient from './HomeClient'
import { getStaffMembership, screenRole, HOME_BY_ROLE } from '@/lib/staff'
import { products as mockProducts } from '@/data/products'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    // La cuisine et les livreurs vont directement à leur écran de travail
    const role = screenRole(await getStaffMembership(supabase, user.id))
    if (role === 'livreur' || role === 'cuisinier') {
      const { redirect } = await import('next/navigation')
      redirect(HOME_BY_ROLE[role])
    }
  }

  const { data: productsData, error } = await supabase.from('products').select('*, reviews(rating)')
  
  let products = productsData
  if (products) {
    products = products.map(p => {
      const avg = p.reviews && p.reviews.length > 0 ? (p.reviews.reduce((a, b) => a + b.rating, 0) / p.reviews.length).toFixed(1) : null
      return { ...p, rating: avg }
    })
  }

  const finalProducts = (products && products.length > 0) ? products : mockProducts

  const { data: offers } = await supabase.from('offers').select('*').order('created_at', { ascending: false })
  const now = new Date()
  const activeOffers = offers ? offers.filter(o => !o.valid_until || new Date(o.valid_until) >= now) : []
  const latestOffer = activeOffers.length > 0 ? activeOffers[0] : null

  return <HomeClient user={user} products={finalProducts} latestOffer={latestOffer} />
}
