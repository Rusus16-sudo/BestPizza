import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

// Enregistre l'appareil pour les notifications push :
// - d'un compte connecté (si l'appareil était lié à un autre compte, il passe à celui-ci) ;
// - et/ou d'une commande, depuis son lien de suivi (`trackingToken`), même sans compte.
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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

  // Connaître le lien secret de la commande suffit pour suivre ses étapes
  let orderId = null
  if (body.trackingToken) {
    const { data: order } = await db
      .from('orders')
      .select('id')
      .eq('tracking_token', String(body.trackingToken))
      .maybeSingle()
    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    orderId = order.id
  }

  if (!user && !orderId) {
    return NextResponse.json({ error: 'Connexion requise' }, { status: 401 })
  }

  const { error } = await db
    .from('push_subscriptions')
    .upsert({
      endpoint, p256dh, auth,
      ...(user ? { user_id: user.id } : {}),
      ...(orderId ? { order_id: orderId } : {}),
    }, { onConflict: 'endpoint' })

  if (error) {
    console.error('Enregistrement abonnement push:', error.message)
    return NextResponse.json({ error: "L'appareil n'a pas pu être enregistré" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// Détache un appareil. L'adresse d'abonnement est secrète : la connaître suffit,
// ce qui permet de le faire sans être connecté.
// - scope « account » (déconnexion, ou appareil ouvert sans personne de connecté) :
//   il ne reçoit plus rien pour un compte, ni personnel ni client. Il garde seulement
//   les commandes passées sans compte depuis cet appareil, que le client suit lui-même.
// - scope « all » (notifications désactivées) : il ne reçoit plus rien du tout.
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
  if (body.scope === 'all') {
    await db.from('push_subscriptions').delete().eq('endpoint', body.endpoint)
  } else {
    await db.from('push_subscriptions').delete().eq('endpoint', body.endpoint).is('order_id', null)
    await db.from('push_subscriptions').update({ user_id: null }).eq('endpoint', body.endpoint)
  }
  return NextResponse.json({ ok: true })
}
