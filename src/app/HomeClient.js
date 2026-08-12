'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import styles from './page.module.css'
import CategoryPill from '@/components/CategoryPill'
import ProductCard from '@/components/ProductCard'

export default function HomeClient({ user, products, latestOffer }) {
  const router = useRouter()
  const { totalItems } = useCart()
  const [activeCategory, setActiveCategory] = useState('Pizza')
  const [searchQuery, setSearchQuery] = useState('')
  const [location, setLocation] = useState('Paris, France')

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
            const data = await res.json();
            if (data && data.address) {
              const city = data.address.city || data.address.town || data.address.village || 'Ville inconnue';
              const country = data.address.country || 'France';
              setLocation(`${city}, ${country}`);
            }
          } catch (e) {
            console.error('Erreur de géolocalisation', e);
          }
        },
        (error) => {
          console.error('Geoloc refusée ou erreur', error);
        }
      )
    }
  }, [])

  const categoryConfigs = [
    { id: 'Pizza', label: 'Pizza', fallback: '/margherita.png', aliases: ['Pizza', 'Pizzas'] },
    { id: 'Burgers', label: 'Burgers', fallback: '/margherita.png', aliases: ['Burger', 'Burgers'] },
    { id: 'Desserts', label: 'Desserts', fallback: '/margherita.png', aliases: ['Dessert', 'Desserts'] },
    { id: 'Drinks', label: 'Boissons', fallback: '/margherita.png', aliases: ['Drink', 'Drinks', 'Boissons'] }
  ]

  const categories = categoryConfigs.map(cat => {
    const catProducts = products.filter(p => cat.aliases.includes(p.category))
    const iconImage = catProducts.length > 0 && catProducts[0].image ? catProducts[0].image : cat.fallback
    return {
      id: cat.id,
      label: cat.label,
      icon: <img src={iconImage} alt={cat.label} style={{width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover'}}/>,
      count: `${catProducts.length} Plats`
    }
  })

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
          
          <button className={styles.mobileCartBtn} onClick={() => router.push('/cart')}>
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
            <span className={styles.locationText}>{location}</span>
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>

          <div className={`${styles.searchWrapper} soft-surface`} style={{ position: 'relative' }}>
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
            {searchQuery.length > 0 && (
              <div className={styles.searchResults}>
                {products
                  .filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(item => (
                    <div 
                      key={item.id} 
                      className={styles.searchResultItem}
                      onClick={() => router.push(`/product/${item.id}`)}
                    >
                      <img src={item.image} alt={item.title} className={styles.searchResultImage} />
                      <div className={styles.searchResultInfo}>
                        <span className={styles.searchResultTitle}>{item.title}</span>
                        <span className={styles.searchResultPrice}>{item.price} FCFA</span>
                      </div>
                    </div>
                  ))
                }
                {products.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <div className={styles.searchResultEmpty}>Aucun résultat</div>
                )}
              </div>
            )}
          </div>

          <div className={styles.desktopProfileBlock}>
            <button className={styles.desktopCartBtn} onClick={() => router.push('/cart')}>
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2.5" fill="none">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              {totalItems > 0 && <span className={styles.cartBadge}>{totalItems}</span>}
            </button>
            <div className={styles.profileUser} onClick={() => router.push(user ? '/profile' : '/login')} style={{ cursor: 'pointer' }}>
              <div className={styles.avatar}>
                {user ? user.email.charAt(0).toUpperCase() : 'J'}
              </div>
              <span className={styles.userName}>{user ? user.email.split('@')[0] : 'Se connecter'}</span>
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
            <button className={styles.orderNowBtn} onClick={() => router.push('/product/1')}>
              Commander 
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
          <div className={styles.promoImageWrapper}>
            <img src="/margherita.png" alt="Delicious Food" />
            {latestOffer && (
              <div className={`${styles.dealFloatingCard} soft-surface`}>
                <div className={styles.dealTag}>
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path>
                  </svg>
                  PROMO
                </div>
                <h3>-{latestOffer.discount_percentage}%</h3>
                <p>{latestOffer.target_type === 'all' ? 'sur tout' : latestOffer.target_type === 'category' ? `sur ${latestOffer.target_value}` : 'sur ce produit'}</p>
                <button className={styles.dealBtn} onClick={() => router.push('/offers')}>Code: {latestOffer.code} <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className={styles.categoriesSection}>
        <div className={styles.sectionHeader}>
          <h3>Catégories</h3>
          <button className={styles.viewAllBtn} onClick={() => router.push('/menu')}>Voir tout</button>
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
          <button className={styles.viewAllBtn} onClick={() => router.push('/menu')}>Voir tout</button>
        </div>
        
        <div className={`${styles.popularList} no-scrollbar`}>
          {products
            .filter(item => {
              const categoryMap = {
                'Pizza': ['Pizza', 'Pizzas'],
                'Burgers': ['Burger', 'Burgers'],
                'Desserts': ['Dessert', 'Desserts'],
                'Drinks': ['Drink', 'Drinks', 'Boissons']
              };
              const actualMatchesCat = categoryMap[activeCategory]?.includes(item.category) || false;
              
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
              category={item.category}
              isSpicy={item.isSpicy}
              rating={item.rating || "4.5"}
              prepTime={item.prep_time || "25-35 min"}
            />
          ))}
        </div>
      </section>

      {/* Tous nos plats */}
      <section className={styles.popularSection} style={{ marginTop: '24px' }}>
        <div className={styles.sectionHeader}>
          <h3>Tous nos plats</h3>
        </div>
        
        <div className={`${styles.popularList} no-scrollbar`}>
          {products
            .filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(item => (
            <ProductCard 
              key={`all-${item.id}`}
              id={item.id}
              title={item.title}
              price={item.price}
              image={item.image}
              category={item.category}
              isSpicy={item.isSpicy}
              rating={item.rating || "4.5"}
              prepTime={item.prep_time || "25-35 min"}
            />
          ))}
        </div>
      </section>
      
    </div>
  )
}
