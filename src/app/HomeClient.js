'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import styles from './page.module.css'
import ProductCard from '@/components/ProductCard'
import BrandMark from '@/components/BrandMark'

const CATEGORIES = [
  { id: 'all', label: 'Tout', aliases: [] },
  { id: 'Pizza', label: 'Pizzas', aliases: ['pizza', 'pizzas'] },
  { id: 'Burgers', label: 'Burgers', aliases: ['burger', 'burgers'] },
  { id: 'Sides', label: 'Accompagnements', aliases: ['side', 'sides', 'accompagnement', 'accompagnements'] },
  { id: 'Desserts', label: 'Desserts', aliases: ['dessert', 'desserts'] },
  { id: 'Drinks', label: 'Boissons', aliases: ['drink', 'drinks', 'boisson', 'boissons'] },
]

const inCategory = (item, cat) =>
  cat.id === 'all' || cat.aliases.includes(String(item.category).toLowerCase())

function describeOffer(offer) {
  if (offer.target_type === 'all') return 'sur toute la carte'
  if (offer.target_type === 'category') return `sur les ${offer.target_value}`
  return 'sur une sélection'
}

export default function HomeClient({ user, products, latestOffer }) {
  const { totalItems } = useCart()
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const menuRef = useRef(null)

  const query = searchQuery.trim().toLowerCase()
  const isSearching = query.length > 0
  const initial = user?.email ? user.email[0].toUpperCase() : null

  // Seules les catégories qui ont des plats sont proposées
  const categories = CATEGORIES.filter(cat => cat.id === 'all' || products.some(p => inCategory(p, cat)))
  const currentCat = categories.find(c => c.id === activeCategory) || categories[0]

  const rated = products.filter(p => p.rating).sort((a, b) => Number(b.rating) - Number(a.rating))
  const featured = (rated.length >= 3 ? rated : products.filter(p => inCategory(p, CATEGORIES[1]))).slice(0, 8)
  const featuredTitle = rated.length >= 3 ? 'Les plus appréciées' : 'Nos pizzas'

  const visibleProducts = isSearching
    ? products.filter(p => p.title.toLowerCase().includes(query) || String(p.category).toLowerCase().includes(query))
    : products.filter(p => inCategory(p, currentCat))

  const scrollToMenu = () => menuRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const renderCard = (item, variant) => (
    <ProductCard
      key={`${variant}-${item.id}`}
      id={item.id}
      title={item.title}
      price={item.price}
      image={item.image}
      category={item.category}
      isSpicy={item.isSpicy ?? item.is_spicy}
      rating={item.rating}
      prepTime={item.prep_time || '25-35 min'}
      variant={variant}
    />
  )

  return (
    <div className={styles.appContainer}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <Link href="/" className={styles.mobileBrand} aria-label="Best Pizza, accueil">
            <BrandMark />
          </Link>

          <div className={styles.searchWrapper} role="search">
            <svg className={styles.searchIcon} viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.2" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7.5"></circle>
              <line x1="21" y1="21" x2="16.5" y2="16.5"></line>
            </svg>
            <label htmlFor="search" className="visually-hidden">Rechercher un plat</label>
            <input
              id="search"
              type="search"
              placeholder="Une envie ? Margherita, burger…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              autoComplete="off"
            />
            {isSearching && (
              <button className={styles.clearSearch} onClick={() => setSearchQuery('')} aria-label="Effacer la recherche">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>

          <div className={styles.headerActions}>
            <Link href="/cart" className={styles.iconBtn} aria-label={`Panier, ${totalItems} article${totalItems > 1 ? 's' : ''}`}>
              <svg viewBox="0 0 24 24" width="21" height="21" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              {totalItems > 0 && <span className={styles.cartBadge}>{totalItems}</span>}
            </Link>
            {user ? (
              <Link href="/profile" className={styles.avatar} aria-label="Mon profil">{initial}</Link>
            ) : (
              <Link href="/login" className={styles.loginBtn}>Se connecter</Link>
            )}
          </div>
        </div>
      </header>

      {isSearching ? (
        <section className={styles.section} aria-live="polite">
          <div className={styles.sectionHeader}>
            <h2>
              {visibleProducts.length > 0
                ? `${visibleProducts.length} résultat${visibleProducts.length > 1 ? 's' : ''}`
                : 'Aucun plat trouvé'}
            </h2>
          </div>
          {visibleProducts.length > 0 ? (
            <div className={styles.grid}>{visibleProducts.map(item => renderCard(item, 'grid'))}</div>
          ) : (
            <div className={styles.emptyState}>
              <p>Rien ne correspond à « {searchQuery} ». Essayez un autre mot, ou parcourez la carte.</p>
              <button className="btn btn-secondary" onClick={() => setSearchQuery('')}>Voir toute la carte</button>
            </div>
          )}
        </section>
      ) : (
        <>
          <section className={styles.hero}>
            <div className={styles.heroText}>
              <h1>Sortie du four,<br />livrée chez vous.</h1>
              <p>Choisissez votre pizza, on s’occupe du reste.</p>
              <div className={styles.heroActions}>
                <button className="btn btn-primary" onClick={scrollToMenu}>Voir la carte</button>
                {latestOffer && (
                  <Link href="/offers" className={styles.offerPill}>
                    <strong>-{latestOffer.discount_percentage}%</strong> {describeOffer(latestOffer)}
                  </Link>
                )}
              </div>
            </div>
            <div className={styles.heroPizza} aria-hidden="true">
              <img src="/margherita.png" alt="" />
            </div>
          </section>

          {featured.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>{featuredTitle}</h2>
                <Link href="/menu" className={styles.seeAll}>Tout voir</Link>
              </div>
              <div className={`${styles.rail} no-scrollbar`}>
                {featured.map(item => renderCard(item, 'rail'))}
              </div>
            </section>
          )}

          <section className={styles.section} ref={menuRef} aria-labelledby="menu-title">
            <div className={styles.sectionHeader}>
              <h2 id="menu-title">La carte</h2>
            </div>
            <div className={`${styles.chips} no-scrollbar`} role="tablist" aria-label="Catégories">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={currentCat.id === cat.id}
                  className={`${styles.chip} ${currentCat.id === cat.id ? styles.chipActive : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className={styles.grid}>
              {visibleProducts.map(item => renderCard(item, 'grid'))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
