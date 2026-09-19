import styles from './BrandMark.module.css'

// Logo Best Pizza : une part de pizza + le nom
export default function BrandMark({ size = 'md' }) {
  return (
    <span className={`${styles.brand} ${styles[size]}`}>
      <svg className={styles.mark} viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16 3C9.4 3 3.9 6.9 2 12.6L16 29l14-16.4C28.1 6.9 22.6 3 16 3Z" fill="var(--color-crust)" />
        <path d="M16 7.2c-5 0-9.3 2.7-11 6.7L16 26.6l11-12.7c-1.7-4-6-6.7-11-6.7Z" fill="var(--color-primary)" />
        <circle cx="12" cy="13" r="2" fill="#fff" opacity=".9" />
        <circle cx="19.5" cy="12" r="1.6" fill="#fff" opacity=".9" />
        <circle cx="16" cy="19" r="1.8" fill="#fff" opacity=".9" />
      </svg>
      <span className={styles.name}>Best Pizza</span>
    </span>
  )
}
