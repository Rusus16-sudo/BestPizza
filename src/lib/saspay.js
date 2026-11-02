// SasPay : le compte de Tchopi, pour encaisser les abonnements des restaurants.
// Page de paiement hébergée (MTN MoMo, Orange Money), puis vérification côté serveur.
// Documentation : https://docs.saspay.me/api-reference/payments/checkout-create

const API = 'https://api.saspay.me/api/v1'

export function isSasPayConfigured() {
  return Boolean(process.env.SASPAY_SECRET_KEY)
}

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.SASPAY_SECRET_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || data.detail || `SasPay a répondu ${res.status}`)
  return data
}

/**
 * Ouvre une page de paiement. Renvoie { id, checkoutUrl }.
 * Pas de clé d'idempotence sur cet appel : chaque appel crée une nouvelle session.
 */
export async function createCheckoutSession({ amount, description, customerEmail, customerName, returnUrl, metadata }) {
  const data = await call('/checkout-sessions/', {
    method: 'POST',
    body: {
      amount: Number(amount).toFixed(2),
      currency: 'XAF',
      country: 'CM',
      description,
      customer_email: customerEmail,
      customer_name: customerName,
      return_url: returnUrl,
      metadata,
    },
  })
  if (!data.id || !data.checkout_url) throw new Error('SasPay n’a pas renvoyé de page de paiement')
  return { id: data.id, checkoutUrl: data.checkout_url }
}

/**
 * Où en est une page de paiement : { status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED', transactionId }.
 * SasPay revérifie auprès de l'opérateur avant de répondre.
 */
export async function checkoutStatus(sessionId) {
  const data = await call(`/checkout-sessions/${encodeURIComponent(sessionId)}/status/`)
  return { status: data.status, transactionId: data.transaction_id || null }
}
