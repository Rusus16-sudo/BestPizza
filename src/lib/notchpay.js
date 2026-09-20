import crypto from 'crypto'

// Client Notch Pay, côté serveur uniquement.
// Les clés ne sont jamais exposées au navigateur.
const API = 'https://api.notchpay.co'

export function isNotchPayConfigured() {
  return Boolean(process.env.NOTCHPAY_PUBLIC_KEY)
}

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: process.env.NOTCHPAY_PUBLIC_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }

  if (!res.ok) {
    const message = data?.message || data?.error || `Notch Pay a répondu ${res.status}`
    const error = new Error(message)
    error.status = res.status
    error.data = data
    throw error
  }
  return data
}

/**
 * Crée un paiement et renvoie l'adresse de la page de paiement Notch Pay.
 * `reference` est notre propre identifiant : il nous revient dans le webhook.
 */
export async function initializePayment({ amount, reference, description, callback, customer }) {
  const data = await call('/payments', {
    method: 'POST',
    body: {
      amount,
      currency: 'XAF',
      reference,
      description,
      callback,
      customer: {
        name: customer?.name || 'Client',
        email: customer?.email,
        phone: customer?.phone,
      },
    },
  })

  return {
    authorizationUrl: data.authorization_url || data.transaction?.authorization_url,
    reference: data.transaction?.reference || data.reference || reference,
    raw: data,
  }
}

/** État d'un paiement auprès de Notch Pay. */
export async function fetchPayment(reference) {
  const data = await call(`/payments/${encodeURIComponent(reference)}`)
  return data.transaction || data.payment || data
}

/**
 * Vérifie la signature d'un webhook : HMAC SHA-256 du corps brut,
 * avec le « webhook hash » du tableau de bord Notch Pay.
 */
export function verifyWebhookSignature(rawBody, signature) {
  const hash = process.env.NOTCHPAY_WEBHOOK_HASH
  if (!hash || !signature) return false

  const expected = crypto.createHmac('sha256', hash).update(rawBody, 'utf8').digest('hex')
  const received = Buffer.from(String(signature), 'utf8')
  const computed = Buffer.from(expected, 'utf8')
  if (received.length !== computed.length) return false
  return crypto.timingSafeEqual(received, computed)
}

// Correspondance entre les statuts Notch Pay et les nôtres
export function mapPaymentStatus(status) {
  switch (String(status || '').toLowerCase()) {
    case 'complete':
    case 'completed':
    case 'success':
      return 'paye'
    case 'failed':
      return 'echec'
    case 'canceled':
    case 'cancelled':
    case 'expired':
      return 'annule'
    default:
      return 'en_attente'
  }
}
