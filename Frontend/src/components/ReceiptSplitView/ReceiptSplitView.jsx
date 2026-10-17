import { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  AlertCircle
} from 'lucide-react';
import StatusBadge from '../StatusBadge/StatusBadge';
import EditableReceiptForm from '../EditableReceiptForm/EditableReceiptForm';
import styles from './ReceiptSplitView.module.css';

export const ReceiptSplitView = ({
  imageUrl,
  receiptData,
  city = 'New York',
  category = 'Meals',
  clientName = '',
  onSave,
  readOnly = false
}) => {
  const [zoom, setZoom] = useState(1);
  const [activeHighlight, setActiveHighlight] = useState(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.6));
  const handleResetZoom = () => setZoom(1);

  const status = receiptData?.validation?.status || 'APPROVED';
  const flags = receiptData?.validation?.flags || [];
  const reimbAmt = receiptData?.validation?.reimbursement_amount ?? receiptData?.extracted?.total_amount ?? 0;

  return (
    <div className={styles.splitWrapper}>
      {/* ================= LEFT PANE: INTERACTIVE DOCUMENT VIEWER ================= */}
      <div className={styles.leftPane}>
        {/* Viewer Control Bar */}
        <div className={styles.viewerHeader}>
          <div className={styles.viewerTitle}>
            <FileText size={16} />
            <span>Document Preview</span>
          </div>

          <div className={styles.zoomControls}>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={handleZoomOut}
              title="Zoom Out"
            >
              <ZoomOut size={15} />
            </button>
            <span className={styles.zoomText}>{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={handleZoomIn}
              title="Zoom In"
            >
              <ZoomIn size={15} />
            </button>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={handleResetZoom}
              title="Reset Zoom"
            >
              <RotateCw size={13} />
            </button>
          </div>
        </div>

        {/* Viewport Canvas */}
        <div className={styles.canvasArea}>
          {imageUrl ? (
            <div
              className={`${styles.imageFrame} ${activeHighlight !== null ? styles.imageHighlighted : ''}`}
              style={{ transform: `scale(${zoom})` }}
            >
              <img
                src={imageUrl}
                alt="Uploaded receipt"
                className={styles.receiptImg}
              />
              {activeHighlight !== null && (
                <div className={styles.itemPulseOverlay} />
              )}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <FileText size={48} className={styles.emptyIcon} />
              <p>No receipt image preview available</p>
            </div>
          )}
        </div>

        <div className={styles.viewerFooter}>
          <span className={styles.hintText}>
            💡 Hover over extracted line items on the right to trigger document inspection.
          </span>
        </div>
      </div>

      {/* ================= RIGHT PANE: AUDIT VERDICT & EXTRACTED FORM ================= */}
      <div className={styles.rightPane}>
        {/* Top Summary Header */}
        <div className={styles.auditHeaderCard}>
          <div className={styles.topStatusRow}>
            <span className={styles.sectionCaption}>Real-Time Policy Audit</span>
            <StatusBadge status={status} />
          </div>

          <div className={styles.vendorAndTotalRow}>
            <div>
              <h3 className={styles.vendorName}>
                {receiptData?.extracted?.vendor || 'Unknown Vendor'}
              </h3>
              <span className={styles.metaSub}>
                {city} • {category} {clientName ? `• ${clientName}` : ''}
              </span>
            </div>
            <div className={styles.reimburseBox}>
              <span className={styles.reimburseLabel}>Reimbursable</span>
              <span className={styles.reimburseValue}>${Number(reimbAmt).toFixed(2)}</span>
            </div>
          </div>

          {/* Triggered Policy Violations / Flags */}
          {flags.length > 0 && (
            <div className={styles.flagsList}>
              <div className={styles.flagsHeading}>
                <AlertCircle size={14} />
                <span>Policy Violations & Warnings ({flags.length})</span>
              </div>
              {flags.map((flag, idx) => (
                <div key={idx} className={styles.flagItem}>
                  <span>•</span>
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Line Item Inspection Strip */}
        {receiptData?.extracted?.line_items && receiptData.extracted.line_items.length > 0 && (
          <div className={styles.lineItemsStrip}>
            <div className={styles.stripHeader}>
              <span className={styles.stripTitle}>
                Itemized Line Breakdown ({receiptData.extracted.line_items.length})
              </span>
              <span className={styles.stripNotice}>Hover to trace on receipt</span>
            </div>
            <div className={styles.itemsGrid}>
              {receiptData.extracted.line_items.map((item, idx) => (
                <div
                  key={idx}
                  className={`${styles.itemChip} ${activeHighlight === idx ? styles.itemChipActive : ''}`}
                  onMouseEnter={() => setActiveHighlight(idx)}
                  onMouseLeave={() => setActiveHighlight(null)}
                >
                  <span className={styles.itemDesc}>{item.description || `Item #${idx + 1}`}</span>
                  <span className={styles.itemAmt}>${Number(item.amount || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full Editable Form */}
        <div className={styles.formContainer}>
          <EditableReceiptForm
            initialData={receiptData?.extracted || {}}
            city={city}
            category={category}
            clientName={clientName}
            onSave={onSave}
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
};

export default ReceiptSplitView;
