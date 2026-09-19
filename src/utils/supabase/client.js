import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

let browserClient = null

// Client réutilisé dans tout l'onglet, créé uniquement dans le navigateur :
// pendant le rendu serveur (et la préparation des pages au build), il n'y a rien à créer.
export function getBrowserClient() {
  if (typeof window === 'undefined') return null
  if (!browserClient) browserClient = createClient()
  return browserClient
}
