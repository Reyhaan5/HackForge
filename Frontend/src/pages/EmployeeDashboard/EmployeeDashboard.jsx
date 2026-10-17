import { Link } from 'react-router-dom';
import {
  DollarSign,
  Clock,
  AlertCircle,
  TrendingUp,
  UploadCloud,
  ArrowRight,
  ShieldAlert,
  Building,
  Receipt
} from 'lucide-react';
import { useReceipts } from '../../context/ReceiptContext';
import StatCard from '../../components/StatCard/StatCard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import styles from './EmployeeDashboard.module.css';

export const EmployeeDashboard = () => {
  const { history, monthlySpent, monthlyLimit } = useReceipts();

  // Compute stat metrics
  const totalReimbursed = history
    .filter(item => item.result.status === 'APPROVED')
    .reduce((acc, curr) => acc + (curr.result.reimbursement_amount || 0), 0);

  const pendingCount = history.filter(
    item => item.result.status === 'PENDING_APPROVAL' || item.result.status === 'FLAGGED'
  ).length;

  const rejectedCount = history.filter(
    item => item.result.status === 'REJECTED'
  ).length;

  const remainingBudget = Math.max(0, monthlyLimit - monthlySpent);

  // Last 3 submissions
  const recentSubmissions = history.slice(0, 3);

  return (
    <div className={styles.dashboard}>
      <div className={styles.welcomeBanner}>
        <div className={styles.welcomeText}>
          <h2 className={styles.greeting}>Your expenses, at a glance</h2>
          <p className={styles.subgreeting}>
            Receipts in, reimbursements moving. Here’s what needs your attention.
          </p>
        </div>
        <Link to="/submit" className={styles.ctaButton}>
          <UploadCloud size={18} />
          <span>Add a receipt</span>
        </Link>
      </div>

      <div className={styles.sectionIntro}>
        <h3 className={styles.sectionTitle}>This month</h3>
        <span>A quick read on your expense activity</span>
      </div>

      <div className={styles.statsGrid}>
        <StatCard
          title="Total Reimbursed"
          value={`$${totalReimbursed.toFixed(2)}`}
          subtitle="Approved so far"
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="In review"
          value={`${pendingCount} receipts`}
          subtitle="Awaiting manager review"
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Rejected"
          value={`${rejectedCount} receipts`}
          subtitle="Open the review notes to see why"
          icon={AlertCircle}
          variant="danger"
        />
        <StatCard
          title="Monthly Limit"
          value={`$${monthlyLimit.toFixed(2)}`}
          subtitle={`$${remainingBudget.toFixed(2)} remaining`}
          icon={TrendingUp}
          variant="primary"
        />
      </div>

      <div className={styles.policyBanner}>
        <ShieldAlert size={22} className={styles.policyIcon} />
        <div className={styles.policyContent}>
          <span className={styles.policyTitle}>A heads-up on expense rules</span>
          <span>Each receipt is checked against these limits. Anything outside them can be reviewed by your team.</span>
          <div className={styles.policyRules}>
            <span className={styles.policyRuleTag}>NYC Meals Cap: $100</span>
            <span className={styles.policyRuleTag}>SF Meals Cap: $90</span>
            <span className={styles.policyRuleTag}>Other Cities: $75</span>
            <span className={styles.policyRuleTag}>Auto-Flag Alcohol & Entertainment</span>
            <span className={styles.policyRuleTag}>Manager Approval &gt; $200</span>
            <span className={styles.policyRuleTag}>Zero Duplicates</span>
          </div>
        </div>
      </div>

      <div className={styles.activityCard}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Recent Activity</h3>
          <Link to="/expenses" className={styles.viewAllLink}>
            <span>All expenses ({history.length})</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {recentSubmissions.length === 0 ? (
          <div className={styles.emptyState}>
            <Receipt size={40} />
            <p>No receipts here yet. When you add one, its review and reimbursement status will show up here.</p>
            <Link to="/submit" className={styles.emptyAction}>Add your first receipt <ArrowRight size={15} /></Link>
          </div>
        ) : (
          <div className={styles.activityList}>
            {recentSubmissions.map(item => (
              <div key={item.id} className={styles.activityItem}>
                <div className={styles.activityLeft}>
                  <div className={styles.vendorIcon}>
                    <Building size={20} />
                  </div>
                  <div className={styles.activityMeta}>
                    <span className={styles.vendorName}>{item.receipt.vendor || 'Unknown Vendor'}</span>
                    <div className={styles.activitySub}>
                      <span>{item.receipt.date || 'No Date'}</span>
                      <span>•</span>
                      <span className={styles.tag}>{item.category || 'General'}</span>
                      <span>•</span>
                      <span>{item.city}</span>
                    </div>
                    {item.result.flags && item.result.flags.length > 0 && (
                      <div className={styles.flagsList}>
                        {item.result.flags.map((flag, idx) => (
                          <span key={idx} className={styles.flagNotice}>
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.activityRight}>
                  <span className={styles.amount}>
                    ${item.receipt.total_amount ? item.receipt.total_amount.toFixed(2) : '0.00'}
                  </span>
                  <StatusBadge status={item.result.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;

