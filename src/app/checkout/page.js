'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart, formatPrice } from '@/context/CartContext'
import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'
import PageHeader from '@/components/PageHeader'
import styles from './Checkout.module.css'

const PAYMENT_METHODS = [
  { value: 'Paiement à la livraison', title: 'Espèces', hint: 'Vous payez le livreur à la réception' },
  { value: 'MTN / Orange Money', title: 'Mobile Money', hint: 'MTN ou Orange, payé maintenant' },
]

export default function CheckoutPage() {
  const router = useRouter()
  const { cartItems, cartTotal, discountAmount, finalTotal, appliedPromo, clearCart, removeFromCart, isMounted } = useCart()
  const [instructions, setInstructions] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].value)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(null)
  const payOnline = paymentMethod === 'MTN / Orange Money'

  // Pré-remplit le téléphone si l'utilisateur est connecté
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.phone) setPhone(user.user_metadata.phone)
    }
    fetchUser()
  }, [])

  const validate = () => {
    const next = {}
    if (phone.replace(/\D/g, '').length < 8) next.phone = 'Entrez un numéro joignable par le livreur.'
    if (deliveryAddress.trim().length < 3) next.address = 'Indiquez votre quartier et un repère.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleCheckout = async (e) => {
    e.preventDefault()
    if (cartItems.length === 0 || isSubmitting) return
    if (!validate()) return

    setIsSubmitting(true)
    try {
      // Le serveur recalcule les prix et vérifie le code promo
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
            customizations: item.customizations || {},
          })),
          phone: phone.trim(),
          address: deliveryAddress.trim(),
          paymentMethod,
          instructions,
          promoCode: appliedPromo?.code || null,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.status === 401) {
        toast.error('Connectez-vous pour passer commande.')
        router.push('/login')
        return
      }

      if (res.status === 409 && Array.isArray(data.unavailable)) {
        // Retire du panier les plats qui ne sont plus à la carte
        cartItems
          .filter(item => data.unavailable.includes(String(item.productId)))
          .forEach(item => removeFromCart(item.id))
        toast.error('Certains plats ne sont plus à la carte : ils ont été retirés de votre panier. Vérifiez le total puis confirmez.')
        return
      }

      if (!res.ok) {
        toast.error(data.error || "La commande n'a pas pu être envoyée. Réessayez dans un instant.")
        return
      }

      clearCart()

      if (data.paymentUrl) {
        // Paiement en ligne : on confie la suite à Notch Pay
        window.location.assign(data.paymentUrl)
        return
      }

      setOrderSuccess(data.shortId)
      setTimeout(() => router.push('/orders'), 2600)
    } catch (err) {
      toast.error("Pas de connexion. Vérifiez votre réseau et réessayez.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isMounted) {
    return <div className={styles.container}><PageHeader title="Commande" /></div>
  }

  if (cartItems.length === 0 && !orderSuccess) {
    return (
      <div className={styles.container}>
        <PageHeader title="Commande" backHref="/" />
        <div className={styles.empty}>
          <h2>Rien à commander pour l’instant</h2>
          <p>Votre panier est vide. Choisissez vos plats sur la carte.</p>
          <Link href="/menu" className="btn btn-primary">Voir la carte</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <PageHeader title="Commande" backHref="/cart" />

      <form className={styles.layout} onSubmit={handleCheckout} noValidate>
        <div className={styles.main}>
          <section className={styles.section} aria-labelledby="delivery-title">
            <h2 id="delivery-title">Livraison</h2>
            <div className={styles.field}>
              <label htmlFor="phone">Téléphone</label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className={styles.input}
                placeholder="6XX XX XX XX"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setErrors(er => ({ ...er, phone: undefined })) }}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? 'phone-error' : 'phone-hint'}
              />
              {errors.phone
                ? <p id="phone-error" className={styles.error}>{errors.phone}</p>
                : <p id="phone-hint" className={styles.hint}>Le livreur vous appelle à son arrivée.</p>}
            </div>
            <div className={styles.field}>
              <label htmlFor="address">Adresse</label>
              <input
                id="address"
                type="text"
                autoComplete="street-address"
                className={styles.input}
                placeholder="Quartier, repère (ex : Bonamoussadi, face pharmacie)"
                value={deliveryAddress}
                onChange={(e) => { setDeliveryAddress(e.target.value); setErrors(er => ({ ...er, address: undefined })) }}
                aria-invalid={!!errors.address}
                aria-describedby={errors.address ? 'address-error' : undefined}
              />
              {errors.address && <p id="address-error" className={styles.error}>{errors.address}</p>}
            </div>
          </section>

          <section className={styles.section} aria-labelledby="payment-title">
            <h2 id="payment-title">Paiement</h2>
            <div className={styles.payments} role="radiogroup" aria-labelledby="payment-title">
              {PAYMENT_METHODS.map(m => (
                <label key={m.value} className={`${styles.payment} ${paymentMethod === m.value ? styles.paymentActive : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value={m.value}
                    checked={paymentMethod === m.value}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span className={styles.radio} aria-hidden="true" />
                  <span className={styles.paymentText}>
                    <strong>{m.title}</strong>
                    <span>{m.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className={styles.section} aria-labelledby="notes-title">
            <h2 id="notes-title">Instructions <span className={styles.optional}>facultatif</span></h2>
            <label htmlFor="notes" className="visually-hidden">Instructions pour la cuisine ou le livreur</label>
            <textarea
              id="notes"
              className={styles.textarea}
              placeholder="Pour la cuisine ou le livreur : sans oignons, sonner au portail…"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows="3"
            />
          </section>
        </div>

        <aside className={styles.summary} aria-labelledby="summary-title">
          {payOnline && (
            <p className={styles.payNote}>
              Vous serez redirigé vers la page de paiement sécurisée, puis vous validerez sur votre téléphone.
              La cuisine reçoit la commande dès le paiement confirmé.
            </p>
          )}
          <h2 id="summary-title">Récapitulatif</h2>
          <ul className={styles.summaryList}>
            {cartItems.map(item => (
              <li key={item.id}>
                <span><span className={styles.qty}>{item.quantity}×</span> {item.title}</span>
                <span className="price">{formatPrice(item.price)}</span>
              </li>
            ))}
          </ul>
          <dl className={styles.totals}>
            <div className={styles.row}><dt>Sous-total</dt><dd>{formatPrice(cartTotal)}</dd></div>
            {discountAmount > 0 && (
              <div className={`${styles.row} ${styles.discount}`}>
                <dt>Code {appliedPromo.code}</dt><dd>-{formatPrice(discountAmount)}</dd>
              </div>
            )}
            <div className={`${styles.row} ${styles.total}`}><dt>Total</dt><dd>{formatPrice(finalTotal)}</dd></div>
          </dl>

          <div className={styles.submitBar}>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? (
                <span>{payOnline ? 'Ouverture du paiement…' : 'Envoi en cours…'}</span>
              ) : (
                <>
                  <span>{payOnline ? 'Payer maintenant' : 'Confirmer la commande'}</span>
                  <span className="price">{formatPrice(finalTotal)}</span>
                </>
              )}
            </button>
          </div>
        </aside>
      </form>

      {orderSuccess && (
        <div className={styles.successOverlay} role="alertdialog" aria-labelledby="success-title">
          <div className={styles.successCard}>
            <div className={styles.successIcon}>
              <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 id="success-title">Commande envoyée</h2>
            <p>La cuisine a reçu votre commande <strong>{orderSuccess}</strong>. Vous pouvez la suivre dans Commandes.</p>
            <Link href="/orders" className="btn btn-primary">Suivre ma commande</Link>
          </div>
        </div>
      )}
    </div>
  )
}
