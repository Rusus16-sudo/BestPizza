'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import styles from './Product.module.css'

export default function ProductClient({ product }) {
  const router = useRouter()
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [size, setSize] = useState('Moyenne')
  
  // Initialize customization state to false for each addon
  const initialCustomizations = product.customizations.reduce((acc, curr) => {
    acc[curr.id] = false
    return acc
  }, {})
  
  const [customizations, setCustomizations] = useState(initialCustomizations)

  // Calculate total price
  let totalPrice = product.price
  if (size === 'Grande') totalPrice += 1000
  if (size === 'Extra Grande') totalPrice += 2000
  
  product.customizations.forEach(c => {
    if (customizations[c.id]) {
      totalPrice += c.price
    }
  })
  
  totalPrice = totalPrice * quantity

  const handleToggle = (id) => {
    setCustomizations(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const handleDecrease = () => {
    if (quantity > 1) setQuantity(q => q - 1)
  }

  const handleIncrease = () => {
    setQuantity(q => q + 1)
  }

  return (
    <div className={styles.productContainer}>
      <div className={styles.topActions}>
        <button className={`${styles.actionBtn} glass`} onClick={() => router.back()}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button className={`${styles.actionBtn} glass`}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="#ef4444" strokeWidth="2" fill="#ef4444">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
      </div>

      <div className={styles.imageHero}>
        <img src={product.image} alt={product.title} />
      </div>

      <div className={`${styles.detailsSheet} glass`}>
        <div className={styles.detailsHeader}>
          {product.isSpicy && <span className={styles.badge}>Épicé</span>}
          <div className={styles.headerRow}>
            <h1>{product.title}</h1>
            <div className={styles.ratingBtn}>
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                 <rect x="3" y="3" width="7" height="7"></rect>
                 <rect x="14" y="3" width="7" height="7"></rect>
                 <rect x="14" y="14" width="7" height="7"></rect>
                 <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </div>
          </div>
          <div className={styles.ratingRow}>
            <span className={styles.star}>★</span>
            <span className={styles.ratingText}>{product.rating} <span className={styles.reviews}>({product.reviews})</span></span>
            <span className={styles.basePrice}>{product.price} FCFA</span>
          </div>
          <p className={styles.description}>{product.description}</p>
        </div>

        <div className={styles.customizeSection}>
          <h3>Personnaliser</h3>
          
          <div className={styles.sizeRow}>
            <span className={styles.optionLabel}>Taille</span>
            <div className={styles.sizeOptions}>
              {['Moyenne', 'Grande', 'Extra Grande'].map(s => (
                <button 
                  key={s}
                  className={`${styles.sizeBtn} ${size === s ? styles.sizeActive : ''}`}
                  onClick={() => setSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.addonsList}>
            {product.customizations.map(addon => (
              <div key={addon.id} className={styles.addonRow}>
                <span className={styles.optionLabel}>{addon.label} <span className={styles.addonPrice}>(+{addon.price} FCFA)</span></span>
                <label className={styles.switch}>
                  <input 
                    type="checkbox" 
                    checked={customizations[addon.id]} 
                    onChange={() => handleToggle(addon.id)} 
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.stickyFooter}>
          <div className={styles.quantityControl}>
            <button className={styles.qBtn} onClick={handleDecrease}>-</button>
            <span className={styles.qValue}>{quantity}</span>
            <button className={styles.qBtn} onClick={handleIncrease}>+</button>
          </div>
          <button 
            className={styles.addToCartBtn}
            onClick={() => {
              addToCart(product, quantity, size, customizations, totalPrice)
              // Optional: show a small toast or redirect
              router.push('/')
            }}
          >
            Ajouter au Panier <span className={styles.btnPrice}>{totalPrice} FCFA</span>
          </button>
        </div>
      </div>
    </div>
  )
}
