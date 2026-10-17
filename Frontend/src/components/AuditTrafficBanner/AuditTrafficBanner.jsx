import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  ShieldCheck,
  Split
} from 'lucide-react';
import styles from './AuditTrafficBanner.module.css';

/**
 * AuditTrafficBanner
 * Matches schema: 'APPROVED', 'PARTIAL', 'PENDING_APPROVAL', 'REJECTED', 'FLAGGED'
 */
export const AuditTrafficBanner = ({
  status = 'APPROVED',
  requestedAmount = 0,
  approvedAmount = 0,
  flags = [],
  currency = 'USD',
  explanation = ''
}) => {
  const normStatus = (status || '').toUpperCase();

  const renderContent = () => {
    switch (normStatus) {
      case 'APPROVED':
        return {
          bannerClass: styles.bannerApproved,
          icon: <CheckCircle2 className={styles.statusIcon} />,
          title: 'Full Reimbursement Approved',
          subtitle: 'Clean audit pass • All items comply with active corporate policy',
          amountLabel: 'Approved Payout',
          amountDisplay: `$${Number(approvedAmount || requestedAmount).toFixed(2)} ${currency}`,
        };

      case 'PARTIAL':
      case 'FLAGGED':
        return {
          bannerClass: styles.bannerPartial,
          icon: <Split className={styles.statusIcon} />,
          title: 'Partially Approved (Line Disallowance)',
          subtitle: explanation || 'Specific non-compliant items were excluded from reimbursement',
          amountLabel: 'Adjusted Payout',
          amountDisplay: `$${Number(approvedAmount).toFixed(2)} of $${Number(requestedAmount).toFixed(2)}`,
        };

      case 'PENDING_APPROVAL':
      case 'PENDING':
        return {
          bannerClass: styles.bannerPending,
          icon: <Clock className={styles.statusIcon} />,
          title: 'Manager Approval Required',
          subtitle: explanation || 'Amount exceeds executive sign-off limit ($200.00)',
          amountLabel: 'Requested Claim',
          amountDisplay: `$${Number(requestedAmount).toFixed(2)} ${currency}`,
        };

      case 'REJECTED':
      default:
        return {
          bannerClass: styles.bannerRejected,
          icon: <XCircle className={styles.statusIcon} />,
          title: 'Expense Claim Rejected',
          subtitle: explanation || 'Receipt violated corporate compliance guidelines',
          amountLabel: 'Reimbursable',
          amountDisplay: `$0.00 ${currency}`,
        };
    }
  };

  const config = renderContent();

  return (
    <div className={`${styles.bannerContainer} ${config.bannerClass}`}>
      <div className={styles.contentLeft}>
        <div className={styles.iconWrap}>{config.icon}</div>
        <div className={styles.metaWrap}>
          <div className={styles.titleRow}>
            <span className={styles.badgeCode}>{normStatus}</span>
            <h4 className={styles.bannerTitle}>{config.title}</h4>
          </div>
          <p className={styles.bannerSubtitle}>{config.subtitle}</p>

          {flags && flags.length > 0 && (
            <div className={styles.chipsRow}>
              {flags.map((flag, idx) => (
                <span key={idx} className={styles.flagChip}>
                  {flag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.contentRight}>
        <span className={styles.amountLabel}>{config.amountLabel}</span>
        <span className={styles.amountDisplay}>{config.amountDisplay}</span>
      </div>
    </div>
  );
};

export default AuditTrafficBanner;
