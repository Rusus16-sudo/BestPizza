'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useStorefront, useLocalMenu } from '@/context/StorefrontContext'
import ProductCard from '@/components/ProductCard'
import PageHeader from '@/components/PageHeader'
import { groupByCategory } from '@/lib/categories'
import { slugify } from '@/lib/slug'
import styles from './Menu.module.css'

// L'ancre d'une catégorie : #poulet-dg
const anchor = (group, i) => slugify(group.label) || `categorie-${i + 1}`

export default function MenuPage() {
  const { id: organizationId } = useStorefront()
  const [allProducts, setProductsList] = useState([])
  // La carte du point de vente choisi
  const productsList = useLocalMenu(allProducts)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('products').select('*, reviews(rating)').eq('organization_id', organizationId)
      setProductsList((data || []).map(p => ({
        ...p,
        rating: p.reviews?.length ? (p.reviews.reduce((a, r) => a + r.rating, 0) / p.reviews.length).toFixed(1) : null
      })))
      setLoading(false)
    }
    fetchProducts()
  }, [organizationId])

  // Les catégories du restaurant, chacune avec ses plats
  const sections = groupByCategory(productsList).map((g, i) => ({ ...g, id: anchor(g, i) }))

  return (
    <div className={styles.container}>
      <PageHeader title="La carte" subtitle={loading ? undefined : `${productsList.length} plats`} />

      {!loading && sections.length > 1 && (
        <nav className={`${styles.jump} no-scrollbar`} aria-label="Aller à une catégorie">
          {sections.map(s => (
            <a key={s.key} href={`#${s.id}`} className={styles.jumpLink}>{s.label}</a>
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
        sections.map(({ key, id, label, products: items }) => (
          <section key={key} id={id} className={styles.section} aria-labelledby={`title-${id}`}>
            <h2 id={`title-${id}`} className={styles.sectionTitle}>
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
                  newUntil={item.new_until}

                  optionGroups={item.option_groups}
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
