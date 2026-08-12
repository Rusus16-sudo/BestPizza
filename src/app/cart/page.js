'use client'

import { useCart } from '@/context/CartContext'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import styles from './Cart.module.css'

export default function CartPage() {
  const { cartItems, removeFromCart, totalItems, cartTotal } = useCart()
  const router = useRouter()
  
  const [promoCode, setPromoCode] = useState('')
  const [promoError, setPromoError] = useState('')
  const [appliedPromo, setAppliedPromo] = useState(null)
  const [discountLoading, setDiscountLoading] = useState(false)

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return
    setDiscountLoading(true)
    setPromoError('')
    
    const supabase = createClient()
    const { data: offers, error } = await supabase
      .from('offers')
      .select('*')
      .eq('code', promoCode.trim())
    
    setDiscountLoading(false)

    if (error || !offers || offers.length === 0) {
      setPromoError('Code promo invalide.')
      return
    }

    const offer = offers[0]
    
    if (offer.valid_until) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const validUntil = new Date(offer.valid_until)
      if (today > validUntil) {
        setPromoError('Ce code promo a expiré.')
        return
      }
    }

    setAppliedPromo(offer)
  }

  const getDiscountedTotal = () => {
    if (!appliedPromo) return cartTotal

    let discountAmount = 0

    cartItems.forEach(item => {
      let appliesToItem = false

      if (appliedPromo.target_type === 'all') {
        appliesToItem = true
      } else if (appliedPromo.target_type === 'category' && item.category?.toLowerCase() === appliedPromo.target_value?.toLowerCase()) {
        appliesToItem = true
      } else if (appliedPromo.target_type === 'product' && item.id === appliedPromo.target_value) {
        appliesToItem = true
      }

      if (appliesToItem) {
        // Calculate discount for this item * quantity
        const itemDiscount = (item.price * appliedPromo.discount_percentage) / 100
        discountAmount += itemDiscount * item.quantity
      }
    })

    return Math.max(0, cartTotal - discountAmount)
  }

  const finalTotal = getDiscountedTotal()

  return (
    <div className={styles.cartContainer}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h1>Mon Panier ({totalItems})</h1>
      </header>

      {(!cartItems || cartItems.length === 0) ? (
        <div className={styles.emptyCart}>
          <svg viewBox="0 0 24 24" width="64" height="64" stroke="currentColor" strokeWidth="1" fill="none">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <p>Votre panier est vide.</p>
        </div>
      ) : (
        <>
          <div className={styles.cartList}>
            {cartItems.map(item => (
              <div key={item.id} className={styles.cartItem}>
                <img src={item.image} alt={item.title} className={styles.itemImage} />
                <div className={styles.itemDetails}>
                  <h3 className={styles.itemTitle}>{item.title}</h3>
                  <p className={styles.itemDesc}>Taille: {item.size} x{item.quantity}</p>
                  <p className={styles.itemPrice}>{item.price} FCFA</p>
                </div>
                <button className={styles.removeBtn} onClick={() => removeFromCart(item.id)} aria-label="Retirer" title="Retirer">
                  <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </div>
            ))}
          </div>
          
          <div className={styles.footer}>
            <div className={styles.promoSection}>
              {appliedPromo ? (
                <div className={styles.appliedPromoBox}>
                  <div className={styles.appliedPromoText}>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="#10b981" strokeWidth="3" fill="none">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Code <strong>{appliedPromo.code}</strong> appliqué (-{appliedPromo.discount_percentage}%)
                  </div>
                  <button onClick={() => setAppliedPromo(null)} className={styles.removePromoBtn}>✕</button>
                </div>
              ) : (
                <div className={styles.promoInputGroup}>
                  <input 
                    type="text" 
                    placeholder="Code Promo" 
                    className={styles.promoInput} 
                    value={promoCode} 
                    onChange={(e) => setPromoCode(e.target.value)} 
                  />
                  <button 
                    className={styles.promoApplyBtn} 
                    onClick={handleApplyPromo}
                    disabled={discountLoading}
                  >
                    {discountLoading ? '...' : 'Appliquer'}
                  </button>
                </div>
              )}
              {promoError && <p className={styles.promoError}>{promoError}</p>}
            </div>

            <div className={styles.totalRow}>
              <span>Sous-total</span>
              <span>{cartTotal} FCFA</span>
            </div>
            
            {appliedPromo && (
              <div className={`${styles.totalRow} ${styles.discountRow}`}>
                <span>Réduction ({appliedPromo.code})</span>
                <span>-{cartTotal - finalTotal} FCFA</span>
              </div>
            )}

            <div className={`${styles.totalRow} ${styles.finalTotalRow}`}>
              <span>Total</span>
              <span>{finalTotal} FCFA</span>
            </div>

            <button className={styles.checkoutBtn} onClick={() => router.push('/checkout')}>
              Passer la commande
            </button>
          </div>
        </>
      )}
    </div>
  )
}
