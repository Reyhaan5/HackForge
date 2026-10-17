import { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Receipt,
  CheckCheck
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { useReceipts } from '../../context/ReceiptContext';
import styles from './AdminQueue.module.css';

const formatCurrency = (amount, currency = 'USD') => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amount) || 0);
  } catch {
    return `${Number(amount) || 0} ${currency}`;
  }
};

export const AdminQueue = () => {
  const { history, policyRules } = useReceipts();

  // Find all receipts pending approval or flagged
  const queueItems = history.filter(
    item =>
      item.result.status === 'PENDING_APPROVAL' ||
      item.result.status === 'FLAGGED'
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [managerNotes, setManagerNotes] = useState('');

  // Selected item
  const currentItem = queueItems[selectedIndex] || queueItems[0] || null;

  return (
    <div className={styles.container}>
      {/* Header Card */}
      <div className={styles.headerCard}>
        <div className={styles.titleArea}>
          <h2 className={styles.title}>Manager Approval Queue</h2>
          <p className={styles.subtitle}>
            Review receipts flagged by backend policy checks{policyRules?.approval_threshold != null ? `, including the $${Number(policyRules.approval_threshold).toFixed(2)} approval threshold` : ''}.
          </p>
        </div>
        <div className={styles.badgePending}>
          <ShieldAlert size={16} />
          <span>{queueItems.length} Receipts Need Attention</span>
        </div>
      </div>

      {queueItems.length === 0 ? (
        <div className={styles.emptyQueue}>
          <CheckCheck className={styles.emptyIcon} />
          <h3 className={styles.emptyTitle}>Graveyard is Completely Cleared!</h3>
          <p className={styles.emptyDesc}>
            All employee receipts have been evaluated, audited, and resolved. Great job keeping company records compliant!
          </p>
        </div>
      ) : (
        <>
          {/* Queue Item Switcher Tabs */}
          <div className={styles.queueStrip}>
            {queueItems.map((item, idx) => (
              <div
                key={item.id}
                className={`${styles.queueCard} ${idx === selectedIndex ? styles.queueCardActive : ''}`}
                onClick={() => {
                  setSelectedIndex(idx);
                  setManagerNotes('');
                }}
              >
                <span className={styles.queueCardVendor}>
                  {item.receipt.vendor || 'Unknown Vendor'}
                </span>
                <div className={styles.queueCardSub}>
                  <span>{item.city}</span>
                  <span className={styles.queueCardAmount}>
                    {formatCurrency(item.receipt.total_amount, item.receipt.currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Split-screen layout (CSS Grid: 1fr 1fr) */}
          {currentItem && (
            <div className={styles.splitGrid}>
              {/* Left Side: Scrollable View of Receipt Image */}
              <div className={styles.imagePanel}>
                <div className={styles.panelHeader}>
                  <div className={styles.panelTitle}>
                    <FileText size={18} />
                    <span>Receipt Document Artifact</span>
                  </div>
                  <StatusBadge status={currentItem.result.status} />
                </div>

                <div className={styles.imageScrollArea}>
                  {currentItem.imageUrl ? (
                    <img
                      src={currentItem.imageUrl}
                      alt="Scanned receipt visual"
                      className={styles.receiptImg}
                    />
                  ) : (
                    /* Simulated High-Fidelity Paper Receipt */
                    <div className={styles.simulatedReceipt}>
                      <div className={styles.simHeader}>
                        <h4 className={styles.simVendor}>{currentItem.receipt.vendor || 'MERCHANT RECEIPT'}</h4>
                        <div className={styles.simMeta}>
                          Date: {currentItem.receipt.date || '2026-10-17'} • {currentItem.city}
                        </div>
                        <div className={styles.simMeta}>
                          Category: {currentItem.category}
                        </div>
                      </div>

                      <div className={styles.simLines}>
                        {currentItem.receipt.line_items && currentItem.receipt.line_items.length > 0 ? (
                          currentItem.receipt.line_items.map((line, lidx) => (
                            <div key={lidx} className={styles.simLineRow}>
                              <span>{line.description}</span>
                              <span>${(line.amount || 0).toFixed(2)}</span>
                            </div>
                          ))
                        ) : (
                          <div className={styles.simLineRow}>
                            <span>Subtotal Items</span>
                            <span>{formatCurrency(currentItem.receipt.total_amount, currentItem.receipt.currency)}</span>
                          </div>
                        )}
                      </div>

                      <div className={styles.simTotalRow}>
                        <span>TOTAL PAID</span>
                        <span>
                          {formatCurrency(currentItem.receipt.total_amount, currentItem.receipt.currency)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Extracted data, flags, and buttons */}
              <div className={styles.dataPanel}>
                <div className={styles.panelTitle}>
                  <Receipt size={18} />
                  <span>Audited Extraction & Policy Checks</span>
                </div>

                {/* Metadata Breakdown */}
                <div className={styles.metaBlock}>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Merchant Vendor</span>
                    <span className={styles.metaValue}>{currentItem.receipt.vendor}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Expense Date</span>
                    <span className={styles.metaValue}>{currentItem.receipt.date}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Location & Category</span>
                    <span className={styles.metaValue}>
                      {currentItem.city} • {currentItem.category}
                    </span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Client / Purpose</span>
                    <span className={styles.metaValue}>
                      {currentItem.client_name || 'Standard Corporate Expense'}
                    </span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Total Incurred</span>
                    <span className={styles.metaValue}>
                      {formatCurrency(currentItem.receipt.total_amount, currentItem.receipt.currency)}
                    </span>
                  </div>
                </div>

                {/* Validation Flags Alert Card */}
                {currentItem.result.flags && currentItem.result.flags.length > 0 ? (
                  <div className={styles.flagsCard}>
                    <div className={styles.flagsHeading}>
                      <AlertTriangle size={18} />
                      <span>Flagged Compliance Exceptions</span>
                    </div>
                    <div className={styles.flagsList}>
                      {currentItem.result.flags.map((flag, idx) => (
                        <div key={idx} className={styles.flagBullet}>
                          <span>•</span>
                          <span>{flag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={styles.metaBlock}>
                    <span className={styles.metaLabel}>No policy violations detected.</span>
                  </div>
                )}

                {/* Manager Notes */}
                <div className={styles.notesGroup}>
                  <label className={styles.notesLabel}>Manager Audit Remarks</label>
                  <textarea
                    className={styles.notesInput}
                    placeholder="The backend does not currently accept audit notes."
                    value={managerNotes}
                    onChange={e => setManagerNotes(e.target.value)}
                    disabled
                  />
                </div>

                {/* Action Buttons */}
                <p className={styles.unsupportedNotice} role="note">
                  Approval and rejection are read-only here. The backend currently has no endpoint to save status changes or manager notes.
                </p>
                <div className={styles.actionsBar}>
                  <button type="button" className={styles.approveButton} disabled title="No backend status update endpoint">
                    <CheckCircle2 size={18} />
                    <span>Approve Expense</span>
                  </button>

                  <button type="button" className={styles.rejectButton} disabled title="No backend status update endpoint">
                    <XCircle size={18} />
                    <span>Reject Expense</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminQueue;

