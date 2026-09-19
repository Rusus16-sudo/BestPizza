'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { products as mockProducts } from '@/data/products'
import ProductCard from '@/components/ProductCard'
import PageHeader from '@/components/PageHeader'
import styles from './Menu.module.css'

const CATEGORY_LABELS = {
  pizza: 'Pizzas', pizzas: 'Pizzas',
  burger: 'Burgers', burgers: 'Burgers',
  dessert: 'Desserts', desserts: 'Desserts',
  drink: 'Boissons', drinks: 'Boissons', boisson: 'Boissons', boissons: 'Boissons',
  side: 'Accompagnements', sides: 'Accompagnements',
}
const ORDER = ['Pizzas', 'Burgers', 'Accompagnements', 'Desserts', 'Boissons']

const labelFor = (category) => CATEGORY_LABELS[String(category).toLowerCase()] || category || 'Autres'
const slug = (label) => label.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')

export default function MenuPage() {
  const [productsList, setProductsList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('products').select('*, reviews(rating)')
      if (data && data.length > 0) {
        setProductsList(data.map(p => ({
          ...p,
          rating: p.reviews?.length ? (p.reviews.reduce((a, r) => a + r.rating, 0) / p.reviews.length).toFixed(1) : null
        })))
      } else {
        setProductsList(mockProducts)
      }
      setLoading(false)
    }
    fetchProducts()
  }, [])

  // Regroupe par catégorie, dans un ordre fixe
  const grouped = productsList.reduce((acc, product) => {
    const label = labelFor(product.category)
    ;(acc[label] ||= []).push(product)
    return acc
  }, {})
  const sections = Object.entries(grouped).sort(([a], [b]) => {
    const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })

  return (
    <div className={styles.container}>
      <PageHeader title="La carte" subtitle={loading ? undefined : `${productsList.length} plats`} />

      {!loading && sections.length > 1 && (
        <nav className={`${styles.jump} no-scrollbar`} aria-label="Aller à une catégorie">
          {sections.map(([label]) => (
            <a key={label} href={`#${slug(label)}`} className={styles.jumpLink}>{label}</a>
          ))}
        </nav>
      )}

      {loading ? (
        <div className={styles.grid} aria-busy="true" aria-label="Chargement de la carte">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeleton}>
              <div className={styles.skelImage} />
              <div className={styles.skelLine} />
              <div className={styles.skelLineShort} />
            </div>
          ))}
        </div>
      ) : (
        sections.map(([label, items]) => (
          <section key={label} id={slug(label)} className={styles.section} aria-labelledby={`title-${slug(label)}`}>
            <h2 id={`title-${slug(label)}`} className={styles.sectionTitle}>
              {label} <span className={styles.count}>{items.length}</span>
            </h2>
            <div className={styles.grid}>
              {items.map(item => (
                <ProductCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  price={item.price}
                  image={item.image}
                  category={item.category}
                  isSpicy={item.isSpicy ?? item.is_spicy}
                  rating={item.rating}
                  prepTime={item.prep_time || '25-35 min'}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
