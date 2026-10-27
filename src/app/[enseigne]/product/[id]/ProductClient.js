'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart, formatPrice } from '@/context/CartContext'
import { getBrowserClient } from '@/utils/supabase/client'
import toast from 'react-hot-toast'
import styles from './Product.module.css'
import { defaultSelection, normalizeSelection, selectionLines, unitPriceFor } from '@/lib/options'
import { isNewProduct } from '@/lib/product-badges'
import { useStorefront } from '@/context/StorefrontContext'


export default function ProductClient({ product }) {
  const router = useRouter()
  const { addToCart, totalItems } = useCart()
  const { href } = useStorefront()
  const [quantity, setQuantity] = useState(1)
  // Les choix du plat (taille, formule, suppléments), définis par le gérant
  const groups = (product.option_groups || []).filter(g => g?.choices?.length)
  const [choices, setChoices] = useState(() => defaultSelection(product))
  const [isFavorite, setIsFavorite] = useState(false)
  const [user, setUser] = useState(null)
  const [justAdded, setJustAdded] = useState(false)
  const [supabase] = useState(() => getBrowserClient())

  const reviews = Array.isArray(product.reviews) ? product.reviews : []
  const reviewCount = Array.isArray(product.reviews) ? product.reviews.length : Number(product.reviews) || 0
  const isMock = String(product.id).length <= 10

  useEffect(() => {
    const initFav = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUser(user)

      if (user && !isMock) {
        const { data } = await supabase.from('favorites').select('*').eq('user_id', user.id).eq('product_id', product.id).maybeSingle()
        if (data) setIsFavorite(true)
      } else {
        try {
          const favs = JSON.parse(localStorage.getItem('favorites') || '[]')
          if (favs.includes(product.id) || favs.includes(String(product.id))) setIsFavorite(true)
        } catch (e) {}
      }
    }
    initFav()
  }, [product.id])

  const toggleOption = (groupId, choiceId) => setChoices(prev => {
    const current = prev[groupId] || []
    return { ...prev, [groupId]: current.includes(choiceId) ? current.filter(id => id !== choiceId) : [...current, choiceId] }
  })

  const selection = normalizeSelection(product, choices)
  const unitPrice = unitPriceFor(product, selection)
  const totalPrice = unitPrice * quantity

  const toggleFavorite = async () => {
    const newIsFav = !isFavorite
    setIsFavorite(newIsFav)

    if (user && !isMock) {
      if (newIsFav) {
        await supabase.from('favorites').insert([{ user_id: user.id, product_id: product.id }])
      } else {
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', product.id)
      }
    } else {
      try {
        let favs = JSON.parse(localStorage.getItem('favorites') || '[]')
        if (newIsFav) {
          if (!favs.includes(product.id)) favs.push(product.id)
        } else {
          favs = favs.filter(id => id !== product.id && id !== String(product.id))
        }
        localStorage.setItem('favorites', JSON.stringify(favs))
      } catch (e) {}
    }
    toast.success(newIsFav ? 'Ajouté aux favoris' : 'Retiré des favoris', { id: 'fav' })
  }

  const handleAdd = () => {
    addToCart(product, quantity, selection, selectionLines(product, selection), totalPrice)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1600)
    toast.success(`${quantity > 1 ? `${quantity} × ` : ''}${product.title} ajouté au panier`, { id: 'cart-add' })
  }

  return (
    <div className={styles.page}>
      <div className={styles.media}>
        <img src={product.image} alt={product.title} className={styles.photo} />
        <div className={styles.topActions}>
          <button className={styles.roundBtn} onClick={() => router.back()} aria-label="Retour">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button
            className={`${styles.roundBtn} ${isFavorite ? styles.favActive : ''}`}
            onClick={toggleFavorite}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <svg viewBox="0 0 24 24" width="21" height="21" stroke="currentColor" strokeWidth="2" fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.details}>
        <header className={styles.intro}>
          <h1>{product.title}</h1>
          <div className={styles.meta}>
            {isNewProduct(product) && <span className={styles.newTag}>Nouveau</span>}
            {product.rating && (
              <span className={styles.metaItem}>
                <svg className={styles.star} viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                <strong>{product.rating}</strong>
                {reviewCount > 0 && <span>({reviewCount} avis)</span>}
              </span>
            )}
            <span className={styles.metaItem}>{product.prep_time || '25-35 min'}</span>
            {(product.isSpicy ?? product.is_spicy) && <span className={`${styles.metaItem} ${styles.spicy}`}>Épicé</span>}
          </div>
          <p className={styles.price}>{formatPrice(product.price)}</p>
          {product.description && <p className={styles.description}>{product.description}</p>}
        </header>

        {groups.map(group => (
          <section key={group.id} className={styles.block} aria-labelledby={`group-${group.id}`}>
            <h2 id={`group-${group.id}`}>{group.name}</h2>
            {group.type === 'multiple' ? (
              <div className={styles.addons}>
                {group.choices.map(choice => {
                  const on = (choices[group.id] || []).includes(String(choice.id))
                  return (
                    <label key={choice.id} className={`${styles.addon} ${on ? styles.addonOn : ''}`}>
                      <input type="checkbox" checked={on} onChange={() => toggleOption(group.id, String(choice.id))} />
                      <span className={styles.check} aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </span>
                      <span className={styles.addonLabel}>{choice.label}</span>
                      <span className={styles.addonPrice}>{Number(choice.price) ? `+${Number(choice.price).toLocaleString('fr-FR')}` : 'Offert'}</span>
                    </label>
                  )
                })}
              </div>
            ) : (
              <div className={styles.sizes} role="radiogroup" aria-labelledby={`group-${group.id}`}>
                {group.choices.map(choice => (
                  <button
                    key={choice.id}
                    role="radio"
                    aria-checked={choices[group.id] === String(choice.id)}
                    className={`${styles.size} ${choices[group.id] === String(choice.id) ? styles.sizeActive : ''}`}
                    onClick={() => setChoices(prev => ({ ...prev, [group.id]: String(choice.id) }))}
                  >
                    <span className={styles.sizeName}>{choice.label}</span>
                    <span className={styles.sizeExtra}>{Number(choice.price) ? `+${Number(choice.price).toLocaleString('fr-FR')}` : 'Inclus'}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        ))}

        <section className={styles.block} aria-labelledby="reviews-title">
          <h2 id="reviews-title">Avis clients</h2>
          {reviews.length > 0 ? (
            <ul className={styles.reviews}>
              {reviews.map(review => (
                <li key={review.id} className={styles.review}>
                  <div className={styles.reviewHead}>
                    <span className={styles.reviewStars} aria-label={`${review.rating} sur 5`}>
                      {'★'.repeat(review.rating)}<span className={styles.reviewStarsOff}>{'★'.repeat(5 - review.rating)}</span>
                    </span>
                    <time className={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                  </div>
                  {review.comment && <p>{review.comment}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>Pas encore d’avis. Vous pourrez noter ce plat depuis vos commandes après la livraison.</p>
          )}
        </section>

        <div className={styles.buyBar}>
          <div className={styles.stepper} role="group" aria-label="Quantité">
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1} aria-label="Retirer un">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
            <span aria-live="polite">{quantity}</span>
            <button onClick={() => setQuantity(q => q + 1)} aria-label="Ajouter un">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
          </div>
          {justAdded && totalItems > 0 ? (
            <Link href={href('/cart')} className={`${styles.addBtn} ${styles.addBtnDone}`}>
              <span>Voir le panier</span>
              <span className={styles.addPrice}>{totalItems} article{totalItems > 1 ? 's' : ''}</span>
            </Link>
          ) : (
            <button className={styles.addBtn} onClick={handleAdd}>
              <span>Ajouter</span>
              <span className={styles.addPrice}>{formatPrice(totalPrice)}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
