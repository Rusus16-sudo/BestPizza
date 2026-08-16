import styles from './Skeleton.module.css';

export default function SkeletonList({ count = 3 }) {
  return (
    <div className={styles.skeletonListContainer}>
      {[...Array(count)].map((_, i) => (
        <div key={i} className={styles.skeletonListItem}>
          <div className={styles.skeletonListHeader}>
            <div className={`${styles.skeletonBlock} ${styles.skeleton}`}></div>
            <div className={`${styles.skeletonBadge} ${styles.skeleton}`}></div>
          </div>
          <div className={styles.skeletonListBody}>
            <div className={`${styles.skeletonLine} ${styles.skeleton}`}></div>
            <div className={`${styles.skeletonLine} ${styles.skeleton}`} style={{ width: '60%' }}></div>
          </div>
        </div>
      ))}
    </div>
  );
}
