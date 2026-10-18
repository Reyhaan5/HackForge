import { Link } from 'react-router-dom';
import {
  DollarSign,
  Clock,
  AlertCircle,
  TrendingUp,
  UploadCloud,
  ArrowRight,
  Receipt,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useReceipts } from '../../context/ReceiptContext';
import StatCard from '../../components/StatCard/StatCard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import styles from './EmployeeDashboard.module.css';

const formatINR=amount => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(Number(amount) || 0);

export const EmployeeDashboard = () => {
  const { user, history, monthlySpent, monthlyLimit, policyRules }=useReceipts();

  // Compute stat metrics
  const totalReimbursed = history
    .filter(item => ['APPROVED', 'PARTIAL'].includes(item.result?.status))
    .reduce((acc, curr) => acc + (curr.result?.reimbursement_amount || curr.result?.approved_amount || 0), 0);

  const pendingCount = history.filter(
    item => item.result?.status === 'PENDING_APPROVAL' || item.result?.status === 'FLAGGED'
  ).length;

  const rejectedCount = history.filter(
    item => item.result?.status === 'REJECTED'
  ).length;

  const remainingBudget = Math.max(0, monthlyLimit - monthlySpent);
  const budgetPercent=Math.min(100, Math.round((monthlySpent / (monthlyLimit || 1)) * 100));

  const todayBuddy=new Date().toISOString().slice(0, 10);
  const todayMeals=history.filter(item => item.category === 'Meals' && item.receipt?.date === todayBuddy);
  const trackedCity=todayMeals[0]?.city || 'Default';
  const cityDailyCap=Number(policyRules?.city_daily_caps?.[trackedCity] ?? policyRules?.city_daily_caps?.Default ?? 6263);
  const cityTodaySpent=todayMeals
    .filter(item => item.city === trackedCity)
    .reduce((acc, curr) => acc + (Number(curr.receipt?.base_amount_inr ?? curr.receipt?.total_amount) || 0), 0);
  const cityPercent=Math.min(100, Math.round((cityTodaySpent / (cityDailyCap || 1)) * 100));

  // Last 8 submissions for the Live Feed Table
  const recentSubmissions=history.slice(0, 8);

  return (
    <div className={styles.dashboard}>
      {/* Header Banner */}
      <div className={styles.welcomeBanner}>
        <div className={styles.welcomeText}>
          <h1 className={styles.greeting}>Your expenses, at a glance</h1>
        </div>
        <Link to="/submit" className={styles.ctaButton}>
          <UploadCloud size={18} />
          <span>Add a receipt</span>
        </Link>
      </div>

      {/* High-Level Month Stat Figures */}
      <div className={styles.statsGrid}>
        <StatCard
          title="Total Reimbursed"
          value={formatINR(totalReimbursed)}
          subtitle="Cleared & approved"
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="In review"
          value={`${pendingCount} receipts`}
          subtitle="Forwarded to admin queue"
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Rejected / Flagged"
          value={`${rejectedCount} receipts`}
          subtitle="Policy exceptions flagged"
          icon={AlertCircle}
          variant="danger"
        />
        <StatCard
          title="Monthly Limit"
          value={formatINR(monthlyLimit)}
          subtitle={`${formatINR(remainingBudget)} remaining`}
          icon={TrendingUp}
          variant="primary"
        />
      </div>

      {/* 2-Column Split: Section 2 Live Feed Table (Left/Center) + Section 3 Policy Tracker (Right Sidebar) */}
      <div className={styles.mainContentGrid}>
        {}
        <section className={styles.liveFeedCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderTitleGroup}>
              <h2 className={styles.sectionHeading}>Live Feed</h2>
              <span className={styles.sectionSubtitle}>
                Recently uploaded receipts with real-time audit match and compliance status
              </span>
            </div>
            <Link to="/expenses" className={styles.viewAllLink}>
              <span>All expenses ({history.length})</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {recentSubmissions.length === 0 ? (
            <div className={styles.emptyState}>
              <Receipt size={38} className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>No receipts logged yet</p>
              <p className={styles.emptyText}>
                When you or teammates submit a receipt, its line items, policy clearances, and amounts appear here live.
              </p>
              <Link to="/submit" className={styles.emptyActionButton}>
                Submit your first receipt <ArrowRight size={14} />
              </Link>
            </div>
          ):(
            <div className={styles.tableWrapper}>
              <table className={styles.feedTable}>
                <thead>
                  <tr>
                    <th>STATUS</th>
                    <th>MERCHANT & DETAILS</th>
                    <th className={styles.thRight}>AMOUNT</th>
                    <th>POLICY MATCH</th>
                    <th className={styles.thAction}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSubmissions.map((item) => {
                    const status=item.result?.status || 'PENDING_APPROVAL';
                    const isApproved=status === 'APPROVED';
                    const isPartial=status === 'PARTIAL';
                    const isViolated=status === 'REJECTED' || (item.result?.flags && item.result.flags.some(f => f.toLowerCase().includes('duplicate') || f.toLowerCase().includes('alcohol')));

                    let matchBadgeClass = styles.matchPillClear;
                    let matchLabel='100% Policy Match';

                    if (isViolated) {
                      matchBadgeClass=styles.matchPillDanger;
                      matchLabel=item.result?.flags?.[0] || 'Violation Detected';
                    } else if (isPartial || item.result?.flags?.length > 0) {
                      matchBadgeClass=styles.matchPillWarn;
                      matchLabel=item.result?.flags?.[0] || 'Requires Review';
                    } else if (status === 'PENDING_APPROVAL') {
                      matchBadgeClass=styles.matchPillPending;
                      matchLabel='In Admin Queue';
                    }

                    const formattedAmount=new Intl.NumberFormat(undefined, {
                      style: 'currency',
                      currency: 'INR'
                    }).format(Number(item.receipt?.base_amount_inr ?? item.receipt?.total_amount) || 0);

                    return (
                      <tr key={item.id} className={styles.feedRow}>
                        <td className={styles.tdStatus}>
                          <StatusBadge status={status} />
                        </td>
                        <td className={styles.tdMerchant}>
                          <div className={styles.merchantCell}>
                            <span className={styles.merchantName}>
                              {item.receipt?.vendor || 'Unknown Merchant'}
                            </span>
                            <div className={styles.merchantMeta}>
                              <span>{item.receipt?.date || 'Today'}</span>
                              <span className={styles.metaDot}>•</span>
                              <span>{item.category || 'Meals'}</span>
                              <span className={styles.metaDot}>•</span>
                              <span>{item.city || 'Default'}</span>
                              {item.channel && (
                                <>
                                  <span className={styles.metaDot}>•</span>
                                  <span className={styles.channelBadge}>{item.channel}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className={styles.tdAmount}>
                          <span className={styles.monoAmount}>{formattedAmount}</span>
                        </td>
                        <td className={styles.tdMatch}>
                          <span className={`${styles.matchPill} ${matchBadgeClass}`}>
                            {isApproved && <CheckCircle2 size={12} />}
                            {isViolated && <ShieldAlert size={12} />}
                            {matchLabel}
                          </span>
                        </td>
                        <td className={styles.tdAction}>
                          <Link
                            to="/expenses"
                            className={styles.inspectBtn}
                            title="Inspect itemized breakdown"
                          >
                            <span>Inspect</span>
                            <ChevronRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {}
        <aside className={styles.policyTrackerSidebar}>
          <div className={styles.trackerCard}>
            <div className={styles.trackerHeader}>
              <div className={styles.trackerTitleGroup}>
                <Shield className={styles.trackerHeaderIcon} size={18} />
                <h2 className={styles.sectionHeading}>Policy Tracker</h2>
              </div>
              <span className={styles.trackerSubheading}>Accumulating limits & policy caps</span>
            </div>

            {}
            <div className={styles.limitBlock}>
              <div className={styles.limitLabelRow}>
                <span className={styles.limitLabel}>Monthly Spend vs Cap</span>
                <span className={styles.monoCap}>
                  {formatINR(monthlySpent)} / {formatINR(monthlyLimit)}
                </span>
              </div>
              <div className={styles.progressBarTrack}>
                <div
                  className={`${styles.progressBarFill} ${budgetPercent > 90 ? styles.progressDanger:budgetPercent > 70 ? styles.progressWarn:styles.progressNormal}`}
                  style={{ width: `${budgetPercent}%` }}
                />
              </div>
              <div className={styles.limitFooter}>
                <span className={styles.progressPercent}>{budgetPercent}% utilized</span>
                <span className={styles.progressRemaining}>{formatINR(remainingBudget)} remaining</span>
              </div>
            </div>

            {}
            <div className={styles.limitBlock}>
              <div className={styles.limitLabelRow}>
                <span className={styles.limitLabel}>{trackedCity} Daily Per-Diem</span>
                <span className={styles.monoCap}>
                  {formatINR(cityTodaySpent)} / {formatINR(cityDailyCap)}
                </span>
              </div>
              <div className={styles.progressBarTrack}>
                <div
                  className={`${styles.progressBarFill} ${cityPercent > 90 ? styles.progressDanger:cityPercent > 70 ? styles.progressWarn:styles.progressNormal}`}
                  style={{ width: `${cityPercent}%` }}
                />
              </div>
              <div className={styles.limitFooter}>
                <span className={styles.progressPercent}>{cityPercent}% of daily allowance</span>
                <span className={styles.progressRemaining}>Auto-enforced</span>
              </div>
            </div>

            <div className={styles.divider} />

            {}
            <div className={styles.guardrailsSection}>
              <span className={styles.guardrailsTitle}>ACTIVE POLICY GUARDRAILS</span>
              <ul className={styles.guardrailsList}>
                <li className={styles.guardrailItem}>
                  <ShieldCheck size={14} className={styles.guardrailIconGreen} />
                  <span>NYC Meal: INR 8,350 | SF: INR 7,515 | Default: INR 6,263</span>
                </li>
                <li className={styles.guardrailItem}>
                  <ShieldCheck size={14} className={styles.guardrailIconGreen} />
                  <span>Single expense &gt; INR 16,700 routes to Manager</span>
                </li>
                <li className={styles.guardrailItem}>
                  <ShieldAlert size={14} className={styles.guardrailIconAmber} />
                  <span>Alcohol & tobacco: Non-reimbursable</span>
                </li>
                <li className={styles.guardrailItem}>
                  <ShieldAlert size={14} className={styles.guardrailIconRed} />
                  <span>Cross-employee duplicate hash defense</span>
                </li>
              </ul>
            </div>

            {}
            <div className={styles.routingBanner}>
              <div className={styles.routingIndicator}>
                <span className={styles.routingPulse} />
                <span className={styles.routingTitle}>Two-Stage Processing</span>
              </div>
              <p className={styles.routingText}>
                Employees drop receipts for automated ingestion; designated Admins review and smart-submit from the Admin Processing Queue.
              </p>
              {['Admin', 'Finance'].includes(user?.role) && (
                <Link to="/admin/process" className={styles.adminQueueLink}>
                  <span>Open Admin Intake Queue</span>
                  <ExternalLink size={13} />
                </Link>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
