import { useState, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  AlertCircle,
  Check,
  Sparkles,
  Camera,
  Receipt,
  CheckCircle2,
} from 'lucide-react';
import StatusBadge from '../StatusBadge/StatusBadge';
import styles from './ReceiptSplitView.module.css';

const EMPTY_LINE_ITEMS = [];

export const ReceiptSplitView = ({
  imageUrl,
  receiptData,
  city,
  category,
  clientName = '',
  onSave
}) => {
  // Zoom & view states
  const [zoom, setZoom] = useState(1.15);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState(imageUrl ? 'scanned' : 'simulated');

  // Rossum-style active field tracking
  const [activeFieldId, setActiveFieldId] = useState('vendor');
  const [confirmedFields, setConfirmedFields] = useState({});

  // Editable state synced with receiptData
  const vendor = receiptData?.extracted?.vendor || '';
  const date = receiptData?.extracted?.date || '';
  const totalAmount = receiptData?.extracted?.total_amount ?? null;
  const currency = receiptData?.extracted?.currency || '';
  const lineItems = receiptData?.extracted?.line_items || EMPTY_LINE_ITEMS;
  const calculatedTax = receiptData?.extracted?.calculated_tax ?? null;

  const status = receiptData?.validation?.status || 'APPROVED';
  const flags = receiptData?.validation?.flags || [];

  const reviewFieldIds = useMemo(() => [
    'vendor',
    'date',
    ...lineItems.map((_, idx) => `item_${idx}`),
    ...(calculatedTax != null ? ['tax'] : []),
    'total'
  ], [lineItems, calculatedTax]);

  const handleSelectField = (fieldId) => {
    setActiveFieldId(fieldId);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(Number((prev + 0.15).toFixed(2)), 2.6));
  const handleZoomOut = () => setZoom(prev => Math.max(Number((prev - 0.15).toFixed(2)), 0.6));
  const handleResetZoom = () => {
    setZoom(1.15);
    setRotation(0);
  };
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  // Group fields by section
  const basicFields = [
    { id: 'vendor', label: 'Vendor Name', value: vendor || 'Not read from receipt' },
    { id: 'date', label: 'Issue Date', value: date || 'Not read from receipt' }
  ];

  const amountFields = [
    ...(calculatedTax != null ? [{ id: 'tax', label: 'Sales Tax', value: `${currency} ${Number(calculatedTax).toFixed(2)}`.trim() }] : []),
    { id: 'total', label: 'Total Amount', value: totalAmount == null ? 'Not read from receipt' : `${currency} ${Number(totalAmount).toFixed(2)}`.trim() }
  ];

  return (
    <div className={styles.rossumShell}>
      {/* ================= LEFT COLUMN: ROSSUM INSPECTION SIDEBAR ================= */}
      <aside className={styles.rossumSidebar}>
        {/* Sidebar Header */}
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarTitleRow}>
            <span className={styles.sidebarReviewLabel}>Reviewing Extraction</span>
            <StatusBadge status={status} />
          </div>
          <div className={styles.sidebarSubRow}>
            <span className={styles.sidebarDocName}>
              {city} • {category} {clientName ? `• ${clientName}` : ''}
            </span>
            <span className={styles.verifiedCounter}>
              {Object.keys(confirmedFields).length} / {reviewFieldIds.length} verified
            </span>
          </div>
        </div>

        {/* Section 1: Basic Information */}
        <div className={styles.sidebarSection}>
          <div className={styles.sectionHeaderTitle}>Basic Information</div>
          <div className={styles.fieldsGroup}>
            {basicFields.map(f => {
              const isActive = activeFieldId === f.id;
              const isConfirmed = confirmedFields[f.id];
              return (
                <div
                  key={f.id}
                  className={`${styles.fieldRow} ${isActive ? styles.fieldRowActive : ''}`}
                  onClick={() => handleSelectField(f.id)}
                >
                  <div className={styles.fieldLeft}>
                    {isConfirmed ? (
                      <CheckCircle2 size={13} className={styles.confirmedIcon} />
                    ) : (
                      <span className={styles.fieldDot} />
                    )}
                    <span className={styles.fieldLabel}>{f.label}</span>
                  </div>
                  <span className={styles.fieldValue}>{f.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Line Items Breakdown */}
        {lineItems.length > 0 && (
          <div className={styles.sidebarSection}>
            <div className={styles.sectionHeaderTitle}>
              Itemized Line Items ({lineItems.length})
            </div>
            <div className={styles.fieldsGroup}>
              {lineItems.map((item, idx) => {
                const itemId = `item_${idx}`;
                const isActive = activeFieldId === itemId;
                const isConfirmed = confirmedFields[itemId];
                return (
                  <div
                    key={itemId}
                    className={`${styles.fieldRow} ${isActive ? styles.fieldRowActive : ''} ${
                      item.disallowed ? styles.fieldRowDisallowed : ''
                    }`}
                    onClick={() => handleSelectField(itemId)}
                  >
                    <div className={styles.fieldLeft}>
                      {isConfirmed ? (
                        <CheckCircle2 size={13} className={styles.confirmedIcon} />
                      ) : (
                        <span className={styles.fieldDot} />
                      )}
                      <span className={styles.fieldLabel}>
                        {item.description || `Item #${idx + 1}`}
                      </span>
                      {item.disallowed && (
                        <span className={styles.policyFlagChip}>FLAGGED</span>
                      )}
                    </div>
                    <span className={styles.fieldValue}>
                      ${Number(item.amount || 0).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 3: VAT & Amounts */}
        <div className={styles.sidebarSection}>
          <div className={styles.sectionHeaderTitle}>VAT & Amounts</div>
          <div className={styles.fieldsGroup}>
            {amountFields.map(f => {
              const isActive = activeFieldId === f.id;
              const isConfirmed = confirmedFields[f.id];
              return (
                <div
                  key={f.id}
                  className={`${styles.fieldRow} ${isActive ? styles.fieldRowActive : ''}`}
                  onClick={() => handleSelectField(f.id)}
                >
                  <div className={styles.fieldLeft}>
                    {isConfirmed ? (
                      <CheckCircle2 size={13} className={styles.confirmedIcon} />
                    ) : (
                      <span className={styles.fieldDot} />
                    )}
                    <span className={styles.fieldLabel}>{f.label}</span>
                  </div>
                  <span className={styles.fieldValue}>{f.value}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Policy Trigger Banner (if any) */}
        {flags.length > 0 && (
          <div className={styles.sidebarFlagsBanner}>
            <div className={styles.flagsBannerHeader}>
              <AlertCircle size={14} />
              <span>Policy Triggers ({flags.length})</span>
            </div>
            {flags.map((flag, idx) => (
              <div key={idx} className={styles.flagsBannerItem}>
                • {flag}
              </div>
            ))}
          </div>
        )}

        {/* Bottom Confirm Action Button (Rossum Style) */}
        <div className={styles.sidebarFooter}>
          <button
            type="button"
            className={styles.rossumConfirmAllBtn}
            onClick={() => {
              if (onSave) {
                onSave({
                  extracted: {
                    vendor,
                    date,
                    total_amount: totalAmount,
                    currency,
                    line_items: lineItems
                  },
                  city,
                  category,
                  clientName
                });
              }
              // Mark all verified
              const allVerified = {};
              reviewFieldIds.forEach(fieldId => (allVerified[fieldId] = true));
              setConfirmedFields(allVerified);
            }}
          >
            <Check size={16} />
            <span>Confirm & Verify Receipt</span>
          </button>
        </div>
      </aside>

      {/* ================= RIGHT COLUMN: DOCUMENT CANVAS & ROSSUM INSPECTOR ================= */}
      <main className={styles.rossumCanvasArea}>
        {/* Top Canvas Bar with Toggle & Zoom Controls */}
        <header className={styles.canvasToolbar}>
          <div className={styles.toolbarLeft}>
            <FileText size={16} className={styles.docIcon} />
            <span className={styles.docPageLabel}>Page 1 / 1</span>

            {/* Artifact Toggle: Original Photo vs Digital Ledger */}
            <div className={styles.artifactToggle}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${viewMode === 'scanned' ? styles.toggleBtnActive : ''}`}
                onClick={() => setViewMode('scanned')}
                title="View the original uploaded photo"
              >
                <Camera size={13} />
                <span>Original Photo</span>
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${viewMode === 'simulated' ? styles.toggleBtnActive : ''}`}
                onClick={() => setViewMode('simulated')}
                title="View generated digital paper ledger"
              >
                <Receipt size={13} />
                <span>Digital Ledger</span>
              </button>
            </div>
          </div>

          <div className={styles.toolbarRight}>
            <button type="button" className={styles.toolBtn} onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut size={15} />
            </button>
            <span className={styles.zoomIndicator}>{Math.round(zoom * 100)}%</span>
            <button type="button" className={styles.toolBtn} onClick={handleZoomIn} title="Zoom In">
              <ZoomIn size={15} />
            </button>
            <button type="button" className={styles.toolBtn} onClick={handleRotate} title="Rotate 90°">
              <RotateCw size={13} />
            </button>
            <button type="button" className={styles.toolBtn} onClick={handleResetZoom} title="Reset Center">
              <span>Center</span>
            </button>
          </div>
        </header>

        {/* Viewport Canvas (Auto-Centering Container) */}
        <div className={styles.canvasViewport}>
          {viewMode === 'scanned' ? (
            imageUrl ? (
              <div
                className={styles.imageFrame}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center'
                }}
              >
                <img
                  src={imageUrl}
                  alt="Original receipt"
                  className={styles.receiptImage}
                />

                <p className={styles.imageReviewNote} role="note">
                  Compare the extracted values with the original image; field coordinates are not available.
                </p>
              </div>
            ) : (
              <div className={styles.noScanNotice}>
                <Camera size={44} className={styles.noScanIcon} />
                <h4>No Scanned Image File</h4>
                <p>This receipt was submitted without a binary photo or via quick preset.</p>
                <button
                  type="button"
                  className={styles.switchModeBtn}
                  onClick={() => setViewMode('simulated')}
                >
                  <Receipt size={14} />
                  <span>Switch to Generated Digital Ledger</span>
                </button>
              </div>
            )
          ) : (
            /* ================= SIMULATED DIGITAL PAPER RECEIPT ================= */
            <div
              className={styles.simulatedPaper}
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center'
              }}
            >
              <div className={styles.simHeader}>
                <div className={styles.simStarDecor}>*** EXPENSE RECEIPT ***</div>
                <h4 className={styles.simVendor}>{vendor}</h4>
                <div className={styles.simMeta}>
                  <span>DATE: {date}</span> • <span>LOC: {city}</span>
                </div>
                <div className={styles.simMeta}>CATEGORY: {category?.toUpperCase() || 'NOT SELECTED'}</div>
              </div>

              <div className={styles.simDivider}>================================</div>

              <div className={styles.simLines}>
                {lineItems.map((line, lidx) => {
                  const itemId = `item_${lidx}`;
                  const isActive = activeFieldId === itemId;
                  return (
                    <div
                      key={itemId}
                      className={`${styles.simLineRow} ${isActive ? styles.simLineActive : ''} ${
                        line.disallowed ? styles.simLineDisallowed : ''
                      }`}
                      onClick={() => handleSelectField(itemId)}
                    >
                      <span>{line.description || `Item #${lidx + 1}`}</span>
                      <span>${Number(line.amount || 0).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              {calculatedTax > 0 && (
                <div className={styles.simSubRow}>
                  <span>SALES TAX</span>
                  <span>${Number(calculatedTax).toFixed(2)}</span>
                </div>
              )}

              <div className={styles.simDivider}>================================</div>

              <div className={styles.simTotalRow}>
                <span>TOTAL PAID</span>
                <span>{totalAmount == null ? 'Total not read' : `${currency} ${Number(totalAmount).toFixed(2)}`.trim()}</span>
              </div>

              <div className={styles.simAuditStamp}>
                <div className={styles.stampStatus}>AUDIT STATUS: {status}</div>
                <div className={styles.stampBarcode}>||||| | |||| || | ||||| || ||| ||||</div>
              </div>
            </div>
          )}
        </div>

        {/* Viewport Footer Status Bar */}
        <footer className={styles.canvasFooter}>
          <div className={styles.footerHint}>
            <Sparkles size={13} className={styles.footerSparkle} />
            <span>
              Review the extracted values against the original receipt image.
            </span>
          </div>
          <span className={styles.biSyncPill}>
            <span className={styles.livePulse} />
            Manual Review
          </span>
        </footer>
      </main>
    </div>
  );
};

export default ReceiptSplitView;
