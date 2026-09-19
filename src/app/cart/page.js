'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCart, formatPrice } from '@/context/CartContext'
import { createClient } from '@/utils/supabase/client'
import PageHeader from '@/components/PageHeader'
import styles from './Cart.module.css'

function describeOptions(item) {
  const parts = []
  if (item.size && item.size !== 'Standard') parts.push(item.size)
  const extras = Object.entries(item.customizations || {}).filter(([, on]) => on).length
  if (extras > 0) parts.push(`${extras} supplément${extras > 1 ? 's' : ''}`)
  return parts.join(', ')
}

export default function CartPage() {
  const {
    cartItems, updateQuantity, removeFromCart, totalItems, cartTotal,
    appliedPromo, setAppliedPromo, discountAmount, finalTotal, isMounted
  } = useCart()

  const [promoCode, setPromoCode] = useState('')
  const [promoError, setPromoError] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)

  const handleApplyPromo = async (e) => {
    e.preventDefault()
    const code = promoCode.trim()
    if (!code) return
    setPromoLoading(true)
    setPromoError('')

    const supabase = createClient()
    const { data: offers, error } = await supabase.from('offers').select('*').eq('code', code)
    setPromoLoading(false)

    if (error || !offers || offers.length === 0) {
      setPromoError(`Le code « ${code} » n'existe pas. Vérifiez l'orthographe.`)
      return
    }

    const offer = offers[0]
    if (offer.valid_until) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (today > new Date(offer.valid_until)) {
        setPromoError('Ce code a expiré.')
        return
      }
    }

    setAppliedPromo(offer)
    setPromoCode('')
  }

  if (!isMounted) {
    return <div className={styles.container}><PageHeader title="Panier" /></div>
  }

  if (cartItems.length === 0) {
    return (
      <div className={styles.container}>
        <PageHeader title="Panier" />
        <div className={styles.empty}>
          <div className={styles.emptyArt} aria-hidden="true">
            <img src="/margherita.png" alt="" />
          </div>
          <h2>Votre panier est vide</h2>
          <p>Ajoutez une pizza depuis la carte, elle apparaîtra ici.</p>
          <Link href="/menu" className="btn btn-primary">Voir la carte</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <PageHeader title="Panier" subtitle={`${totalItems} article${totalItems > 1 ? 's' : ''}`} />

      <div className={styles.layout}>
        <ul className={styles.list}>
          {cartItems.map(item => (
            <li key={item.id} className={styles.item}>
              <img src={item.image} alt="" className={styles.itemImage} />
              <div className={styles.itemBody}>
                <div className={styles.itemTop}>
                  <h3 className={styles.itemTitle}>{item.title}</h3>
                  <button className={styles.removeBtn} onClick={() => removeFromCart(item.id)} aria-label={`Retirer ${item.title} du panier`}>
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
                {describeOptions(item) && <p className={styles.itemOptions}>{describeOptions(item)}</p>}
                <div className={styles.itemBottom}>
                  <div className={styles.stepper} role="group" aria-label={`Quantité de ${item.title}`}>
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={item.quantity === 1 ? 'Retirer du panier' : 'Retirer un'}>
                      {item.quantity === 1 ? (
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      )}
                    </button>
                    <span aria-live="polite">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Ajouter un">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                  </div>
                  <span className={styles.itemPrice}>{formatPrice(item.price)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className={styles.summary}>
          {appliedPromo ? (
            <div className={styles.promoApplied}>
              <span>
                Code <strong>{appliedPromo.code}</strong> appliqué
              </span>
              <button onClick={() => setAppliedPromo(null)} className={styles.linkBtn}>Retirer</button>
            </div>
          ) : (
            <form className={styles.promoForm} onSubmit={handleApplyPromo}>
              <label htmlFor="promo" className="visually-hidden">Code promo</label>
              <input
                id="promo"
                type="text"
                placeholder="Code promo"
                className={styles.promoInput}
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value); setPromoError('') }}
                autoCapitalize="characters"
                aria-invalid={!!promoError}
                aria-describedby={promoError ? 'promo-error' : undefined}
              />
              <button type="submit" className={styles.promoBtn} disabled={promoLoading || !promoCode.trim()}>
                {promoLoading ? 'Vérification…' : 'Appliquer'}
              </button>
            </form>
          )}
          {promoError && <p id="promo-error" className={styles.promoError} role="alert">{promoError}</p>}
          {appliedPromo && discountAmount === 0 && (
            <p className={styles.promoNote}>Ce code ne s’applique à aucun article de votre panier.</p>
          )}

          <dl className={styles.totals}>
            <div className={styles.row}>
              <dt>Sous-total</dt>
              <dd>{formatPrice(cartTotal)}</dd>
            </div>
            {discountAmount > 0 && (
              <div className={`${styles.row} ${styles.discount}`}>
                <dt>Réduction (-{appliedPromo.discount_percentage}%)</dt>
                <dd>-{formatPrice(discountAmount)}</dd>
              </div>
            )}
            <div className={`${styles.row} ${styles.total}`}>
              <dt>Total</dt>
              <dd>{formatPrice(finalTotal)}</dd>
            </div>
          </dl>

          <Link href="/checkout" className={styles.checkoutBtn}>
            <span>Commander</span>
            <span className="price">{formatPrice(finalTotal)}</span>
          </Link>
        </aside>
      </div>
    </div>
  )
}
