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

const STATUS_COLORS = {
  APPROVED: '#10B981',
  FLAGGED: '#F59E0B',
  PENDING_APPROVAL: '#EAB308',
  REJECTED: '#EF4444'
};

export const AdminAnalytics = () => {
  const { history, monthlySpent, monthlyLimit } = useReceipts();

  // Aggregate category spend
  const categoryMap = {};
  history.forEach(item => {
    const cat = item.category || 'General';
    const amt = item.receipt.total_amount || 0;
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
      color: STATUS_COLORS[st] || '#6B7280'
    }));

  const totalSpend = history.reduce(
    (acc, curr) => acc + (curr.receipt.total_amount || 0),
    0
  );

  const approvedCount = history.filter(
    item => item.result.status === 'APPROVED'
  ).length;

  const approvalRate =
    history.length > 0
      ? Math.round((approvedCount / history.length) * 100)
      : 0;

  const avgReceipt =
    history.length > 0 ? (totalSpend / history.length).toFixed(2) : '0.00';

  const handleExportCSV = async () => {
    try {
      exportCSV(history);
    } catch (err) {
      console.error('Failed to export CSV from analytics:', err);
    }
  };

  return (
    <div className={styles.container}>
      {/* Top Header Card */}
      <div className={styles.topBar}>
        <div className={styles.titleArea}>
          <h2 className={styles.pageTitle}>Admin Spend Analytics & Compliance</h2>
          <p className={styles.pageSubtitle}>
            Aggregated corporate reimbursement breakdown, policy compliance health, and visual category trends.
          </p>
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
          <h3 className={styles.metricValue}>${totalSpend.toFixed(2)}</h3>
          <span className={styles.metricSub}>Across {history.length} submitted receipts</span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Policy Approval Rate</span>
          <h3 className={styles.metricValue}>{approvalRate}%</h3>
          <span className={styles.metricSub}>{approvedCount} of {history.length} instantly clean</span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Average Receipt</span>
          <h3 className={styles.metricValue}>${avgReceipt}</h3>
          <span className={styles.metricSub}>Mean transaction value</span>
        </div>

        <div className={styles.metricCard}>
          <span className={styles.metricLabel}>Budget Cycle Utilization</span>
          <h3 className={styles.metricValue}>
            {Math.min(100, Math.round((monthlySpent / monthlyLimit) * 100))}%
          </h3>
          <span className={styles.metricSub}>
            ${monthlySpent.toFixed(2)} of ${monthlyLimit} limit
          </span>
        </div>
      </div>

      {/* Recharts Data Visualizations */}
      <div className={styles.chartsGrid}>
        {/* Bar Chart: Spend by Category */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.chartTitle}>Spend by Category</h3>
              <p className={styles.chartDesc}>Total dollar volume distributed across departments</p>
            </div>
            <CreditCard size={20} color="#4F46E5" />
          </div>

          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryChartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#CBD5E1' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={val => `$${val}`}
                />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Spend']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar
                  dataKey="spend"
                  fill="#4F46E5"
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
            <CheckCircle size={20} color="#10B981" />
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
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ paddingTop: '16px' }}
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
                <span className={styles.categoryTotal}>${cat.spend.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;

