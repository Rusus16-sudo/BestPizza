'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { products as mockProducts } from '@/data/products'
import styles from './Categories.module.css'
import ProductCard from '@/components/ProductCard'

export default function CategoriesPage() {
  const router = useRouter()
  const [productsList, setProductsList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('products').select('*')
      if (data && data.length > 0) {
        setProductsList(data)
      } else {
        setProductsList(mockProducts)
      }
      setLoading(false)
    }
    fetchProducts()
  }, [])
  
  // Extract unique categories from products
  const uniqueCategories = [...new Set(productsList.map(p => p.category))]
  const [activeTab, setActiveTab] = useState('All')

  const handleTabClick = (category) => {
    setActiveTab(category)
    if (category !== 'All') {
      const el = document.getElementById(`category-${category}`)
      if (el) {
        // smooth scroll to category section, offset by sticky header height
        const y = el.getBoundingClientRect().top + window.scrollY - 100
        window.scrollTo({ top: y, behavior: 'smooth' })
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Filter categories to render based on activeTab
  const categoriesToRender = activeTab === 'All' 
    ? uniqueCategories 
    : [activeTab]

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')}>
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h1>Notre Menu</h1>
      </header>

      {/* Sticky navigation for categories */}
      <nav className={styles.categoriesNav}>
        <button 
          className={`${styles.navChip} ${activeTab === 'All' ? styles.active : ''}`}
          onClick={() => handleTabClick('All')}
        >
          Tout voir
        </button>
        {uniqueCategories.map(cat => (
          <button 
            key={cat}
            className={`${styles.navChip} ${activeTab === cat ? styles.active : ''}`}
            onClick={() => handleTabClick(cat)}
          >
            {cat}
          </button>
        ))}
      </nav>

      {/* Render sections for each category */}
      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>Chargement...</div>
      ) : (
        categoriesToRender.map(category => {
          const categoryProducts = productsList.filter(p => p.category === category)
          return (
          <section key={category} id={`category-${category}`} className={styles.categorySection}>
            <div className={styles.categoryHeader}>
              <h2>{category}</h2>
              <span className={styles.itemCount}>{categoryProducts.length} articles</span>
            </div>
            
            <div className={styles.productsGrid}>
              {categoryProducts.map(item => (
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
          </section>
        )
      }))}
    </div>
  )
}
