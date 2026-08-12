'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { products as mockProducts } from '@/data/products'
import styles from './Favorites.module.css'
import ProductCard from '@/components/ProductCard'

export default function FavoritesPage() {
  const router = useRouter()
  const [favoriteProducts, setFavoriteProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFavorites = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      let favIds = []
      
      if (user) {
        const { data: favData } = await supabase.from('favorites').select('product_id').eq('user_id', user.id)
        if (favData) {
          favIds = favData.map(f => f.product_id)
        }
      } else {
        favIds = JSON.parse(localStorage.getItem('favorites') || '[]')
      }
      
      if (favIds.length === 0) {
        setFavoriteProducts([])
        setLoading(false)
        return
      }

      // Separate UUIDs (real DB products) and mock IDs (from data/products.js)
      const uuidFavs = favIds.filter(id => String(id).length > 10)
      const mockFavs = favIds.filter(id => String(id).length <= 10)

      let dbProducts = []
      if (uuidFavs.length > 0) {
        const { data } = await supabase.from('products').select('*').in('id', uuidFavs)
        if (data) dbProducts = data
      }

      // Merge with mock products
      let localProducts = []
      if (mockFavs.length > 0) {
        const { products: mockProductsList } = await import('@/data/products')
        localProducts = mockProductsList.filter(p => mockFavs.includes(p.id) || mockFavs.includes(String(p.id)))
      }
      
      setFavoriteProducts([...dbProducts, ...localProducts])
      setLoading(false)
    }
    fetchFavorites()
  }, [])

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

      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>Chargement...</div>
      ) : favoriteProducts.length === 0 ? (
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
              category={item.category}
              prepTime={item.prep_time || "25-35 min"}
            />
          ))}
        </div>
      )}
    </div>
  )
}
