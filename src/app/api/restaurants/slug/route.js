import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { slugProblem } from '@/lib/slug'

// L'adresse d'un lien est-elle libre ? Vérifié pendant la saisie, à l'inscription.
// La table des enseignes n'est pas publique : la clé serveur ne renvoie qu'un oui ou non.
export async function GET(request) {
  const slug = String(new URL(request.url).searchParams.get('value') || '').trim().toLowerCase()
  const problem = slugProblem(slug)
  if (problem) return NextResponse.json({ available: false, reason: problem })

  const { data } = await createAdminClient().from('organizations').select('id').eq('slug', slug).maybeSingle()
  return NextResponse.json(data
    ? { available: false, reason: 'Déjà prise par un autre restaurant.' }
    : { available: true })
}
