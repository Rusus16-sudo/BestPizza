import styles from './Skeleton.module.css';

export default function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={`${styles.skeletonImage} ${styles.skeleton}`}></div>
      <div className={`${styles.skeletonTitle} ${styles.skeleton}`}></div>
      <div className={`${styles.skeletonText} ${styles.skeleton}`}></div>
      <div className={`${styles.skeletonTextShort} ${styles.skeleton}`}></div>
      <div className={styles.skeletonFooter}>
        <div className={`${styles.skeletonPrice} ${styles.skeleton}`}></div>
        <div className={`${styles.skeletonButton} ${styles.skeleton}`}></div>
      </div>
    </div>
  );
}
