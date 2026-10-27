import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { sendPushToUser } from '@/lib/push'

// Notification de test, envoyée aux appareils du compte connecté :
// pour vérifier d'un geste que tout marche sur un téléphone.
export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Connexion requise' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  // Uniquement une page du site
  const url = typeof body.url === 'string' && body.url.startsWith('/') && !body.url.startsWith('//') ? body.url : '/'

  const { sent } = await sendPushToUser(user.id, {
    title: 'Tchopi',
    body: '🔔 Les notifications marchent sur cet appareil.',
    url,
    tag: 'test',
  })

  if (sent === 0) {
    return NextResponse.json({ error: 'Aucun appareil enregistré pour ce compte' }, { status: 404 })
  }
  return NextResponse.json({ sent })
}
