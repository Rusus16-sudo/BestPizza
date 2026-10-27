import { NextResponse } from 'next/server'
import { createAdminClient, requireUser } from '@/utils/supabase/admin'
import { resolveStorefront } from '@/lib/storefront'
import { deliveryQuote } from '@/lib/delivery'
import { computeUnitPrice, isPizzaCategory, SIZES, promoApplies, isOfferValid } from '@/lib/pricing'
import { initializePayment, isNotchPayConfigured } from '@/lib/notchpay'
import { headers } from 'next/headers'

const MOBILE_MONEY = 'MTN / Orange Money'

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  const h = await headers()
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000'
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PAYMENTS = ['Paiement à la livraison', 'MTN / Orange Money']

// Création d'une commande : les prix sont recalculés ici depuis la base,
// jamais repris du navigateur. Un compte n'est pas nécessaire : le client sans compte
// donne son nom, et suit sa commande grâce au lien secret renvoyé.
export async function POST(request) {
  const auth = await requireUser()
  // Pas connecté : commande sans compte. Un compte suspendu, lui, est refusé.
  if (auth.response && auth.response.status !== 401) return auth.response
  const user = auth.response ? null : auth.user
  const profile = auth.response ? null : auth.profile

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }

  const { items, phone, address, paymentMethod, instructions, promoCode, name, zoneId } = body || {}
  const customerName = String(name || '').replace(/\|/g, ' ').trim().slice(0, 60)

  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return NextResponse.json({ error: 'Votre panier est vide.' }, { status: 400 })
  }
  if (!user && customerName.length < 2) {
    return NextResponse.json({ error: 'Indiquez votre nom, pour que le livreur vous trouve.' }, { status: 400 })
  }
  if (String(phone || '').replace(/\D/g, '').length < 8) {
    return NextResponse.json({ error: 'Numéro de téléphone invalide.' }, { status: 400 })
  }
  if (String(address || '').trim().length < 3) {
    return NextResponse.json({ error: 'Adresse de livraison manquante.' }, { status: 400 })
  }
  if (!PAYMENTS.includes(paymentMethod)) {
    return NextResponse.json({ error: 'Moyen de paiement invalide.' }, { status: 400 })
  }

  const payOnline = paymentMethod === MOBILE_MONEY
  if (payOnline && !isNotchPayConfigured()) {
    return NextResponse.json({
      error: "Le paiement Mobile Money n'est pas disponible pour le moment. Choisissez le paiement à la livraison.",
    }, { status: 503 })
  }

  const db = createAdminClient()

  // 0. Le restaurant et le point de vente qui reçoivent la commande
  const storefront = await resolveStorefront(db, body.organization, body.location)
  if (storefront.error) {
    return NextResponse.json({ error: storefront.error }, { status: storefront.status })
  }
  const { organization, location, zones } = storefront

  // 1. Plats demandés, tels qu'ils sont en base : uniquement ceux de CE restaurant
  const ids = [...new Set(items.map(i => String(i.productId)))]
  const validIds = ids.filter(id => UUID.test(id))
  const [{ data: products, error: productsError }, { data: localRules }] = validIds.length
    ? await Promise.all([
      db.from('products').select('id, title, price, category, customizations, is_available')
        .eq('organization_id', organization.id).in('id', validIds),
      db.from('product_locations').select('product_id, is_available, price_override')
        .eq('location_id', location.id).in('product_id', validIds),
    ])
    : [{ data: [], error: null }, { data: [] }]

  if (productsError) {
    console.error('Lecture des produits:', productsError.message)
    return NextResponse.json({ error: 'La carte est momentanément indisponible. Réessayez dans un instant.' }, { status: 503 })
  }

  // Rupture ou prix propre à ce point de vente
  const localRule = new Map((localRules || []).map(r => [String(r.product_id), r]))
  const byId = new Map(products.map(p => {
    const rule = localRule.get(String(p.id))
    return [String(p.id), {
      ...p,
      is_available: p.is_available !== false && rule?.is_available !== false,
      price: rule?.price_override ?? p.price,
    }]
  }))
  const unavailable = ids.filter(id => !byId.get(id) || byId.get(id).is_available === false)
  if (unavailable.length > 0) {
    return NextResponse.json({
      error: 'Certains plats de votre panier ne sont plus à la carte.',
      unavailable
    }, { status: 409 })
  }

  // 2. Code promo (vérifié ici aussi)
  let offer = null
  if (promoCode) {
    const { data } = await db.from('offers').select('*')
      .eq('organization_id', organization.id).eq('code', String(promoCode).trim()).maybeSingle()
    if (data && isOfferValid(data)) offer = data
  }

  // 3. Calcul des lignes et du total
  const lines = items.map(item => {
    const product = byId.get(String(item.productId))
    const quantity = Math.min(Math.max(parseInt(item.quantity, 10) || 1, 1), 50)
    const size = isPizzaCategory(product.category) && SIZES.some(s => s.id === item.size) ? item.size : (isPizzaCategory(product.category) ? 'Moyenne' : 'Standard')
    const allowed = new Set((product.customizations || []).map(c => c.id))
    const customizations = Object.fromEntries(
      Object.entries(item.customizations || {}).filter(([k, v]) => allowed.has(k) && v === true)
    )
    const unitPrice = computeUnitPrice(product, size, customizations)
    return { product, quantity, size, customizations, unitPrice, price: unitPrice * quantity }
  })

  const subtotal = lines.reduce((s, l) => s + l.price, 0)
  const discount = offer
    ? Math.round(lines.reduce((s, l) => s + (promoApplies(offer, l.product) ? l.price * offer.discount_percentage / 100 : 0), 0))
    : 0
  const itemsTotal = Math.max(0, subtotal - discount)

  // 4. Livraison : forfait, ou tarif du quartier choisi ; commande minimum et livraison gratuite
  const delivery = deliveryQuote({ location, zones, plan: organization.plan, zoneId, subtotal: itemsTotal })
  if (delivery.error) {
    return NextResponse.json({ error: delivery.error }, { status: 400 })
  }
  const total = itemsTotal + delivery.fee

  // 5. Enregistrement
  const shortId = `CMD-${Math.floor(10000 + Math.random() * 90000)}`
  const cleanAddress = String(address).replace(/\|/g, ' ').trim().slice(0, 200)
  const cleanPhone = String(phone).replace(/\|/g, ' ').trim().slice(0, 30)

  const { data: order, error: orderError } = await db
    .from('orders')
    .insert({
      organization_id: organization.id,
      location_id: location.id,
      short_id: shortId,
      user_id: user?.id ?? null,
      status: payOnline ? 'paiement' : 'en_attente',
      payment_method: payOnline ? 'mobile_money' : 'especes',
      payment_status: payOnline ? 'en_attente' : 'a_la_livraison',
      total_price: total,
      total_amount: total,
      delivery_fee: delivery.fee,
      delivery_zone: delivery.zone?.name || null,
      promo_code: offer?.code || null,
      special_instructions: String(instructions || '').slice(0, 500) || null,
      // Le quartier choisi d'abord : c'est lui que voit le livreur
      delivery_address: `Quartier: ${delivery.zone ? `${delivery.zone.name} – ` : ''}${cleanAddress} | Tél: ${cleanPhone} | Paiement: ${paymentMethod}`,
      customer_name: customerName || profile?.email?.split('@')[0] || 'Client',
    })
    .select('id, short_id, tracking_token')
    .single()

  if (orderError) {
    console.error('Création de la commande:', orderError.message)
    return NextResponse.json({ error: "La commande n'a pas pu être enregistrée. Réessayez dans un instant." }, { status: 500 })
  }

  const { error: itemsError } = await db.from('order_items').insert(lines.map(l => ({
    order_id: order.id,
    product_id: l.product.id,
    product_name: l.product.title,
    quantity: l.quantity,
    size: l.size,
    unit_price: l.unitPrice,
    price: l.price,
    customizations: l.customizations,
  })))

  if (itemsError) {
    console.error('Articles de la commande:', itemsError.message)
    await db.from('orders').delete().eq('id', order.id)
    return NextResponse.json({ error: "La commande n'a pas pu être enregistrée. Réessayez dans un instant." }, { status: 500 })
  }

  if (!payOnline) {
    return NextResponse.json({ shortId: order.short_id, total, discount, deliveryFee: delivery.fee, trackingToken: order.tracking_token })
  }

  // Paiement en ligne : on ouvre le paiement chez Notch Pay et on renvoie
  // l'adresse de sa page. La commande n'ira en cuisine qu'une fois payée.
  try {
    const origin = await siteOrigin()
    const payment = await initializePayment({
      amount: total,
      reference: order.id,
      description: `Commande ${order.short_id} – ${organization.name}`,
      // Le lien de suivi revient avec le client : sans compte, c'est sa preuve
      callback: `${origin}/paiement/retour?suivi=${order.tracking_token}`,
      customer: {
        name: customerName || profile?.email?.split('@')[0] || 'Client',
        email: profile?.email || user?.email || undefined,
        phone: cleanPhone,
      },
    })

    if (!payment.authorizationUrl) {
      throw new Error('Notch Pay n’a pas renvoyé de page de paiement')
    }

    await db.from('orders').update({ payment_reference: payment.reference }).eq('id', order.id)

    return NextResponse.json({
      shortId: order.short_id,
      total,
      discount,
      trackingToken: order.tracking_token,
      paymentUrl: payment.authorizationUrl,
      paymentReference: payment.reference,
    })
  } catch (error) {
    console.error('Ouverture du paiement Notch Pay:', error.message)
    // Sans paiement ouvert, la commande resterait bloquée : on la retire
    await db.from('order_items').delete().eq('order_id', order.id)
    await db.from('orders').delete().eq('id', order.id)
    return NextResponse.json({
      error: "Le paiement n'a pas pu être lancé. Réessayez, ou choisissez le paiement à la livraison.",
    }, { status: 502 })
  }
}
