import styles from './ProductCard.module.css'
import Link from 'next/link'

export default function ProductCard({ id, title, price, image, isSpicy, rating = "4.5" }) {
  // Use static rating from prop to avoid SSR hydration mismatch
  
  return (
    <Link href={`/product/${id}`} style={{ textDecoration: 'none' }}>
      <div className={styles.card}>
        <div className={styles.imageContainer}>
          <img src={image} alt={title} className={styles.productImage} />
        </div>
        
        <div className={styles.content}>
          <div className={styles.headerRow}>
            <h3 className={styles.title}>{title}</h3>
            <div className={styles.rating}>
              <svg className={styles.star} viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
              {rating}
            </div>
          </div>
          
          <div className={styles.subtitle}>
            Plats, Italien, Fast-Food
          </div>
          
          <div className={styles.footer}>
            <div className={styles.metaItem}>
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              25-35 min
            </div>
            <div className={styles.metaItem}>
              {price} FCFA Livraison
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
