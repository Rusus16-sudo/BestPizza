import styles from './CategoryPill.module.css'

export default function CategoryPill({ icon, label, isActive, onClick }) {
  return (
    <button 
      className={`${styles.pill} ${isActive ? styles.active : ''}`}
      onClick={onClick}
    >
      <div className={`${styles.iconWrapper} ${isActive ? styles.activeIcon : ''}`}>
        {icon}
      </div>
      <span className={styles.label}>{label}</span>
    </button>
  )
}
