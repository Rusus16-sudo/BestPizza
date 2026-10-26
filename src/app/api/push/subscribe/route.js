import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

// Enregistre l'appareil du client connecté pour les notifications push.
// Si l'appareil était lié à un autre compte, il passe au compte actuel.
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps illisible' }, { status: 400 })
  }

  const endpoint = body?.endpoint
  const p256dh = body?.keys?.p256dh
  const auth = body?.keys?.auth
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://') || !p256dh || !auth) {
    return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 })
  }

  const db = createAdminClient()
  const { error } = await db
    .from('push_subscriptions')
    .upsert({ user_id: user.id, endpoint, p256dh, auth }, { onConflict: 'endpoint' })

  if (error) {
    console.error('Enregistrement abonnement push:', error.message)
    return NextResponse.json({ error: "L'appareil n'a pas pu être enregistré" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// Oublie un appareil (notifications désactivées ou déconnexion).
// L'adresse d'abonnement est secrète : la connaître suffit pour la retirer,
// ce qui permet de le faire même juste après la déconnexion.
export async function DELETE(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps illisible' }, { status: 400 })
  }

  if (typeof body?.endpoint !== 'string') {
    return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 })
  }

  const db = createAdminClient()
  await db.from('push_subscriptions').delete().eq('endpoint', body.endpoint)
  return NextResponse.json({ ok: true })
}
