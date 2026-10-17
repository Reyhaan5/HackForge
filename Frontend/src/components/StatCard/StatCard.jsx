import styles from './StatCard.module.css';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'primary'
}) => {
  return (
    <div className={styles.card}>
      <div className={`${styles.iconWrapper} ${styles[variant]}`}>
        {Icon && <Icon size={26} strokeWidth={2} />}
      </div>
      <div className={styles.content}>
        <span className={styles.title}>{title}</span>
        <div className={styles.valueRow}>
          <h3 className={styles.value}>{value}</h3>
        </div>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>
    </div>
  );
};

export default StatCard;

