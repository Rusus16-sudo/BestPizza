'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import styles from './Checkout.module.css'

export default function CheckoutPage() {
  const router = useRouter()
  const { cartItems, cartTotal, clearCart } = useCart()
  const [instructions, setInstructions] = useState('')

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    
    const newOrder = {
      id: `CMD-${Math.floor(10000 + Math.random() * 90000)}`,
      date: new Date().toISOString(),
      status: 'en_preparation',
      total: cartTotal,
      items: cartItems.map(item => ({
        name: item.title,
        quantity: item.quantity,
        price: item.price
      })),
      restaurant: 'Foodora Central',
      instructions
    }

    const savedOrders = localStorage.getItem('pizza_orders')
    let ordersList = []
    if (savedOrders) {
      try {
        ordersList = JSON.parse(savedOrders)
      } catch (e) {
        console.error('Failed to parse orders')
      }
    }
    
    ordersList.unshift(newOrder)
    localStorage.setItem('pizza_orders', JSON.stringify(ordersList))

    alert('Commande validée avec succès ! 🎉')
    clearCart()
    router.push('/orders') // Redirect to orders history
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h1>Validation</h1>
      </header>

      <div className={styles.section}>
        <h2>Résumé de la commande</h2>
        {cartItems.map((item, idx) => (
          <div key={idx} className={styles.summaryItem}>
            <span>{item.quantity}x {item.title}</span>
            <span>{item.price} FCFA</span>
          </div>
        ))}
        <div className={styles.summaryTotal}>
          <span>Total à payer</span>
          <span>{cartTotal} FCFA</span>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Instructions spéciales</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '-8px' }}>
          Ajoutez des détails pour le restaurant ou le livreur (ex: pas de mayonnaise, code porte 1234).
        </p>
        <textarea 
          className={styles.instructionsInput}
          placeholder="Écrivez vos instructions ici..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows="4"
        />
      </div>

      <div className={styles.footer}>
        <button 
          className={styles.submitBtn} 
          onClick={handleCheckout}
          disabled={cartItems.length === 0}
          style={{ opacity: cartItems.length === 0 ? 0.5 : 1 }}
        >
          Valider et Payer {cartTotal > 0 ? `${cartTotal} FCFA` : ''}
        </button>
      </div>
    </div>
  )
}
