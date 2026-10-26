/**
 * Vérifie qu'aucun établissement ne voit ni ne modifie les données d'un autre.
 *
 *   node scripts/test-isolation.js           (crée, teste, puis efface tout)
 *   node scripts/test-isolation.js --garder  (laisse les données de test pour enquêter)
 *
 * Crée deux faux restaurants (« Test A » et « Test B ») avec leur équipe et un client,
 * puis se connecte avec chacun de ces comptes, comme le ferait l'application,
 * pour contrôler ce que les règles d'accès (RLS) laissent passer.
 *
 * Aucun email n'est envoyé : les comptes sont créés par l'API d'administration,
 * déjà confirmés, avec des adresses @example.com (domaine réservé aux tests).
 * Ni Best Pizza ni ses comptes ne sont modifiés.
 */
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local', quiet: true })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const KEEP = process.argv.includes('--garder')

const EMAIL_PREFIX = 'tchopi-test-'
const ORG_SLUGS = ['tchopi-test-a', 'tchopi-test-b']
const PASSWORD = `Test-${crypto.randomBytes(12).toString('hex')}`

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } })

let failures = 0
function check(label, ok, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? '✅' : '❌'} ${label}${!ok && detail ? `  →  ${detail}` : ''}`)
}

function must({ data, error }, what) {
  if (error) throw new Error(`${what} : ${error.message}`)
  return data
}

// ---------------------------------------------------------------------
// Nettoyage : tout ce qui porte les marques des tests
// ---------------------------------------------------------------------
async function cleanup() {
  const { data: orgs } = await admin.from('organizations').select('id').in('slug', ORG_SLUGS)
  const orgIds = (orgs || []).map((o) => o.id)
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const users = (list?.users || []).filter((u) => u.email?.startsWith(EMAIL_PREFIX))
  const userIds = users.map((u) => u.id)

  if (orgIds.length) {
    const { data: orders } = await admin.from('orders').select('id').in('organization_id', orgIds)
    const orderIds = (orders || []).map((o) => o.id)
    if (orderIds.length) await admin.from('order_items').delete().in('order_id', orderIds)
    await admin.from('orders').delete().in('organization_id', orgIds)
    await admin.from('reviews').delete().in('organization_id', orgIds)
  }
  if (userIds.length) {
    await admin.from('orders').delete().in('user_id', userIds)
    await admin.from('reviews').delete().in('user_id', userIds)
    await admin.from('profiles').delete().in('id', userIds)
    for (const id of userIds) await admin.auth.admin.deleteUser(id)
  }
  if (orgIds.length) await admin.from('organizations').delete().in('id', orgIds)
}

// ---------------------------------------------------------------------
// Mise en place
// ---------------------------------------------------------------------
async function createUser(name) {
  const email = `${EMAIL_PREFIX}${name}@example.com`
  const data = must(await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true }), `compte ${email}`)
  return { id: data.user.id, email }
}

async function signIn(user) {
  const client = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } })
  must(await client.auth.signInWithPassword({ email: user.email, password: PASSWORD }), `connexion ${user.email}`)
  return client
}

async function setupRestaurant(letter) {
  const org = must(await admin.from('organizations')
    .insert({ slug: `tchopi-test-${letter}`, name: `Test ${letter.toUpperCase()}`, plan: 'pro', plan_status: 'trial' })
    .select().single(), `enseigne ${letter}`)
  const location = must(await admin.from('locations')
    .insert({ organization_id: org.id, slug: 'centre', name: `Test ${letter.toUpperCase()} Centre` })
    .select().single(), `point de vente ${letter}`)

  const team = {}
  for (const role of ['proprietaire', 'cuisinier', 'livreur']) {
    team[role] = await createUser(`${letter}-${role}`)
    must(await admin.from('memberships').insert({ user_id: team[role].id, organization_id: org.id, role }), `membre ${letter} ${role}`)
  }

  const product = must(await admin.from('products')
    .insert({ organization_id: org.id, title: `Plat test ${letter}`, price: 1000, category: 'Burger' })
    .select().single(), `produit ${letter}`)

  return { org, location, team, product }
}

async function createOrder(restaurant, client, status) {
  return must(await admin.from('orders').insert({
    organization_id: restaurant.org.id,
    location_id: restaurant.location.id,
    user_id: client.id,
    short_id: `TEST-${restaurant.org.slug.slice(-1).toUpperCase()}-${crypto.randomBytes(3).toString('hex')}`,
    status,
    payment_method: 'especes',
    payment_status: 'a_la_livraison',
    total_price: 1000,
    total_amount: 1000,
    customer_name: 'Client test',
    delivery_address: 'Quartier: Test | Tél: 600000000 | Paiement: Paiement à la livraison',
  }).select().single(), `commande ${restaurant.org.slug}`)
}

const ids = (rows) => new Set((rows || []).map((r) => r.id))

// ---------------------------------------------------------------------
// Les contrôles
// ---------------------------------------------------------------------
async function run() {
  if (!URL || !ANON || !SERVICE) throw new Error('Variables Supabase manquantes dans .env.local')

  console.log('Nettoyage des restes d’un test précédent…')
  await cleanup()

  console.log('Mise en place de Test A, Test B et d’un client…\n')
  const A = await setupRestaurant('a')
  const B = await setupRestaurant('b')
  const customer = await createUser('client')

  // Les commandes de test ne réveillent personne : seule l'équipe de test est prévenue,
  // et elle n'a aucun appareil abonné aux notifications.
  const orderA = await createOrder(A, customer, 'prete')
  const orderB = await createOrder(B, customer, 'en_preparation')

  const bp = must(await admin.from('organizations').select('id').eq('slug', 'best-pizza').maybeSingle(), 'Best Pizza')
  const bpOrders = must(await admin.from('orders').select('id').eq('organization_id', bp?.id), 'commandes Best Pizza')
  const bpProduct = must(await admin.from('products').select('id').eq('organization_id', bp?.id).limit(1).maybeSingle(), 'produit Best Pizza')
  const bpIds = ids(bpOrders)

  const as = {
    ownerA: await signIn(A.team.proprietaire),
    cookA: await signIn(A.team.cuisinier),
    driverA: await signIn(A.team.livreur),
    ownerB: await signIn(B.team.proprietaire),
    cookB: await signIn(B.team.cuisinier),
    driverB: await signIn(B.team.livreur),
    customer: await signIn(customer),
  }
  const anonymous = createClient(URL, ANON, { auth: { persistSession: false } })

  const seenOrders = async (client) => ids(must(await client.from('orders').select('id'), 'lecture commandes'))
  const noBestPizza = (seen) => ![...seen].some((id) => bpIds.has(id))

  console.log('— Commandes')
  {
    const seen = await seenOrders(as.cookA)
    check('La cuisine A voit la commande de A', seen.has(orderA.id))
    check('La cuisine A ne voit pas la commande de B', !seen.has(orderB.id))
    check('La cuisine A ne voit aucune commande de Best Pizza', noBestPizza(seen))
  }
  {
    const seen = await seenOrders(as.cookB)
    check('La cuisine B voit la commande de B', seen.has(orderB.id))
    check('La cuisine B ne voit pas la commande de A', !seen.has(orderA.id))
  }
  {
    const seen = await seenOrders(as.driverA)
    check('Le livreur A voit la commande prête de A', seen.has(orderA.id))
    check('Le livreur A ne voit aucune commande de Best Pizza', noBestPizza(seen))
  }
  {
    const seen = await seenOrders(as.driverB)
    check('Le livreur B ne voit pas la commande prête de A', !seen.has(orderA.id))
  }
  {
    const seen = await seenOrders(as.ownerA)
    check('Le propriétaire A voit la commande de A', seen.has(orderA.id))
    check('Le propriétaire A ne voit ni B ni Best Pizza', !seen.has(orderB.id) && noBestPizza(seen))
  }
  {
    const seen = await seenOrders(as.customer)
    check('Le client voit ses deux commandes (chez A et chez B)', seen.has(orderA.id) && seen.has(orderB.id))
    check('Le client ne voit aucune commande de Best Pizza', noBestPizza(seen))
  }
  {
    const seen = await seenOrders(anonymous)
    check('Un visiteur non connecté ne voit aucune commande', seen.size === 0)
  }

  console.log('\n— Faire avancer une commande')
  {
    const r = must(await as.cookB.from('orders').update({ status: 'en_route' }).eq('id', orderA.id).select('id'), 'cuisine B → A')
    check('La cuisine B ne peut pas modifier une commande de A', r.length === 0)
  }
  {
    const r = must(await as.driverB.from('orders').update({ status: 'en_route', driver_id: B.team.livreur.id }).eq('id', orderA.id).select('id'), 'livreur B → A')
    check('Le livreur B ne peut pas prendre une commande de A', r.length === 0)
  }
  {
    const r = must(await as.driverA.from('orders').update({ status: 'en_route', driver_id: A.team.livreur.id }).eq('id', orderA.id).select('id'), 'livreur A → A')
    check('Le livreur A peut prendre la commande prête de A', r.length === 1)
  }
  if (bpOrders.length) {
    const r = must(await as.ownerA.from('orders').update({ special_instructions: 'piraté' }).eq('id', bpOrders[0].id).select('id'), 'A → Best Pizza')
    check('Le propriétaire A ne peut pas modifier une commande de Best Pizza', r.length === 0)
  }

  console.log('\n— Carte')
  {
    const r = must(await as.ownerA.from('products').update({ price: 1100 }).eq('id', A.product.id).select('id'), 'A → produit A')
    check('Le propriétaire A peut modifier sa carte', r.length === 1)
  }
  {
    const r = must(await as.ownerA.from('products').update({ price: 1 }).eq('id', B.product.id).select('id'), 'A → produit B')
    check('Le propriétaire A ne peut pas modifier la carte de B', r.length === 0)
  }
  if (bpProduct) {
    const r = must(await as.ownerA.from('products').update({ price: 1 }).eq('id', bpProduct.id).select('id'), 'A → produit Best Pizza')
    check('Le propriétaire A ne peut pas modifier la carte de Best Pizza', r.length === 0)
  }
  {
    const r = must(await as.cookA.from('products').update({ price: 1 }).eq('id', A.product.id).select('id'), 'cuisine A → produit A')
    check('La cuisine A ne peut pas modifier la carte', r.length === 0)
  }
  {
    const { error } = await as.ownerA.from('products').insert({ organization_id: B.org.id, title: 'Intrus', price: 1, category: 'Burger' })
    check('Le propriétaire A ne peut pas ajouter un plat à la carte de B', Boolean(error))
  }
  {
    const { error } = await as.ownerA.from('product_locations').insert({ product_id: B.product.id, location_id: B.location.id, is_available: false })
    check('Le propriétaire A ne peut pas mettre un plat de B en rupture', Boolean(error))
  }
  {
    const { error } = await as.ownerA.from('product_locations').insert({ product_id: A.product.id, location_id: A.location.id, is_available: false })
    check('Le propriétaire A peut mettre son plat en rupture dans son point de vente', !error, error?.message)
  }

  console.log('\n— Avis')
  {
    const { data, error } = await as.customer.from('reviews')
      .insert({ product_id: A.product.id, user_id: customer.id, rating: 5, comment: 'Test', organization_id: B.org.id })
      .select('organization_id').single()
    check('Un avis sur un plat de A appartient à A, même si le navigateur dit B', !error && data?.organization_id === A.org.id, error?.message || data?.organization_id)
  }

  console.log('\n— Enseignes, équipes, profils')
  {
    const orgs = ids(must(await as.ownerA.from('organizations').select('id'), 'enseignes'))
    check('Le propriétaire A ne voit que son enseigne', orgs.size === 1 && orgs.has(A.org.id))
  }
  {
    const orgs = must(await as.customer.from('organizations').select('id'), 'enseignes client')
    check('Le client ne voit pas les détails des enseignes (offre, abonnement)', orgs.length === 0)
  }
  {
    const members = must(await as.ownerA.from('memberships').select('organization_id'), 'membres')
    check('Le propriétaire A ne voit que l’équipe de A', members.length === 3 && members.every((m) => m.organization_id === A.org.id))
  }
  {
    const members = must(await as.cookA.from('memberships').select('user_id'), 'membres cuisine')
    check('La cuisine A ne voit que sa propre appartenance', members.length === 1 && members[0].user_id === A.team.cuisinier.id)
  }
  {
    const profiles = ids(must(await as.ownerA.from('profiles').select('id'), 'profils'))
    const teamA = Object.values(A.team).map((u) => u.id)
    const teamB = Object.values(B.team).map((u) => u.id)
    check('Le propriétaire A voit les profils de son équipe', teamA.every((id) => profiles.has(id)))
    check('Le propriétaire A ne voit ni l’équipe de B ni le client', !teamB.some((id) => profiles.has(id)) && !profiles.has(customer.id))
  }
  {
    const profiles = must(await as.customer.from('profiles').select('id'), 'profils client')
    check('Le client ne voit que son propre profil', profiles.length === 1 && profiles[0].id === customer.id)
  }
  {
    const { error } = await as.ownerA.from('memberships').insert({ user_id: customer.id, organization_id: B.org.id, role: 'proprietaire' })
    check('Personne ne peut s’ajouter lui-même ou un autre dans une équipe depuis le navigateur', Boolean(error))
  }
}

run()
  .catch((err) => {
    failures++
    console.error(`\n❌ Le test s’est arrêté : ${err.message}`)
  })
  .finally(async () => {
    if (KEEP) console.log('\nDonnées de test gardées (--garder). Relancez sans --garder pour les effacer.')
    else {
      await cleanup()
      console.log('\nDonnées de test effacées.')
    }
    console.log(failures === 0 ? '\nTout est cloisonné ✅' : `\n${failures} contrôle(s) en échec ❌`)
    process.exit(failures === 0 ? 0 : 1)
  })
