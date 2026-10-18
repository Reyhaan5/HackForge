import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Scan,
  Globe,
  MessageSquare,
  Mail,
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  FileText,
  Receipt,
  User,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Eye,
  Check,
  X
} from 'lucide-react';
import { useReceipts } from '../../context/ReceiptContext';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import styles from './AdminProcess.module.css';

const CHANNELS=[
  { id: 'all', label: 'All Channels', icon: Filter },
  { id: 'web', label: 'Web Portal', icon: Globe },
  { id: 'slack', label: 'Slack Bot', icon: MessageSquare },
  { id: 'email', label: 'Email Ingestion', icon: Mail },
  { id: 'mobile', label: 'Mobile Camera', icon: Smartphone },
];

const getChannelDetails=(channelId) => {
  switch ((channelId || '').toLowerCase()) {
    case 'slack':
      return { label: 'Slack Bot', icon: MessageSquare, badgeClass: styles.channelSlack };
    case 'email':
      return { label: 'Email Ingest', icon: Mail, badgeClass: styles.channelEmail };
    case 'mobile':
      return { label: 'Mobile Cam', icon: Smartphone, badgeClass: styles.channelMobile };
    case 'web':
    default:
      return { label: 'Web Portal', icon: Globe, badgeClass: styles.channelWeb };
  }
};

