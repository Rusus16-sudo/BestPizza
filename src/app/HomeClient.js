'use client'

import { useState } from 'react'
import { useCart } from '@/context/CartContext'
import styles from './page.module.css'
import CategoryPill from '@/components/CategoryPill'
import ProductCard from '@/components/ProductCard'
import { products } from '@/data/products'

export default function HomeClient({ user }) {
  const { totalItems } = useCart()
  const [activeCategory, setActiveCategory] = useState('Pizza')
  const [searchQuery, setSearchQuery] = useState('')

  const categories = [
    { 
      id: 'Pizza', 
      icon: <img src="/margherita.png" alt="Pizza" style={{width: '40px', height: '40px'}}/>, 
      label: 'Pizza',
      count: '32 Restaurants'
    },
    { 
      id: 'Burgers', 
      icon: <img src="/margherita.png" alt="Burgers" style={{width: '40px', height: '40px', opacity: 0.5}}/>, 
      label: 'Burgers',
      count: '28 Restaurants'
    },
    { 
      id: 'Desserts', 
      icon: <img src="/margherita.png" alt="Desserts" style={{width: '40px', height: '40px', opacity: 0.5}}/>, 
      label: 'Desserts',
      count: '18 Restaurants'
    },
    { 
      id: 'Drinks', 
      icon: <img src="/margherita.png" alt="Boissons" style={{width: '40px', height: '40px', opacity: 0.5}}/>, 
      label: 'Boissons',
      count: '16 Restaurants'
    }
  ]

  return (
    <div className={styles.appContainer}>
      
      {/* Header */}
      <header className={styles.header}>
        {/* Mobile Logo & Cart row */}
        <div className={styles.mobileTopBar}>
          <div className={styles.mobileLogo}>
            <svg viewBox="0 0 24 24" width="24" height="24" className={styles.logoIcon} fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            </svg>
            Foodora
          </div>
          
          <button className={styles.mobileCartBtn}>
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            {totalItems > 0 && <span className={styles.cartBadge}>{totalItems}</span>}
          </button>
        </div>

        {/* Location & Search & Profile Row */}
        <div className={styles.topControls}>
          <div className={styles.locationBlock}>
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--color-primary)" strokeWidth="2" fill="none">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span className={styles.locationText}>Paris, France</span>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>

          <div className={`${styles.searchWrapper} soft-surface`}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="var(--color-text-tertiary)" strokeWidth="2" fill="none">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              placeholder="Rechercher plats, restaurants..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.desktopProfileBlock}>
            <button className={styles.desktopCartBtn}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              {totalItems > 0 && <span className={styles.cartBadge}>{totalItems}</span>}
            </button>
            <div className={styles.profileUser}>
              <div className={styles.avatar}>
                {user ? user.email.charAt(0).toUpperCase() : 'J'}
              </div>
              <span className={styles.userName}>{user ? user.email.split('@')[0] : 'John Doe'}</span>
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.promoCard}>
          <div className={styles.promoContent}>
            <h2>Délicieux et<br/><span className={styles.highlight}>livré vite</span></h2>
            <p>Commandez dans vos restos favoris<br/>et faites-vous livrer à la porte.</p>
            <button className={styles.orderNowBtn}>
              Commander 
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
          <div className={styles.promoImageWrapper}>
            <img src="/margherita.png" alt="Delicious Food" />
            <div className={`${styles.dealFloatingCard} soft-surface`}>
              <div className={styles.dealTag}>🔥 Promo</div>
              <h3>-30%</h3>
              <p>sur tout</p>
              <button className={styles.dealBtn}>Commander <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className={styles.categoriesSection}>
        <div className={styles.sectionHeader}>
          <h3>Catégories</h3>
          <button className={styles.viewAllBtn}>Voir tout</button>
        </div>
        <div className={`${styles.categoriesList} no-scrollbar`}>
          {categories.map(cat => (
            <div 
              key={cat.id} 
              className={`${styles.catCard} soft-surface ${activeCategory === cat.id ? styles.activeCat : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              <div className={styles.catIconBox}>
                {cat.icon}
              </div>
              <span className={styles.catTitle}>{cat.label}</span>
              <span className={styles.catCount}>{cat.count}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Restaurants / Products */}
      <section className={styles.popularSection}>
        <div className={styles.sectionHeader}>
          <h3>Populaire en ce moment</h3>
          <button className={styles.viewAllBtn}>Voir tout</button>
        </div>
        
        <div className={`${styles.popularList} no-scrollbar`}>
          {products
            .filter(item => {
              const matchesCategory = item.category === activeCategory || activeCategory === 'Pizza';
              const categoryMap = {
                'Pizza': 'Pizza',
                'Sides': 'Sides',
                'Drinks': 'Drinks',
                'Desserts': 'Desserts',
                'Burgers': 'Pizza' // Just mapping for demo purposes
              };
              const actualMatchesCat = item.category === categoryMap[activeCategory] || true; // Demo: show all
              
              const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
              return actualMatchesCat && matchesSearch;
            })
            .map(item => (
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
      
    </div>
  )
}
