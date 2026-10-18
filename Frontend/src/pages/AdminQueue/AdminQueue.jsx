import { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Receipt,
  CheckCheck,
  Camera
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import { useReceipts } from '../../context/ReceiptContext';
import styles from './AdminQueue.module.css';

const getFullImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http')) return url;
  return `http://localhost:8000${url.startsWith('/') ? '' : '/'}${url}`;
};

const formatCurrency = (amount, currency = 'USD') => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(amount) || 0);
  } catch {
    return `${Number(amount) || 0} ${currency}`;
  }
};

export const AdminQueue = () => {
  const { history, policyRules, updateReceiptStatus } = useReceipts();

  // Find all receipts pending approval or flagged
  const queueItems = history.filter(
    item =>
      item.result.status === 'PENDING_APPROVAL' ||
      item.result.status === 'FLAGGED'
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [managerNotes, setManagerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [viewMode, setViewMode] = useState('scanned'); // 'scanned' | 'simulated'

  // Selected item
  const currentItem = queueItems[selectedIndex] || queueItems[0] || null;

  const handleApprove = async () => {
    if (!currentItem || isSubmitting) return;
    setActionError('');
    setIsSubmitting(true);
    try {
      await updateReceiptStatus(currentItem.id, 'APPROVED', managerNotes);
      setManagerNotes('');
      if (selectedIndex >= queueItems.length - 1) {
        setSelectedIndex(Math.max(0, queueItems.length - 2));
      }
    } catch (err) {
      setActionError(err.response?.data?.detail || err.message || 'Could not save the approval. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!currentItem || isSubmitting) return;
    if (!managerNotes.trim()) {
      setActionError('Add a short reason so the employee understands why this receipt was rejected.');
      return;
    }
    setActionError('');
    setIsSubmitting(true);
    try {
      await updateReceiptStatus(currentItem.id, 'REJECTED', managerNotes);
      setManagerNotes('');
      if (selectedIndex >= queueItems.length - 1) {
        setSelectedIndex(Math.max(0, queueItems.length - 2));
      }
    } catch (err) {
      setActionError(err.response?.data?.detail || err.message || 'Could not save the rejection. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
                  setActionError('');
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
                <div style={{ marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {item.submission_channel === 'slack' ? '💬 Slack Bot' :
                   item.submission_channel === 'email' ? '✉️ Email Ingest' :
                   item.submission_channel === 'mobile' ? '📱 Mobile Cam' :
                   '🌐 Web Portal'}
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
                    <span>Receipt Artifact</span>
                  </div>

                  <div className={styles.artifactToggle}>
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${viewMode === 'scanned' ? styles.toggleBtnActive : ''}`}
                      onClick={() => setViewMode('scanned')}
                      title="View original uploaded photo"
                    >
                      <Camera size={14} />
                      <span>Original Photo</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${viewMode === 'simulated' ? styles.toggleBtnActive : ''}`}
                      onClick={() => setViewMode('simulated')}
                      title="View digital paper ledger"
                    >
                      <Receipt size={14} />
                      <span>Digital Ledger</span>
                    </button>
                  </div>

                  <StatusBadge status={currentItem.result.status} />
                </div>

                <div className={styles.imageScrollArea}>
                  {viewMode === 'scanned' ? (
                    getFullImageUrl(currentItem.imageUrl) ? (
                      <div className={styles.scannedImageWrap}>
                        <img
                          src={getFullImageUrl(currentItem.imageUrl)}
                          alt="Scanned receipt visual"
                          className={styles.receiptImg}
                        />
                      </div>
                    ) : (
                      <div className={styles.noScanNotice}>
                        <Camera size={44} className={styles.noScanIcon} />
                        <h4 className={styles.noScanTitle}>No Scanned Image File</h4>
                        <p className={styles.noScanSub}>This receipt was submitted without a binary image file or via quick preset.</p>
                        <button
                          type="button"
                          className={styles.switchModeBtn}
                          onClick={() => setViewMode('simulated')}
                        >
                          <Receipt size={14} />
                          <span>View Digitized Ledger</span>
                        </button>
                      </div>
                    )
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
                    <span className={styles.metaValue}>{currentItem.receipt.date || 'N/A'}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Ingested Timestamp</span>
                    <span className={styles.metaValue} style={{ color: 'var(--text-secondary)' }}>
                      {(() => {
                        if (!currentItem.timestamp) return 'N/A';
                        const s = String(currentItem.timestamp);
                        const d = s.endsWith('Z') || s.includes('+') ? new Date(s) : new Date(s + 'Z');
                        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        });
                      })()}
                    </span>
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
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Submitting Employee</span>
                    <span className={styles.metaValue}>{currentItem.employee_id || 'Employee'}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Intake Channel</span>
                    <span className={styles.metaValue}>
                      {currentItem.submission_channel === 'slack' ? '💬 Slack Bot (@Resolver thread)' :
                       currentItem.submission_channel === 'email' ? '✉️ Email Ingestion (receipts@company.com)' :
                       currentItem.submission_channel === 'mobile' ? '📱 Mobile Camera App' :
                       '🌐 Web Portal Upload'}
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
                  <label className={styles.notesLabel}>Reviewer notes (required to reject; optional to approve)</label>
                  <textarea
                    className={styles.notesInput}
                    placeholder="Provide reason for approval override or rejection reason..."
                    value={managerNotes}
                    onChange={e => setManagerNotes(e.target.value)}
                    disabled={isSubmitting}
                  />
                  {actionError && <p className={styles.actionError} role="alert">{actionError}</p>}
                </div>

                {/* Action Buttons */}
                <div className={styles.actionsBar}>
                  <button
                    type="button"
                    className={styles.approveButton}
                    onClick={handleApprove}
                    disabled={isSubmitting}
                  >
                    <CheckCircle2 size={18} />
                    <span>{isSubmitting ? 'Approving...' : 'Approve Expense'}</span>
                  </button>

                  <button
                    type="button"
                    className={styles.rejectButton}
                    onClick={handleReject}
                    disabled={isSubmitting}
                  >
                    <XCircle size={18} />
                    <span>{isSubmitting ? 'Rejecting...' : 'Reject Expense'}</span>
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

