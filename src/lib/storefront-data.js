import { cache } from 'react'
import { createClient } from '@/utils/supabase/server'

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * La vitrine d'un restaurant, côté serveur : sa partie publique (vue storefronts)
 * et ses points de vente. null si le restaurant n'existe pas ou est suspendu.
 * Mis en cache le temps d'une requête : le layout, la page et les métadonnées
 * le demandent chacun sans refaire la lecture.
 */
export const loadStorefront = cache(async (slug) => {
  if (!SLUG.test(String(slug || ''))) return null

  const supabase = await createClient()
  const { data: storefront } = await supabase
    .from('storefronts')
    .select('id, slug, name, logo_url, primary_color, country, currency, timezone, locale, plan')
    .eq('slug', slug)
    .maybeSingle()
  if (!storefront) return null

  const { data: locations } = await supabase
    .from('locations')
    .select('id, slug, name, address, phone, is_open')
    .eq('organization_id', storefront.id)
    .order('created_at')

  return { ...storefront, locations: locations || [] }
})
