import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Download,
  CreditCard,
  CheckCircle
} from 'lucide-react';
import { useReceipts } from '../../context/ReceiptContext';
import { exportCSV } from '../../services/api';
import styles from './AdminAnalytics.module.css';

const formatINR=amount => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount) || 0);

const STATUS_COLORS = {
  APPROVED: 'var(--status-approved-accent)',
  PARTIAL: 'var(--status-partial-accent)',
  FLAGGED: 'var(--status-partial-accent)',
  PENDING_APPROVAL: 'var(--status-pending-accent)',
  REJECTED: 'var(--status-rejected-accent)'
};

export const AdminAnalytics = () => {
  const { history, monthlySpent }=useReceipts();

  // Aggregate category spend
  const categoryMap = {};
  history.forEach(item => {
    const cat = item.category || 'General';
    const amt=item.receipt.base_amount_inr ?? item.result.reimbursement_amount ?? 0;
    if (!categoryMap[cat]) {
      categoryMap[cat] = { total: 0, count: 0 };
    }
    categoryMap[cat].total += amt;
    categoryMap[cat].count += 1;
  });

  const categoryChartData = Object.keys(categoryMap).map(cat => ({
    category: cat,
    spend: parseFloat(categoryMap[cat].total.toFixed(2)),
    count: categoryMap[cat].count
  }));

  // Aggregate status distribution
  const statusMap = {
    APPROVED: 0,
    FLAGGED: 0,
    PENDING_APPROVAL: 0,
    REJECTED: 0
  };

  history.forEach(item => {
    const st = item.result.status;
    if (statusMap[st] !== undefined) {
      statusMap[st] += 1;
    } else {
      statusMap[st] = 1;
    }
  });

  const pieChartData = Object.keys(statusMap)
    .filter(st => statusMap[st] > 0)
    .map(st => ({
      name:
        st === 'PENDING_APPROVAL'
          ? 'Pending Approval'
          : st.charAt(0) + st.slice(1).toLowerCase(),
      value: statusMap[st],
      color: STATUS_COLORS[st] || 'var(--text-secondary)'
    }));

  const totalSpend = history.reduce(
    (acc, curr) => acc + (curr.receipt.base_amount_inr ?? curr.result.reimbursement_amount ?? 0),
    0
  );

  const approvedCount = history.filter(
    item => ['APPROVED', 'PARTIAL'].includes(item.result.status)
  ).length;

  const approvalRate =
    history.length > 0
      ? Math.round((approvedCount / history.length) * 100)
      : 0;

  const avgReceipt =
    history.length > 0 ? (totalSpend / history.length).toFixed(2) : '0.00';

  const handleExportCSV = async () => {
    try {
      await exportCSV();
    } catch (err) {
      console.error('Failed to export CSV from analytics:', err);
      window.alert(err.message || 'Could not export receipts from the backend.');
    }
  };

  return (
    <div className={styles.container}>
      {/* Top Header Card */}
      <div className={styles.topBar}>
        <div className={styles.titleArea}>
          <h2 className={styles.pageTitle}>Admin Spend Analytics & Compliance</h2>
        </div>

        <button
          type="button"
          className={styles.exportBtn}
          onClick={handleExportCSV}
        >
          <Download size={16} />
          <span>Export to CSV</span>
        </button>
      </div>

      {/* KPI Metrics */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Total Spend Incurred</span>
          <h3 className={styles.metricValue}>{formatINR(totalSpend)}</h3>
          <span className={styles.metricSub}>Across {history.length} submitted receipts</span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Policy Approval Rate</span>
          <h3 className={styles.metricValue}>{approvalRate}%</h3>
          <span className={styles.metricSub}>{approvedCount} of {history.length} approved or partially reimbursable</span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Average Receipt</span>
          <h3 className={styles.metricValue}>{formatINR(totalSpend / Math.max(history.length, 1))}</h3>
          <span className={styles.metricSub}>Mean transaction value</span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Company Spend This Month (INR)</span>
          <h3 className={styles.metricValue}>{formatINR(monthlySpent)}</h3>
          <span className={styles.metricSub}>Current-month policy spend across employees</span>
        </div>
      </div>

      {/* Recharts Data Visualizations */}
      <div className={styles.chartsGrid}>
        {/* Bar Chart: Spend by Category */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Spend by Category</h3>
          <p className={styles.chartDesc}>Receipt totals converted to INR by the backend</p>
            </div>
            <CreditCard size={20} color="var(--primary-color)" />
          </div>

          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryChartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-color)' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={val => formatINR(val)}
                />
                <Tooltip
                  formatter={value => [formatINR(value), 'Spend']}
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar
                  dataKey="spend"
                  fill="var(--primary-color)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Status Distribution */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Status Distribution</h3>
              <p className={styles.chartDesc}>Audit compliance and review workload ratio</p>
            </div>
            <CheckCircle size={20} color="var(--success-color)" />
          </div>

          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${value} receipts`, name]}
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ paddingTop: '16px', color: 'var(--text-secondary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Spend Table */}
      <div className={styles.summaryCard}>
        <h3 className={styles.summaryTitle}>Category Performance Ledger</h3>
        <div className={styles.categoryList}>
          {categoryChartData.map(cat => (
            <div key={cat.category} className={styles.categoryRow}>
              <span className={styles.categoryName}>{cat.category}</span>
              <div className={styles.categoryMeta}>
                <span className={styles.categoryCount}>
                  {cat.count} {cat.count === 1 ? 'receipt' : 'receipts'}
                </span>
                <span className={styles.categoryTotal}>₹{cat.spend.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;