export const AdminProcess=() => {
  const { history, updateReceiptStatus }=useReceipts();
  const [selectedChannel, setSelectedChannel]=useState('all');
  const [searchQuery, setSearchQuery]=useState('');
  const [selectedReceipt, setSelectedReceipt]=useState(null);
  const [managerNotes, setManagerNotes]=useState('');
  const [isSubmitting, setIsSubmitting]=useState(false);
  const [actionError, setActionError]=useState('');
  const [actionSuccess, setActionSuccess]=useState('');


  const filteredReceipts=useMemo(() => {
    return (history || []).filter(item => {

      if (selectedChannel !== 'all') {
        const itemChannel=(item.submission_channel || 'web').toLowerCase();
        if (itemChannel !== selectedChannel) return false;
      }


      if (searchQuery.trim()) {
        const q=searchQuery.toLowerCase();
        const vendor=(item.receipt?.vendor || '').toLowerCase();
        const emp=(item.employee_id || '').toLowerCase();
        const city=(item.city || '').toLowerCase();
        const channel=(item.submission_channel || '').toLowerCase();
        return vendor.includes(q) || emp.includes(q) || city.includes(q) || channel.includes(q);
      }
      return true;
    });
  }, [history, selectedChannel, searchQuery]);


  const channelCounts=useMemo(() => {
    const counts={ all: history.length, web: 0, slack: 0, email: 0, mobile: 0 };
    (history || []).forEach(r => {
      const ch=(r.submission_channel || 'web').toLowerCase();
      if (counts[ch] !== undefined) counts[ch]++;
      else counts.web++;
    });
    return counts;
  }, [history]);


  const handleApprove=async () => {
    if (!selectedReceipt || isSubmitting) return;
    setIsSubmitting(true);
    setActionError('');
    setActionSuccess('');
    try {
      await updateReceiptStatus(selectedReceipt.id, 'APPROVED', managerNotes);
      setActionSuccess(`Receipt from ${selectedReceipt.receipt?.vendor || 'Vendor'} approved successfully.`);
      setManagerNotes('');
      setSelectedReceipt(prev => prev ? {
        ...prev,
        result: { ...prev.result, status: 'APPROVED' }
      }:null);
    } catch (err) {
      setActionError(err.response?.data?.detail || err.message || 'Could not approve receipt.');
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleReject=async () => {
    if (!selectedReceipt || isSubmitting) return;
    if (!managerNotes.trim()) {
      setActionError('Please provide a rejection reason so the submitting employee understands the policy conflict.');
      return;
    }
    setIsSubmitting(true);
    setActionError('');
    setActionSuccess('');
    try {
      await updateReceiptStatus(selectedReceipt.id, 'REJECTED', managerNotes);
      setActionSuccess(`Receipt from ${selectedReceipt.receipt?.vendor || 'Vendor'} rejected.`);
      setManagerNotes('');
      setSelectedReceipt(prev => prev ? {
        ...prev,
        result: { ...prev.result, status: 'REJECTED' }
      }:null);
    } catch (err) {
      setActionError(err.response?.data?.detail || err.message || 'Could not reject receipt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {}
      <div className={styles.headerCard}>
        <div className={styles.titleArea}>
          <div className={styles.titleRow}>
            <Scan size={24} className={styles.titleIcon} />
            <h2 className={styles.title}>Admin Receipt Intake & Smart Processing</h2>
          </div>
        </div>

        <div className={styles.headerMetrics}>
          <div className={styles.metricBadge}>
            <span>Total Intake:</span>
            <strong>{history.length}</strong>
          </div>
          <div className={styles.metricBadgePending}>
            <span>Pending Audit:</span>
            <strong>{history.filter(r => ['PENDING_APPROVAL', 'FLAGGED'].includes(r.result?.status)).length}</strong>
          </div>
        </div>
      </div>

      {}
      {actionSuccess && (
        <div className={styles.successBanner}>
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess('')} className={styles.closeAlertBtn}>
            <X size={14} />
          </button>
        </div>
      )}
      {actionError && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={16} />
          <span>{actionError}</span>
          <button type="button" onClick={() => setActionError('')} className={styles.closeAlertBtn}>
            <X size={14} />
          </button>
        </div>
      )}

      {}
      <div className={styles.channelBar}>
        <div className={styles.channelTabs}>
          {CHANNELS.map(ch => {
            const Icon=ch.icon;
            const count=channelCounts[ch.id] || 0;
            const isActive=selectedChannel === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                className={`${styles.channelFilterBtn} ${isActive ? styles.channelFilterBtnActive:''}`}
                onClick={() => setSelectedChannel(ch.id)}
              >
                <Icon size={15} />
                <span>{ch.label}</span>
                <span className={styles.countBadge}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search vendor, employee, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {}
      <div className={styles.mainGrid}>
        
        {}
        <div className={styles.tableCard}>
          <div className={styles.tableCardHeader}>
            <h3 className={styles.cardHeading}>
              Incoming Submissions Queue
              {selectedChannel !== 'all' && ` (${selectedChannel.toUpperCase()})`}
            </h3>
            <span className={styles.cardSub}>
              Showing {filteredReceipts.length} of {history.length} receipts
            </span>
          </div>

          {filteredReceipts.length === 0 ? (
            <div className={styles.emptyWrap}>
              <Receipt size={40} className={styles.emptyIcon} />
              <h4>No receipts found</h4>
              <p>No submissions match the selected channel filter or search query.</p>
            </div>
          ):(
            <div className={styles.tableOverflow}>
              <table className={styles.queueTable}>
                <thead>
                  <tr>
                    <th>Channel Source</th>
                    <th>Submitting Employee</th>
                    <th>Vendor / Category</th>
                    <th>Date / City</th>
                    <th className={styles.alignRight}>Amount</th>
                    <th>Status</th>
                    <th className={styles.alignRight}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReceipts.map(item => {
                    const channelInfo=getChannelDetails(item.submission_channel);
                    const ChannelIcon=channelInfo.icon;
                    const isSelected=selectedReceipt?.id === item.id;

                    return (
                      <tr
                        key={item.id}
                        className={`${styles.tableRow} ${isSelected ? styles.tableRowSelected:''}`}
                        onClick={() => {
                          setSelectedReceipt(item);
                          setActionError('');
                          setActionSuccess('');
                        }}
                      >
                        {}
                        <td>
                          <span className={`${styles.channelPill} ${channelInfo.badgeClass}`}>
                            <ChannelIcon size={13} />
                            <span>{channelInfo.label}</span>
                          </span>
                        </td>

                        {}
                        <td>
                          <div className={styles.empCell}>
                            <User size={14} className={styles.empIcon} />
                            <span className={styles.empName}>{item.employee_id || 'Employee'}</span>
                          </div>
                        </td>

                        {}
                        <td>
                          <div className={styles.vendorCell}>
                            <span className={styles.vendorName}>{item.receipt?.vendor || 'Unknown'}</span>
                            <span className={styles.categorySub}>{item.category || 'General'}</span>
                          </div>
                        </td>

                        {}
                        <td>
                          <div className={styles.dateCell}>
                            <span>{item.receipt?.date || 'N/A'}</span>
                            <span className={styles.citySub}>{item.city || 'Default'}</span>
                          </div>
                        </td>

                        {}
                        <td className={styles.alignRight}>
                          <span className={styles.amountText}>
                            {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' }).format(Number(item.receipt?.base_amount_inr ?? item.receipt?.total_amount) || 0)}
                          </span>
                        </td>

                        {}
                        <td>
                          <StatusBadge status={item.result?.status} />
                        </td>

                        {}
                        <td className={styles.alignRight}>
                          <button
                            type="button"
                            className={styles.inspectBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReceipt(item);
                            }}
                          >
                            <Eye size={13} />
                            <span>Review</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.directIngestCard}>
          <div className={styles.directHeader}>
            <Sparkles size={18} className={styles.directIcon} />
            <h3 className={styles.cardHeading}>Submit a receipt</h3>
          </div>
          <Link to="/submit" className={styles.directSubmitBtn}>
            <Sparkles size={15} />
            <span>Open Smart Submit</span>
            <ArrowRight size={15} />
          </Link>
        </div>

      </div>

      {}
      {selectedReceipt && (
        <div className={styles.modalBackdrop} onClick={() => setSelectedReceipt(null)}>
          <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleBlock}>
                <Receipt size={20} />
                <span className={styles.modalTitle}>Receipt Audit Review</span>
                <span className={styles.modalReceiptId}>{selectedReceipt.id}</span>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setSelectedReceipt(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {}
              <div className={styles.modalLeftPane}>
                <div className={styles.modalChannelStrip}>
                  {(() => {
                    const info=getChannelDetails(selectedReceipt.submission_channel);
                    const Icon=info.icon;
                    return (
                      <span className={`${styles.channelPill} ${info.badgeClass}`}>
                        <Icon size={14} />
                        <span>Source Channel: {info.label}</span>
                      </span>
                    );
                  })()}
                  <span className={styles.modalEmpTag}>
                    Submitted by: <strong>{selectedReceipt.employee_id || 'EMP'}</strong>
                  </span>
                </div>

                <div className={styles.modalImageWrapper}>
                  {selectedReceipt.imageUrl ? (
                    <img
                      src={selectedReceipt.imageUrl}
                      alt="Uploaded receipt"
                      className={styles.modalImage}
                    />
                  ):(
                    <div className={styles.modalNoImage}>
                      <Receipt size={48} />
                      <span>Original physical scan</span>
                    </div>
                  )}
                </div>
              </div>

              {}
              <div className={styles.modalRightPane}>
                <div className={styles.statusRow}>
                  <StatusBadge status={selectedReceipt.result?.status} />
                  <span className={styles.approvedSum}>
                    Reimbursable: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(selectedReceipt.result?.reimbursement_amount ?? selectedReceipt.result?.approved_amount ?? selectedReceipt.receipt?.base_amount_inr ?? selectedReceipt.receipt?.total_amount ?? 0))}
                  </span>
                </div>

                {}
                {selectedReceipt.result?.flags?.length > 0 && (
                  <div className={styles.modalFlagsBox}>
                    <div className={styles.flagsHead}>
                      <AlertTriangle size={15} />
                      <span>Compliance Violations Detected:</span>
                    </div>
                    {selectedReceipt.result.flags.map((flag, idx) => (
                      <div key={idx} className={styles.flagLine}>
                        <span>•</span>
                        <span>{flag}</span>
                      </div>
                    ))}
                  </div>
                )}

                {}
                <div className={styles.lineItemsWrap}>
                  <h4 className={styles.subHeading}>Itemized Breakdown</h4>
                  <table className={styles.modalTable}>
                    <thead>
                      <tr>
                        <th>Line Description</th>
                        <th className={styles.alignRight}>Amount</th>
                        <th className={styles.alignRight}>Policy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedReceipt.receipt?.line_items || []).length > 0 ? (
                        selectedReceipt.receipt.line_items.map((line, idx) => (
                          <tr key={idx} className={line.disallowed ? styles.rowDisallowed:''}>
                            <td>{line.description || 'Expense item'}</td>
                            <td className={styles.alignRight}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(line.amount || 0) * Number(selectedReceipt.receipt?.exchange_rate || 1))}</td>
                            <td className={styles.alignRight}>
                              {line.disallowed ? (
                                <span className={styles.badgeDisallowed}>Disallowed</span>
                              ):(
                                <span className={styles.badgeAllowed}>Eligible</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ):(
                        <tr>
                          <td>General Line Item</td>
                          <td className={styles.alignRight}>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(selectedReceipt.receipt?.base_amount_inr ?? selectedReceipt.receipt?.total_amount ?? 0))}</td>
                          <td className={styles.alignRight}><span className={styles.badgeAllowed}>Eligible</span></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {}
                <div className={styles.modalActionSection}>
                  <label className={styles.notesLabel}>Admin Reviewer Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Enter approval note or mandatory rejection reason..."
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    className={styles.notesTextarea}
                  />

                  <div className={styles.buttonRow}>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleReject}
                      className={styles.rejectBtn}
                    >
                      <XCircle size={15} />
                      <span>Reject Receipt</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleApprove}
                      className={styles.approveBtn}
                    >
                      <CheckCircle2 size={15} />
                      <span>Smart Approve Reimbursement</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProcess;
