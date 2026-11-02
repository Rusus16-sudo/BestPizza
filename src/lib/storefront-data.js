import { cache } from 'react'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { subscriptionState } from '@/lib/subscription'

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
  const [{ data: zones }, { data: rules }] = ids.length
    ? await Promise.all([
      supabase.from('delivery_zones').select('id, location_id, name, fee').in('location_id', ids).order('position'),
      // Les plats en rupture ou à un autre prix à une adresse
      supabase.from('product_locations').select('product_id, location_id, is_available, price_override').in('location_id', ids),
    ])
    : [{ data: [] }, { data: [] }]

  // L'abonnement, lu côté serveur seulement : ces dates ne sont pas publiques
  const { data: billing } = await createAdminClient()
    .from('organizations')
    .select('plan_status, trial_ends_at, paid_until')
    .eq('id', storefront.id)
    .maybeSingle()

  return {
    ...storefront,
    // Faux quand l'essai ou l'abonnement est fini depuis plus de 3 jours : la vitrine est en pause
    open: subscriptionState(billing)?.open !== false,
    locations: (locations || []).map((l) => ({
      ...l,
      zones: (zones || []).filter((z) => z.location_id === l.id),
      rules: (rules || []).filter((r) => r.location_id === l.id),
    })),
  }
})
