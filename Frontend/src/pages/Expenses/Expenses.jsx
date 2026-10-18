import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  Plus,
  Search,
  Eye,
  X,
  Receipt
} from 'lucide-react';
import { useReceipts } from '../../context/ReceiptContext';
import { exportCSV } from '../../services/api';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import tableStyles from '../../components/Table/Table.module.css';
import styles from './Expenses.module.css';

const formatCurrency = (amount, currency = 'INR') => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amount) || 0);
  } catch {
    return `${Number(amount) || 0} ${currency}`;
  }
};

export const Expenses = () => {
  const { history } = useReceipts();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Filter items
  const filteredHistory = history.filter(item => {
    const matchesSearch =
      (item.receipt.vendor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.city || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || item.result.status === statusFilter;

    const matchesCategory =
      categoryFilter === 'ALL' || item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalIncurred = history.reduce(
    (acc, curr) => acc + (curr.receipt.base_amount_inr ?? curr.receipt.total_amount ?? 0),
    0
  );

  const totalReimbursed = history
    .filter(item => ['APPROVED', 'PARTIAL'].includes(item.result.status))
    .reduce((acc, curr) => acc + (curr.result.reimbursement_amount || 0), 0);

  const totalPending = history
    .filter(
      item =>
        item.result.status === 'PENDING_APPROVAL' || item.result.status === 'FLAGGED'
    )
    .reduce((acc, curr) => acc + (curr.receipt.base_amount_inr ?? curr.receipt.total_amount ?? 0), 0);

  const handleExportCSV = async () => {
    try {
      await exportCSV();
    } catch (err) {
      console.error('CSV export failed:', err);
      window.alert(err.message || 'Could not export receipts from the backend.');
    }
  };

  return (
    <div className={styles.container}>
      {/* Top Header Bar */}
      <div className={styles.topBar}>
        <div className={styles.titleArea}>
          <h2 className={styles.pageTitle}>All Expense Records</h2>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.exportBtn}
            onClick={handleExportCSV}
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <Link to="/submit" className={styles.newExpenseBtn}>
            <Plus size={16} />
            <span>Submit Receipt</span>
          </Link>
        </div>
      </div>

      {/* Stats Summary Strip */}
      <div className={styles.statsStrip}>
        <div className={styles.statMiniCard}>
          <span className={styles.statMiniLabel}>Total Submissions</span>
          <span className={styles.statMiniValue}>{history.length}</span>
        </div>
        <div className={styles.statMiniCard}>
          <span className={styles.statMiniLabel}>Total Incurred (INR)</span>
          <span className={styles.statMiniValue}>{formatCurrency(totalIncurred)}</span>
        </div>
        <div className={styles.statMiniCard}>
          <span className={styles.statMiniLabel}>Total Approved (INR)</span>
          <span className={styles.statMiniValue}>{formatCurrency(totalReimbursed)}</span>
        </div>
        <div className={styles.statMiniCard}>
          <span className={styles.statMiniLabel}>Pending In Review (INR)</span>
          <span className={styles.statMiniValue}>{formatCurrency(totalPending)}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search vendor, city, or purpose..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="APPROVED">Approved</option>
          <option value="PARTIAL">Partial Reimbursement</option>
          <option value="FLAGGED">Flagged</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <select
          className={styles.filterSelect}
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="ALL">All Categories</option>
          <option value="Meals">Meals</option>
          <option value="Travel">Travel</option>
          <option value="Lodging">Lodging</option>
          <option value="Office Supplies">Office Supplies</option>
          <option value="Software">Software</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Custom Clean HTML Table */}
      <div className={tableStyles.tableWrapper}>
        <table className={tableStyles.table}>
          <thead className={tableStyles.tableHead}>
            <tr>
              <th className={tableStyles.th}>Date</th>
              <th className={tableStyles.th}>Vendor & Category</th>
              <th className={tableStyles.th}>City</th>
              <th className={tableStyles.thRight}>Amount</th>
              <th className={tableStyles.th}>Status</th>
              <th className={tableStyles.thRight}>Actions</th>
            </tr>
          </thead>
          <tbody className={tableStyles.tbody}>
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className={tableStyles.emptyState}>
                    <Receipt className={tableStyles.emptyIcon} />
                    <h4 className={tableStyles.emptyTitle}>No matching expenses found</h4>
                    <p className={tableStyles.emptyText}>
                      Try adjusting your filters or upload a new receipt to record an expense.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredHistory.map(item => (
                <tr key={item.id} className={tableStyles.tr}>
                  <td className={tableStyles.tdMuted}>
                    {item.receipt.date || 'N/A'}
                  </td>
                  <td className={tableStyles.td}>
                    <div className={tableStyles.vendorCell}>
                      <span className={tableStyles.vendorName}>
                        {item.receipt.vendor || 'Unknown Merchant'}
                      </span>
                      <span className={tableStyles.vendorSub}>
                        {item.category || 'General'}
                        {item.client_name ? ` • ${item.client_name}` : ''}
                      </span>
                    </div>
                  </td>
                  <td className={tableStyles.tdMuted}>
                    {item.city || 'Standard'}
                  </td>
                  <td className={tableStyles.tdAmount}>
                    {formatCurrency(item.receipt.base_amount_inr ?? item.receipt.total_amount, 'INR')}
                  </td>
                  <td className={tableStyles.td}>
                    <StatusBadge status={item.result.status} />
                  </td>
                  <td className={tableStyles.tdActions}>
                    <button
                      type="button"
                      className={tableStyles.actionButton}
                      onClick={() => setSelectedReceipt(item)}
                    >
                      <Eye size={14} />
                      <span>Details</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Inspect Details Modal */}
      {selectedReceipt && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className={styles.modalCard}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Receipt Audit Details</h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setSelectedReceipt(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Merchant / Vendor</span>
                <span className={styles.detailValue}>
                  {selectedReceipt.receipt.vendor || 'Unknown'}
                </span>
              </div>

              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Transaction Date</span>
                <span className={styles.detailValue}>
                  {selectedReceipt.receipt.date || 'N/A'}
                </span>
              </div>

              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Total Incurred</span>
                <span className={styles.detailValue}>
                  {formatCurrency(selectedReceipt.receipt.base_amount_inr ?? selectedReceipt.receipt.total_amount, 'INR')}
                </span>
              </div>

              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Approved Reimbursement</span>
                <span className={styles.detailValue}>
                  {formatCurrency(selectedReceipt.result.reimbursement_amount, 'INR')}
                </span>
              </div>

              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>City & Category</span>
                <span className={styles.detailValue}>
                  {selectedReceipt.city} • {selectedReceipt.category}
                </span>
              </div>

              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Policy Status</span>
                <StatusBadge status={selectedReceipt.result.status} />
              </div>

              {selectedReceipt.result.status === 'REJECTED' && selectedReceipt.result.explanation && (
                <div className={styles.reasonBlock}>
                  <span className={styles.detailLabel}>Why this receipt was rejected</span>
                  <p>{selectedReceipt.result.explanation}</p>
                </div>
              )}

              {/* Policy Flags */}
              {selectedReceipt.result.flags &&
                selectedReceipt.result.flags.length > 0 && (
                  <div>
                    <span className={styles.detailLabel}>Compliance Warnings</span>
                    <div className={styles.warningBlock}>
                      {selectedReceipt.result.flags.map((flag, idx) => (
                        <div key={idx} className={styles.warningText}>
                          • {flag}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Line Items */}
              {selectedReceipt.receipt.line_items &&
                selectedReceipt.receipt.line_items.length > 0 && (
                  <div>
                    <span className={styles.detailLabel}>Itemized Breakdown</span>
                    <div className={styles.itemsList}>
                      {selectedReceipt.receipt.line_items.map((li, idx) => (
                        <div key={idx} className={styles.itemEntry}>
                          <span>{li.description}</span>
                          <span>{formatCurrency(Number(li.amount || 0) * Number(selectedReceipt.receipt.exchange_rate || 1), 'INR')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.modalCloseAction}
                onClick={() => setSelectedReceipt(null)}
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;

