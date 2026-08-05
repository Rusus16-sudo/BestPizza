'use client'

import { useRouter } from 'next/navigation'
import styles from './Favorites.module.css'
import ProductCard from '@/components/ProductCard'
import { products } from '@/data/products'

export default function FavoritesPage() {
  const router = useRouter()

  // Mocking favorites by selecting some products
  const favoriteProductIds = [1, 3, 9] // Margherita, 4 Fromages, Double Smash Burger
  const favoriteProducts = products.filter(p => favoriteProductIds.includes(p.id))

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h1>Mes Favoris</h1>
      </header>

      {favoriteProducts.length === 0 ? (
        <div className={styles.emptyState}>
          <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <p>Vous n'avez pas encore de favoris.</p>
        </div>
      ) : (
        <div className={styles.productsGrid}>
          {favoriteProducts.map(item => (
            <ProductCard 
              key={item.id}
              id={item.id}
              title={item.title}
              price={item.price}
              image={item.image}
              isSpicy={item.isSpicy}
              rating={item.rating || "4.5"}
            />
          ))}
        </div>
      )}
    </div>
  )
}
