'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'
import { createClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'
import styles from './Product.module.css'

export default function ProductClient({ product }) {
  const router = useRouter()
  const { addToCart } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [size, setSize] = useState('Moyenne')
  const [isFavorite, setIsFavorite] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [showReviewToast, setShowReviewToast] = useState(false)
  const [showFavToast, setShowFavToast] = useState(false)
  const [user, setUser] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    const initFav = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const isMock = String(product.id).length <= 10
      
      if (user) setUser(user)

      if (user && !isMock) {
        const { data } = await supabase.from('favorites').select('*').eq('user_id', user.id).eq('product_id', product.id).maybeSingle()
        if (data) setIsFavorite(true)
      } else {
        const favs = JSON.parse(localStorage.getItem('favorites') || '[]')
        if (favs.includes(product.id) || favs.includes(String(product.id))) setIsFavorite(true)
      }
    }
    initFav()
  }, [product.id])
  
  // Initialize customization state to false for each addon
  const initialCustomizations = (product.customizations || []).reduce((acc, curr) => {
    acc[curr.id] = false
    return acc
  }, {})
  
  const [customizations, setCustomizations] = useState(initialCustomizations)

  // Calculate total price
  let totalPrice = product.price
  if (size === 'Grande') totalPrice += 1000
  if (size === 'Extra Grande') totalPrice += 2000;
  
  (product.customizations || []).forEach(c => {
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
        <button className={styles.actionBtn} onClick={() => router.back()}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      </div>

      <div className={styles.imageHero}>
        <img src={product.image} alt={product.title} />
      </div>

      <div className={styles.detailsSheet}>
        <div className={styles.detailsHeader}>
          {product.isSpicy && (
            <span className={styles.badge}>
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
              </svg>
              Épicé
            </span>
          )}
          <div className={styles.headerRow}>
            <h1>{product.title}</h1>
            <button 
              className={`${styles.favBtn} ${isFavorite ? styles.favBtnActive : ''}`} 
              onClick={async () => {
                const newIsFav = !isFavorite
                setIsFavorite(newIsFav)
                const isMock = String(product.id).length <= 10
                
                if (user && !isMock) {
                  if (newIsFav) {
                    await supabase.from('favorites').insert([{ user_id: user.id, product_id: product.id }])
                  } else {
                    await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', product.id)
                  }
                } else {
                  let favs = JSON.parse(localStorage.getItem('favorites') || '[]')
                  if (newIsFav) {
                    if (!favs.includes(product.id)) favs.push(product.id)
                  } else {
                    favs = favs.filter(id => id !== product.id && id !== String(product.id))
                  }
                  localStorage.setItem('favorites', JSON.stringify(favs))
                }
                
                setShowFavToast(true)
                setTimeout(() => setShowFavToast(false), 3000)
              }}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill={isFavorite ? "#f26a1d" : "none"}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>
          <div className={styles.ratingRow}>
            <span className={styles.star}>★</span>
            <span className={styles.ratingText}>{product.rating} <span className={styles.reviews}>({product.reviews?.length || 0} avis)</span></span>
            <span className={styles.basePrice}>{product.price} FCFA</span>
          </div>
          <p className={styles.description}>{product.description}</p>
          <div className={styles.metaItem}>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span style={{marginLeft: '4px', fontSize: '0.9rem'}}>{product.prep_time || '25-35 min'} de préparation</span>
          </div>
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

          {product.customizations && product.customizations.length > 0 && (
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
          )}
        </div>

        {/* Reviews Section */}
        <div className={styles.reviewsSection}>
          <h3>Avis des clients</h3>
          
          <div className={styles.reviewsList}>
            {product.reviews && product.reviews.length > 0 ? (
              product.reviews.map(review => (
                <div key={review.id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <span className={styles.reviewStars}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                    <span className={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className={styles.reviewComment}>{review.comment}</p>
                </div>
              ))
            ) : (
              <p className={styles.noReviews}>Aucun avis pour le moment. Soyez le premier !</p>
            )}
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
              setShowToast(true)
              setTimeout(() => setShowToast(false), 5000)
            }}
          >
            <div className={styles.addToCartContent}>
              <span className={styles.addToCartText}>Ajouter au Panier</span>
              <div className={styles.addToCartPriceTag}>
                {totalPrice} FCFA
              </div>
            </div>
          </button>
        </div>
      </div>

      {showToast && (
        <div className={styles.toastOverlay}>
          <div className={styles.toastContent}>
            <div className={styles.toastText}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Ajouté avec succès !</span>
            </div>
            <button className={styles.toastBtn} onClick={() => router.push('/cart')}>
              Voir le panier
            </button>
          </div>
        </div>
      )}

      {showReviewToast && (
        <div className={styles.toastOverlay}>
          <div className={styles.toastContent}>
            <div className={styles.toastText}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Avis publié avec succès !</span>
            </div>
          </div>
        </div>
      )}

      {showFavToast && (
        <div className={styles.toastOverlay}>
          <div className={styles.toastContent}>
            <div className={styles.toastText}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill={isFavorite ? "#f26a1d" : "none"} stroke={isFavorite ? "#f26a1d" : "currentColor"}></path>
              </svg>
              <span>{isFavorite ? 'Plat ajouté aux favoris !' : 'Retiré des favoris'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
