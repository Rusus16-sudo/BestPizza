'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { brandColorVars } from '@/lib/brand'
import {
  DEFAULT_STOREFRONT, LAST_STOREFRONT_COOKIE, lastStorefrontSlug, storefrontHref, storefrontSlugFromPath,
} from '@/lib/storefront-paths'

// Le restaurant dont on visite la vitrine : nom, couleur, points de vente,
// et le point de vente choisi par le client.
const StorefrontContext = createContext(null)

const locationKey = (slug) => `tchopi_pdv:${slug}`

export function StorefrontProvider({ storefront, children }) {
  const { slug, locations } = storefront
  const [locationSlug, setLocationSlug] = useState(null)

  useEffect(() => {
    // Retenu pour les pages communes (mes commandes, profil…) et pour revenir ici depuis tchopi.cm
    document.cookie = `${LAST_STOREFRONT_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=31536000; samesite=lax`
    try {
      setLocationSlug(localStorage.getItem(locationKey(slug)))
    } catch {}
  }, [slug])

  // La couleur de l'enseigne s'applique aussi aux barres de navigation, hors de la vitrine
  useEffect(() => {
    const root = document.documentElement
    const vars = brandColorVars(storefront.primary_color)
    Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value))
    return () => Object.keys(vars).forEach((name) => root.style.removeProperty(name))
  }, [storefront.primary_color])

  const chooseLocation = useCallback((next) => {
    setLocationSlug(next)
    try {
      localStorage.setItem(locationKey(slug), next)
    } catch {}
  }, [slug])

  const location = locations.find((l) => l.slug === locationSlug) || locations[0] || null
  const href = useCallback((path) => storefrontHref(slug, path), [slug])

  return (
    <StorefrontContext.Provider value={{ ...storefront, location, chooseLocation, href }}>
      {children}
    </StorefrontContext.Provider>
  )
}

/** Le restaurant de la vitrine en cours, ou null hors d'une vitrine. */
export function useStorefront() {
  return useContext(StorefrontContext)
}

/**
 * Pour les éléments communs, hors de la vitrine (barres de navigation, mes commandes…) :
 * le restaurant visité, ou le dernier visité.
 */
export function useStorefrontSlug() {
  const storefront = useStorefront()
  const pathname = usePathname()
  const [last, setLast] = useState(null)
  useEffect(() => setLast(lastStorefrontSlug()), [pathname])

  return storefront?.slug || storefrontSlugFromPath(pathname) || last || DEFAULT_STOREFRONT
}

/** Construit l'adresse d'une page de la vitrine de ce restaurant : shop('/menu'). */
export function useStorefrontHref() {
  const slug = useStorefrontSlug()
  return useCallback((path) => storefrontHref(slug, path), [slug])
}

// Partie publique des restaurants déjà lus, pour ne pas la relire à chaque page
const publicInfo = new Map()

/** Nom, logo et couleur du restaurant visité (ou du dernier visité), même hors de sa vitrine. */
export function useStorefrontInfo() {
  const storefront = useStorefront()
  const slug = useStorefrontSlug()
  const [info, setInfo] = useState(storefront || publicInfo.get(slug) || null)

  useEffect(() => {
    if (storefront) return setInfo(storefront)
    if (publicInfo.has(slug)) return setInfo(publicInfo.get(slug))
    createClient()
      .from('storefronts')
      .select('id, slug, name, logo_url, primary_color')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        publicInfo.set(slug, data)
        setInfo(data)
      })
  }, [storefront, slug])

  return info
}
