'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'
import styles from './Checkout.module.css'

export default function CheckoutPage() {
  const router = useRouter()
  const { cartItems, cartTotal, clearCart } = useCart()
  const [instructions, setInstructions] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Paiement à la livraison')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  // Pre-fill phone if user is logged in
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.user_metadata?.phone) {
        setPhone(user.user_metadata.phone)
      }
    }
    fetchUser()
  }, [])

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    if (!deliveryAddress.trim() || !phone.trim()) {
      toast.error("Veuillez remplir votre adresse et numéro de téléphone pour la livraison.")
      return;
    }
    
    setIsSubmitting(true)
    const shortId = `CMD-${Math.floor(10000 + Math.random() * 90000)}`
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 1. Inserer la commande
    const orderPayload = {
      short_id: shortId,
      total_amount: cartTotal,
      total_price: cartTotal,
      special_instructions: instructions,
      delivery_address: `Quartier: ${deliveryAddress} | Tél: ${phone} | Paiement: ${paymentMethod}`,
      status: 'en_attente',
      customer_name: user?.email?.split('@')[0] || 'Client'
    }

    if (user) {
      orderPayload.user_id = user.id
    }


    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert(orderPayload)
      .select()
      .single()

    if (orderError) {
      console.error('Erreur lors de la création de la commande:', orderError.message, orderError.details, orderError.hint)
      toast.error(`Une erreur est survenue: ${orderError.message}`)
      return
    }

    // 2. Vérifier les pizzas existantes pour éviter l'erreur de clé étrangère (ex: pizza supprimée)
    const pizzaIds = cartItems
      .map(item => item.productId)
      .filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))

    let existingPizzaIds = []
    if (pizzaIds.length > 0) {
      const { data: pizzas } = await supabase
        .from('pizzas')
        .select('id')
        .in('id', pizzaIds)
      if (pizzas) {
        existingPizzaIds = pizzas.map(p => p.id)
      }
    }

    // 3. Inserer les articles de la commande
    const orderItems = cartItems.map(item => {
      const isValidPizzaId = existingPizzaIds.includes(item.productId);
      
      return {
        order_id: orderData.id,
        pizza_id: isValidPizzaId ? item.productId : null,
        product_name: item.title,
        quantity: item.quantity,
        size: item.size || 'Moyenne',
        unit_price: item.unitPrice || (item.price / item.quantity),
        price: item.price,
        customizations: item.customizations || {}
      };
    })

    const { data: insertedItems, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select()

    if (itemsError || !insertedItems || insertedItems.length === 0) {
      console.error('Erreur lors de lajout des articles:', itemsError?.message)
      toast.error(`Erreur articles: ${itemsError?.message || 'Insertion échouée'}`)
      
      // Annuler la création de la commande (rollback) pour éviter les commandes fantômes
      await supabase.from('orders').delete().eq('id', orderData.id)
      
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    setOrderSuccess(true)
    clearCart()
    
    setTimeout(() => {
      router.push('/orders') // Redirect to orders history after showing success message
    }, 2500)
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
        <h2>Informations de livraison</h2>
        <div className={styles.inputGroup}>
          <label>Numéro de téléphone</label>
          <input 
            type="tel" 
            className={styles.formInput} 
            placeholder="Ex: 655 12 34 56"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <label>Adresse exacte (Quartier, Repère)</label>
          <input 
            type="text" 
            className={styles.formInput} 
            placeholder="Ex: Bonamoussadi, face Pharmacie"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            required
          />
        </div>
      </div>

      <div className={styles.section}>
        <h2>Moyen de paiement</h2>
        <div className={styles.paymentOptions}>
          <label className={`${styles.paymentCard} ${paymentMethod === 'Paiement à la livraison' ? styles.active : ''}`}>
            <input 
              type="radio" 
              name="payment" 
              value="Paiement à la livraison"
              checked={paymentMethod === 'Paiement à la livraison'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={styles.hiddenRadio}
            />
            <div className={styles.paymentIcon}>
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect>
                <circle cx="12" cy="12" r="2"></circle>
                <path d="M6 12h.01M18 12h.01"></path>
              </svg>
            </div>
            <div className={styles.paymentText}>Paiement à la livraison</div>
          </label>
          
          <label className={`${styles.paymentCard} ${paymentMethod === 'MTN / Orange Money' ? styles.active : ''}`}>
            <input 
              type="radio" 
              name="payment" 
              value="MTN / Orange Money"
              checked={paymentMethod === 'MTN / Orange Money'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={styles.hiddenRadio}
            />
            <div className={styles.paymentIcon}>
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
            </div>
            <div className={styles.paymentText}>MTN / Orange Money</div>
          </label>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Instructions spéciales</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '-8px' }}>
          Ajoutez des détails pour la cuisine ou le livreur (ex: pas de mayonnaise).
        </p>
        <textarea 
          className={styles.instructionsInput}
          placeholder="Écrivez vos instructions ici..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows="3"
        />
      </div>

      <div className={styles.footer}>
        <button 
          className={styles.submitBtn} 
          onClick={handleCheckout}
          disabled={cartItems.length === 0 || isSubmitting}
          style={{ opacity: (cartItems.length === 0 || isSubmitting) ? 0.5 : 1 }}
        >
          {isSubmitting ? 'Traitement en cours...' : `Valider et Payer ${cartTotal > 0 ? `${cartTotal} FCFA` : ''}`}
        </button>
      </div>

      {orderSuccess && (
        <div className={styles.successOverlay}>
          <div className={styles.successCard}>
            <div className={styles.successIcon}>
              <svg viewBox="0 0 24 24" width="48" height="48" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2>Commande Validée !</h2>
            <p>Votre commande a été transmise avec succès à la cuisine.</p>
          </div>
        </div>
      )}
    </div>
  )
}
