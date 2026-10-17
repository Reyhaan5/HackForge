import { CheckCircle2, AlertTriangle, Clock, XCircle, HelpCircle } from 'lucide-react';
import styles from './StatusBadge.module.css';

export const StatusBadge = ({ status }) => {
  const normStatus = (status || '').toUpperCase();

  switch (normStatus) {
    case 'APPROVED':
      return (
        <span className={`${styles.badge} ${styles.approved}`}>
          <CheckCircle2 className={styles.icon} />
          Approved
        </span>
      );
    case 'FLAGGED':
      return (
        <span className={`${styles.badge} ${styles.flagged}`}>
          <AlertTriangle className={styles.icon} />
          Flagged
        </span>
      );
    case 'PENDING_APPROVAL':
    case 'PENDING':
      return (
        <span className={`${styles.badge} ${styles.pending}`}>
          <Clock className={styles.icon} />
          Pending Approval
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`${styles.badge} ${styles.rejected}`}>
          <XCircle className={styles.icon} />
          Rejected
        </span>
      );
    default:
      return (
        <span className={`${styles.badge} ${styles.default}`}>
          <HelpCircle className={styles.icon} />
          {status}
        </span>
      );
  }
};

export default StatusBadge;

