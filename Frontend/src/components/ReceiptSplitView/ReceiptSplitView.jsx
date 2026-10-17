import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  AlertCircle,
  Crosshair,
  Check,
  X,
  Sparkles,
  Layers,
  ArrowUpRight,
  Camera,
  Receipt,
  ChevronRight,
  CheckCircle2,
  Trash2,
  Edit2
} from 'lucide-react';
import StatusBadge from '../StatusBadge/StatusBadge';
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
  // Zoom & view states
  const [zoom, setZoom] = useState(1.15);
  const [rotation, setRotation] = useState(0);
  const [showAllTargets, setShowAllTargets] = useState(true);
  const [viewMode, setViewMode] = useState(imageUrl ? 'scanned' : 'simulated');

  // Rossum-style active field tracking
  const [activeFieldId, setActiveFieldId] = useState('vendor');
  const [confirmedFields, setConfirmedFields] = useState({});

  // Editable state synced with receiptData
  const [vendor, setVendor] = useState(receiptData?.extracted?.vendor || 'Unknown Vendor');
  const [date, setDate] = useState(receiptData?.extracted?.date || '2026-10-17');
  const [totalAmount, setTotalAmount] = useState(
    receiptData?.extracted?.total_amount ?? receiptData?.validation?.reimbursement_amount ?? 0
  );
  const [lineItems, setLineItems] = useState(receiptData?.extracted?.line_items || []);
  const [calculatedTax, setCalculatedTax] = useState(receiptData?.extracted?.calculated_tax || 0);

  // DOM Refs for dynamic SVG bezier connector & auto-centering
  const splitWrapperRef = useRef(null);
  const canvasAreaRef = useRef(null);
  const imageFrameRef = useRef(null);
  const activeFieldDomRef = useRef(null);
  const activeBoxDomRef = useRef(null);

  // SVG Connector Line state
  const [connectorPath, setConnectorPath] = useState('');
  const [connectorStart, setConnectorStart] = useState({ x: 0, y: 0 });

  const status = receiptData?.validation?.status || 'APPROVED';
  const flags = receiptData?.validation?.flags || [];
  const reimbAmt = receiptData?.validation?.reimbursement_amount ?? totalAmount;

  // Normalized Bounding Boxes (Rossum Layout Mapping)
  const boundingBoxes = useMemo(() => {
    const boxes = [];

    // 1. Vendor / Header
    boxes.push({
      id: 'vendor',
      label: vendor,
      fieldLabel: 'Vendor / Merchant',
      section: 'basic',
      confidence: 99,
      top: 9,
      left: 12,
      width: 76,
      height: 7,
      category: 'VENDOR'
    });

    // 2. Date
    boxes.push({
      id: 'date',
      label: date,
      fieldLabel: 'Issue Date',
      section: 'basic',
      confidence: 96,
      top: 18,
      left: 18,
      width: 64,
      height: 4.8,
      category: 'DATE'
    });

    // 3. Line Items
    if (lineItems.length > 0) {
      const startTop = 27;
      const availableHeight = 44;
      const rowHeight = Math.min(6.5, Math.max(4.2, (availableHeight / lineItems.length) * 0.85));
      const step = lineItems.length > 1 ? (availableHeight - rowHeight) / (lineItems.length - 1) : 0;

      lineItems.forEach((item, idx) => {
        const topPos = startTop + (idx * step);
        boxes.push({
          id: `item_${idx}`,
          itemIndex: idx,
          label: `$${Number(item.amount || 0).toFixed(2)}`,
          sublabel: item.description || `Item #${idx + 1}`,
          fieldLabel: item.description || `Line Item #${idx + 1}`,
          section: 'items',
          confidence: item.disallowed ? 86 : 98,
          isDisallowed: item.disallowed,
          top: Number(topPos.toFixed(1)),
          left: 10,
          width: 80,
          height: Number(rowHeight.toFixed(1)),
          category: 'LINE_ITEM'
        });
      });
    }

    // 4. Tax
    if (calculatedTax && calculatedTax > 0) {
      boxes.push({
        id: 'tax',
        label: `$${Number(calculatedTax).toFixed(2)}`,
        fieldLabel: 'Sales Tax',
        section: 'amounts',
        confidence: 97,
        top: 73,
        left: 20,
        width: 60,
        height: 4.5,
        category: 'TAX'
      });
    }

    // 5. Total
    boxes.push({
      id: 'total',
      label: `$${Number(totalAmount).toFixed(2)}`,
      fieldLabel: 'Total Amount',
      section: 'amounts',
      confidence: 99,
      top: 80,
      left: 12,
      width: 76,
      height: 7.5,
      category: 'TOTAL'
    });

    return boxes;
  }, [vendor, date, lineItems, calculatedTax, totalAmount]);

  // Active box object
  const activeBox = useMemo(() => {
    return boundingBoxes.find(b => b.id === activeFieldId) || boundingBoxes[0];
  }, [boundingBoxes, activeFieldId]);

  // Recalculate Rossum SVG Bezier Connector Path
  const updateConnectorLine = useCallback(() => {
    if (!splitWrapperRef.current || !activeFieldDomRef.current || !activeBoxDomRef.current) {
      setConnectorPath('');
      return;
    }
    const containerRect = splitWrapperRef.current.getBoundingClientRect();
    const sourceRect = activeFieldDomRef.current.getBoundingClientRect();
    const targetRect = activeBoxDomRef.current.getBoundingClientRect();

    // Source anchor: center-right edge of active sidebar row
    const startX = sourceRect.right - containerRect.left;
    const startY = sourceRect.top + sourceRect.height / 2 - containerRect.top;

    // Target anchor: center-left edge of active document bounding box
    const endX = targetRect.left - containerRect.left;
    const endY = targetRect.top + targetRect.height / 2 - containerRect.top;

    // Smooth spline curve matching Rossum's exact horizontal lead-in & lead-out
    const dx = Math.max(30, (endX - startX) * 0.45);
    const path = `M ${startX} ${startY} L ${startX + 14} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX - 10} ${endY} L ${endX} ${endY}`;

    setConnectorPath(path);
    setConnectorStart({ x: startX, y: startY });
  }, []);

  // Smooth Auto-Center Camera Movement onto Bounding Box
  const centerBoundingBox = useCallback((boxId) => {
    const box = boundingBoxes.find(b => b.id === boxId);
    if (!box || !canvasAreaRef.current || !imageFrameRef.current) return;

    const canvas = canvasAreaRef.current;
    const frame = imageFrameRef.current;

    // Center coordinates in frame
    const boxCenterX = (box.left + box.width / 2) * (frame.offsetWidth / 100);
    const boxCenterY = (box.top + box.height / 2) * (frame.offsetHeight / 100);

    const scaledX = boxCenterX * zoom;
    const scaledY = boxCenterY * zoom;

    const targetScrollX = scaledX - canvas.clientWidth / 2;
    const targetScrollY = scaledY - canvas.clientHeight / 2;

    canvas.scrollTo({
      left: Math.max(0, targetScrollX),
      top: Math.max(0, targetScrollY),
      behavior: 'smooth'
    });
  }, [boundingBoxes, zoom]);

  // When activeFieldId changes, auto-center and update connector line
  const handleSelectField = (fieldId) => {
    setActiveFieldId(fieldId);
    centerBoundingBox(fieldId);
  };

  useEffect(() => {
    centerBoundingBox(activeFieldId);
  }, []); // Run on mount

  useEffect(() => {
    const timer = setTimeout(updateConnectorLine, 80);
    return () => clearTimeout(timer);
  }, [activeFieldId, zoom, rotation, viewMode, updateConnectorLine]);

  // Recalculate line on canvas scroll or resize
  useEffect(() => {
    const canvas = canvasAreaRef.current;
    if (!canvas) return;

    const handleScroll = () => {
      requestAnimationFrame(updateConnectorLine);
    };

    canvas.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      canvas.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [updateConnectorLine]);

  // Confirm current field and advance to next (Rossum workflow)
  const handleConfirmField = (fieldId) => {
    setConfirmedFields(prev => ({ ...prev, [fieldId]: true }));
    const currentIndex = boundingBoxes.findIndex(b => b.id === fieldId);
    if (currentIndex >= 0 && currentIndex < boundingBoxes.length - 1) {
      handleSelectField(boundingBoxes[currentIndex + 1].id);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(Number((prev + 0.15).toFixed(2)), 2.6));
  const handleZoomOut = () => setZoom(prev => Math.max(Number((prev - 0.15).toFixed(2)), 0.6));
  const handleResetZoom = () => {
    setZoom(1.15);
    setRotation(0);
    setTimeout(() => centerBoundingBox(activeFieldId), 50);
  };
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  // Group fields by section
  const basicFields = [
    { id: 'vendor', label: 'Vendor Name', value: vendor, setter: setVendor },
    { id: 'date', label: 'Issue Date', value: date, setter: setDate }
  ];

  const amountFields = [
    ...(calculatedTax > 0 ? [{ id: 'tax', label: 'Sales Tax', value: `$${Number(calculatedTax).toFixed(2)}` }] : []),
    { id: 'total', label: 'Total Amount', value: `$${Number(totalAmount).toFixed(2)}` }
  ];

  return (
    <div className={styles.rossumShell} ref={splitWrapperRef}>
      {/* Dynamic Rossum Spline Connector SVG Layer */}
      <svg className={styles.connectorSvgOverlay}>
        {connectorPath && viewMode === 'scanned' && (
          <>
            <path
              d={connectorPath}
              className={styles.connectorGlowPath}
              fill="none"
            />
            <path
              d={connectorPath}
              className={styles.connectorMainPath}
              fill="none"
            />
            {/* Start circle node on the sidebar active item */}
            <circle
              cx={connectorStart.x}
              cy={connectorStart.y}
              r="4.5"
              className={styles.connectorStartNode}
            />
          </>
        )}
      </svg>

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
              {Object.keys(confirmedFields).length} / {boundingBoxes.length} verified
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
                  ref={isActive ? activeFieldDomRef : null}
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
                    ref={isActive ? activeFieldDomRef : null}
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
                  ref={isActive ? activeFieldDomRef : null}
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
                    currency: 'USD',
                    line_items: lineItems
                  },
                  city,
                  category,
                  clientName
                });
              }
              // Mark all verified
              const allVerified = {};
              boundingBoxes.forEach(b => (allVerified[b.id] = true));
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
                title="View original uploaded photo with OCR targets"
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
            {viewMode === 'scanned' && (
              <>
                <button
                  type="button"
                  className={`${styles.toolBtn} ${showAllTargets ? styles.toolBtnActive : ''}`}
                  onClick={() => setShowAllTargets(!showAllTargets)}
                  title="Toggle all pastel OCR highlighters"
                >
                  <Layers size={14} />
                  <span>Highlighters</span>
                </button>
                <div className={styles.toolDivider} />
              </>
            )}

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
        <div className={styles.canvasViewport} ref={canvasAreaRef}>
          {viewMode === 'scanned' ? (
            imageUrl ? (
              <div
                className={styles.imageFrame}
                ref={imageFrameRef}
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

                {/* All Bounding Boxes & Floating Rossum Card Layer */}
                <div className={styles.boundingOverlay}>
                  {boundingBoxes.map(box => {
                    const isActive = activeFieldId === box.id;
                    const isConfirmed = confirmedFields[box.id];

                    if (!showAllTargets && !isActive) return null;

                    return (
                      <div
                        key={box.id}
                        ref={isActive ? activeBoxDomRef : null}
                        className={`${styles.boxRect} ${
                          isActive
                            ? styles.boxRectActive
                            : box.isDisallowed
                            ? styles.boxRectDisallowed
                            : styles.boxRectPastel
                        } ${isConfirmed ? styles.boxRectConfirmed : ''}`}
                        style={{
                          top: `${box.top}%`,
                          left: `${box.left}%`,
                          width: `${box.width}%`,
                          height: `${box.height}%`
                        }}
                        onClick={() => handleSelectField(box.id)}
                      >
                        {/* Corner Reticles for Active Box (Rossum Style) */}
                        {isActive && (
                          <>
                            <span className={styles.cornerHandleTL} />
                            <span className={styles.cornerHandleTR} />
                            <span className={styles.cornerHandleBL} />
                            <span className={styles.cornerHandleBR} />
                          </>
                        )}

                        {/* ================= ROSSUM FLOATING CARD ================= */}
                        {isActive && (
                          <div
                            className={styles.rossumFloatingCard}
                            onClick={e => e.stopPropagation()}
                          >
                            <div className={styles.cardHeaderRow}>
                              <div className={styles.cardValueLarge}>
                                {box.label}
                              </div>
                              <span className={styles.cardConfidence}>
                                {box.confidence}%
                              </span>
                            </div>

                            <div className={styles.cardSublabel}>
                              {box.fieldLabel}
                            </div>

                            {/* Confirm / Reject Buttons matching Rossum UI */}
                            <div className={styles.cardActionsRow}>
                              <button
                                type="button"
                                className={styles.cardActionReject}
                                onClick={() => setActiveFieldId(null)}
                                title="Dismiss selection"
                              >
                                <X size={13} />
                              </button>
                              <button
                                type="button"
                                className={styles.cardActionConfirm}
                                onClick={() => handleConfirmField(box.id)}
                                title="Confirm field and advance"
                              >
                                <Check size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
              ref={imageFrameRef}
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
                <div className={styles.simMeta}>CATEGORY: {category.toUpperCase()}</div>
              </div>

              <div className={styles.simDivider}>================================</div>

              <div className={styles.simLines}>
                {lineItems.map((line, lidx) => {
                  const itemId = `item_${lidx}`;
                  const isActive = activeFieldId === itemId;
                  return (
                    <div
                      key={itemId}
                      ref={isActive ? activeBoxDomRef : null}
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
                <span>${Number(totalAmount).toFixed(2)} USD</span>
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
              Click any field in the left sidebar to fly camera & auto-center on receipt. Click ✓ to confirm.
            </span>
          </div>
          <span className={styles.biSyncPill}>
            <span className={styles.livePulse} />
            Rossum HITL Active
          </span>
        </footer>
      </main>
    </div>
  );
};

export default ReceiptSplitView;
