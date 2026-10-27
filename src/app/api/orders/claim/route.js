import { NextResponse } from 'next/server'
import { createAdminClient, requireUser } from '@/utils/supabase/admin'
import { TRACKING_TOKEN } from '@/lib/tracked-orders'

// Un client qui vient de créer son compte (ou de se connecter) récupère les
// commandes passées sans compte sur cet appareil : leurs liens de suivi sont la
// preuve qu'il les a passées. Une commande déjà liée à un compte n'est jamais déplacée.
export async function POST(request) {
  const auth = await requireUser()
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const tokens = [...new Set((Array.isArray(body.tokens) ? body.tokens : []).map(String))]
    .filter((t) => TRACKING_TOKEN.test(t))
    .slice(0, 50)
  if (tokens.length === 0) return NextResponse.json({ claimed: 0 })

  const { data, error } = await createAdminClient()
    .from('orders')
    .update({ user_id: auth.user.id })
    .in('tracking_token', tokens)
    .is('user_id', null)
    .select('id')

  if (error) {
    console.error('Rattachement des commandes:', error.message)
    return NextResponse.json({ error: "Les commandes n'ont pas pu être rattachées" }, { status: 500 })
  }
  return NextResponse.json({ claimed: data.length })
}
