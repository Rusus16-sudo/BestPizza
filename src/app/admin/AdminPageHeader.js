import styles from './AdminPageHeader.module.css'

// Mise en page commune aux écrans du gérant : titre, sous-titre, contenu
export default function AdminPageHeader({ title, subtitle, actions, children }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      {children}
    </div>
  )
}
