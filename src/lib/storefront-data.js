import { cache } from 'react'
import { createClient } from '@/utils/supabase/server'

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/

/**
 * La vitrine d'un restaurant, côté serveur : sa partie publique (vue storefronts)
 * et ses points de vente, avec leurs horaires, leurs frais et leurs quartiers. null si le restaurant n'existe pas ou est suspendu.
 * Mis en cache le temps d'une requête : le layout, la page et les métadonnées
 * le demandent chacun sans refaire la lecture.
 */
export const loadStorefront = cache(async (slug) => {
  if (!SLUG.test(String(slug || ''))) return null

  const supabase = await createClient()
  const { data: storefront } = await supabase
    .from('storefronts')
    .select('id, slug, name, logo_url, primary_color, country, currency, timezone, locale, plan, cover_url, tagline_title, tagline_text')
    .eq('slug', slug)
    .maybeSingle()
  if (!storefront) return null

  const { data: locations } = await supabase
    .from('locations')
    .select('id, slug, name, address, phone, is_open, opening_hours, delivery_fee, minimum_order, free_delivery_from')
    .eq('organization_id', storefront.id)
    .order('created_at')

  // Les quartiers desservis par chaque point de vente, avec leur tarif
  const ids = (locations || []).map((l) => l.id)
  const { data: zones } = ids.length
    ? await supabase.from('delivery_zones').select('id, location_id, name, fee').in('location_id', ids).order('position')
    : { data: [] }

  return {
    ...storefront,
    locations: (locations || []).map((l) => ({ ...l, zones: (zones || []).filter((z) => z.location_id === l.id) })),
  }
})
