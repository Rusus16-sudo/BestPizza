'use client'

import { useRouter } from 'next/navigation'
import { products } from '@/data/products'
import ProductCard from '@/components/ProductCard'
import styles from './Menu.module.css'

export default function MenuPage() {
  const router = useRouter()

  // Group products by category
  const groupedProducts = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = []
    }
    acc[product.category].push(product)
    return acc
  }, {})

  return (
    <div className={styles.menuContainer}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h1>Notre Menu Complet</h1>
      </header>

      <div className={styles.menuContent}>
        {Object.entries(groupedProducts).map(([category, items]) => (
          <div key={category} className={styles.categorySection}>
            <h2 className={styles.categoryTitle}>{category}</h2>
            <div className={styles.productsGrid}>
              {items.map(item => (
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
          </div>
        ))}
      </div>
    </div>
  )
}
