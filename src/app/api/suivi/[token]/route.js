import { NextResponse } from 'next/server'
import { getTrackedOrder } from '@/lib/tracked-orders'

// État d'une commande depuis son lien de suivi : la page de suivi le relit
// régulièrement, y compris pour un client sans compte.
export async function GET(request, { params }) {
  const { token } = await params
  const order = await getTrackedOrder(token)
  if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  return NextResponse.json(order, { headers: { 'Cache-Control': 'no-store' } })
}
