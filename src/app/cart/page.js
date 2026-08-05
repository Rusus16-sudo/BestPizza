'use client'

import { useCart } from '@/context/CartContext'
import { useRouter } from 'next/navigation'
import styles from './Cart.module.css'

export default function CartPage() {
  const { cartItems, removeFromCart, totalItems, cartTotal } = useCart()
  const router = useRouter()

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
            <div className={styles.totalRow}>
              <span>Total</span>
              <span>{cartTotal} FCFA</span>
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
