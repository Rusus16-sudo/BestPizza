// Les commandes passées depuis cet appareil, gardées dans le navigateur :
// le client sans compte retrouve leurs liens de suivi, et elles sont
// rattachées à son compte s'il en crée un.

const KEY = 'tchopi_commandes'
const MAX = 20

function read() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {}
}

/** Retient une commande : { token, slug, shortId, claimed }. */
export function rememberOrder({ token, slug, shortId, claimed = false }) {
  if (!token) return
  const others = read().filter((o) => o.token !== token)
  write([{ token, slug, shortId, claimed, at: Date.now() }, ...others])
}

export function rememberedOrders() {
  return read()
}

/** Liens de suivi des commandes pas encore rattachées à un compte. */
export function unclaimedTokens() {
  return read().filter((o) => !o.claimed).map((o) => o.token)
}

export function markClaimed(tokens) {
  const set = new Set(tokens)
  write(read().map((o) => (set.has(o.token) ? { ...o, claimed: true } : o)))
}

/**
 * Le client vient de se connecter ou de créer son compte : ses commandes passées
 * sans compte sur cet appareil le rejoignent.
 */
export async function claimRememberedOrders() {
  const tokens = unclaimedTokens()
  if (tokens.length === 0) return 0
  try {
    const res = await fetch('/api/orders/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens }),
    })
    if (!res.ok) return 0
    markClaimed(tokens)
    return (await res.json()).claimed || 0
  } catch {
    return 0
  }
}
