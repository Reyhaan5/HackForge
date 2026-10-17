import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  Scan,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Globe,
  MessageSquare,
  Mail,
  Smartphone,
  ExternalLink,
  Check
} from 'lucide-react';
import { useReceipts } from '../../context/ReceiptContext';
import { getEmployees, processReceipt } from '../../services/api';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import ReceiptSplitView from '../../components/ReceiptSplitView/ReceiptSplitView';
import AuditStatusPill from '../../components/AuditStatusPill/AuditStatusPill';
import AiProcessingStepper from '../../components/AiProcessingStepper/AiProcessingStepper';
import styles from './SmartSubmit.module.css';

export const DEMO_PRESETS = [
  {
    id: 'approved_lunch',
    label: 'Clean Lunch',
    icon: '🍽️',
    sublabel: 'NYC ($84.00)',
    badge: 'Approved',
    badgeType: 'success',
    fileUrl: '/demo_receipts/6_client_lunch_approved.jpg',
    fileName: '6_client_lunch_approved.jpg',
    city: 'New York',
    category: 'Meals',
    client: 'Acme Corp Review Dinner',
    description: 'Compliant business lunch meeting within daily NYC cap.'
  },
  {
    id: 'alcohol_flag',
    label: 'Alcohol Policy Flag',
    icon: '🍷',
    sublabel: 'Chicago (Flagged)',
    badge: 'Disallowed Items',
    badgeType: 'warning',
    fileUrl: '/demo_receipts/5_dinner_cocktails_alcohol.jpg',
    fileName: '5_dinner_cocktails_alcohol.jpg',
    city: 'Chicago',
    category: 'Meals',
    client: 'Team Happy Hour',
    description: 'Itemized cocktails and wine automatically detected and deducted.'
  },
  {
    id: 'messy_thermal',
    label: 'Messy Thermal Paper',
    icon: '📄',
    sublabel: 'Microsoft AI Dataset',
    badge: 'Crumpled OCR',
    badgeType: 'info',
    fileUrl: '/demo_receipts/1_messy_thermal_receipt.jpg',
    fileName: '1_messy_thermal_receipt.jpg',
    city: 'New York',
    category: 'Meals',
    client: 'Field Site Operations Lunch',
    description: 'Real wrinkled, crumpled paper testing camera angle & skew OCR.'
  },
  {
    id: 'bistro_dining',
    label: 'Multi-Item Bistro',
    icon: '☕',
    sublabel: 'Mindee Dataset',
    badge: '12 Line Items',
    badgeType: 'info',
    fileUrl: '/demo_receipts/2_restaurant_bistro_receipt.jpg',
    fileName: '2_restaurant_bistro_receipt.jpg',
    city: 'San Francisco',
    category: 'Meals',
    client: 'Executive Partner Dinner',
    description: 'High-density French bistro bill with multi-tax breakdown.'
  },
  {
    id: 'uber_transit',
    label: 'Uber Ride Receipt',
    icon: '🚗',
    sublabel: 'Transit PDF / Doc',
    badge: 'PDF / Transit',
    badgeType: 'purple',
    fileUrl: '/demo_receipts/3_corporate_uber_receipt.png',
    pdfUrl: '/demo_receipts/3_corporate_uber_receipt.pdf',
    fileName: '3_corporate_uber_receipt.png',
    city: 'New York',
    category: 'Travel',
    client: 'JFK Airport to Client HQ',
    description: 'Corporate ground transit PDF receipt with distance, route & tip.'
  },
  {
    id: 'hotel_invoice',
    label: 'Hotel Folio Invoice',
    icon: '🏨',
    sublabel: 'Corporate Lodging PDF',
    badge: 'PDF / Lodging',
    badgeType: 'purple',
    fileUrl: '/demo_receipts/4_hotel_flight_invoice.png',
    pdfUrl: '/demo_receipts/4_hotel_flight_invoice.pdf',
    fileName: '4_hotel_flight_invoice.png',
    city: 'Austin',
    category: 'Lodging',
    client: 'Tech Summit Accommodation',
    description: 'Corporate hotel folio invoice with room charges, tax & parking.'
  },
  {
    id: 'wrinkled_market',
    label: 'Faded Thermal Slip',
    icon: '🧾',
    sublabel: 'Weathered Slip',
    badge: 'Contrast Boost',
    badgeType: 'warning',
    fileUrl: '/demo_receipts/7_wrinkled_market_receipt.jpg',
    fileName: '7_wrinkled_market_receipt.jpg',
    city: 'Austin',
    category: 'Other',
    client: 'Hardware Supplies Sprint',
    description: 'Aged weathered register tape testing auto-contrast boost.'
  }
];

const SUBMISSION_CHANNELS = [
  { id: 'web', label: 'Web Portal', icon: Globe, hint: 'Direct browser upload' },
  { id: 'slack', label: 'Slack Bot', icon: MessageSquare, hint: '@Resolver Slack thread' },
  { id: 'email', label: 'Email Ingestion', icon: Mail, hint: 'receipts@company.com' },
  { id: 'mobile', label: 'Mobile Camera', icon: Smartphone, hint: 'iOS/Android camera' },
];

export const SmartSubmit = () => {
  const { user, addProcessedReceipt, refreshSession, policyRules } = useReceipts();
  const isPrivileged = ['Admin', 'Finance'].includes(user?.role);
  const cityCaps = policyRules?.city_daily_caps || {};

  // Form states
  const [channel, setChannel] = useState('web');
  const [city, setCity] = useState('New York');
  const [category, setCategory] = useState('Meals');
  const [clientName, setClientName] = useState('');
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState(user?.employee_id || '');

  // File states
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [pasteNotice, setPasteNotice] = useState(null);
  const [activePresetId, setActivePresetId] = useState(null);

  useEffect(() => {
    if (!isPrivileged) return;
    let isCurrent = true;
    getEmployees().then(list => {
      if (!isCurrent) return;
      setEmployees(list);
      setEmployeeId(current => current || list[0]?.id || '');
    }).catch(err => {
      if (isCurrent) setError(err.message || 'Could not load employees from the backend.');
    });
    return () => {
      isCurrent = false;
    };
  }, [isPrivileged]);

  useEffect(() => () => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const selectFile = (selectedFile) => {
    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile?.type);
    const isPdf = selectedFile?.type === 'application/pdf' || selectedFile?.name?.toLowerCase().endsWith('.pdf');

    if (!isImage && !isPdf) {
      setError('Choose a JPG, PNG, WEBP image or PDF receipt document.');
      return;
    }
    setActivePresetId(null);
    setFile(selectedFile);
    setError(null);
    setResult(null);

    // If PDF, check if it matches one of our demo presets for crisp PNG preview
    const matchedDemo = DEMO_PRESETS.find(p =>
      selectedFile.name.toLowerCase().includes(p.id) ||
      selectedFile.name.toLowerCase().includes(p.fileName.toLowerCase().replace('.png', '')) ||
      (p.pdfUrl && selectedFile.name.toLowerCase().includes(p.pdfUrl.split('/').pop().toLowerCase()))
    );

    if (matchedDemo) {
      setPreviewUrl(matchedDemo.fileUrl);
    } else {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
    }
  };

  // Direct Clipboard (Ctrl+V) listener
  useEffect(() => {
    const handlePaste = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type && items[i].type.startsWith('image/')) {
            const pastedFile = items[i].getAsFile();
            if (pastedFile) {
              e.preventDefault();
              selectFile(pastedFile);
              setPasteNotice('📸 Receipt image pasted directly from clipboard!');
              const timer = setTimeout(() => setPasteNotice(null), 4000);
              return () => clearTimeout(timer);
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      selectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      selectFile(e.target.files[0]);
    }
  };

  // Helper to load authentic real sample receipts for live judge demonstrations
  const loadPreset = async (preset) => {
    setError(null);
    setResult(null);
    setActivePresetId(preset.id);

    setCity(preset.city);
    setCategory(preset.category);
    setClientName(preset.client);

    try {
      const response = await fetch(preset.fileUrl);
      if (!response.ok) throw new Error(`Could not fetch ${preset.fileName}`);
      const blob = await response.blob();
      const fileObj = new File([blob], preset.fileName, { type: blob.type || 'image/png' });
      setFile(fileObj);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      setError(`Failed to load preset image: ${err.message}`);
    }
  };

  const handleProcess = async () => {
    if (!file) {
      setError('Please select or drop a receipt image or PDF first.');
      return;
    }
    if (isPrivileged && !employeeId) {
      setError('Select an employee before submitting a receipt for them.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Call FastAPI backend POST /api/process-receipt
      const res = await processReceipt(file, city, category, clientName, {
        employeeId: user?.employee_id || employeeId,
        submissionChannel: channel
      });
      if (!res?.success || !res.extracted || !res.validation) {
        throw new Error('The backend returned an incomplete receipt decision. Please try again.');
      }
      setResult(res);
      addProcessedReceipt(res, {
        city,
        category,
        client_name: clientName,
        submission_channel: channel,
        imageUrl: previewUrl || undefined
      });
      await refreshSession();
    } catch (err) {
      setError(err.message || 'Receipt processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setActivePresetId(null);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const activePreset = DEMO_PRESETS.find(p => p.id === activePresetId);

  return (
    <div className={styles.container}>
      {/* Intro Header */}
      <div className={styles.introCard}>
        <h2 className={styles.introTitle}>Exhume & Resolve Paper Receipts</h2>
        <p className={styles.introDesc}>
          Drop receipt photos, scans, or itemized slips. The backend extracts the receipt, checks it against the active expense policy, and stores the result in your expense history.
        </p>

        {/* Dedicated Judge Demonstration Suite with 7 Authentic Receipts */}
        <div className={styles.presetSection}>
          <div className={styles.presetSectionHeader}>
            <div className={styles.presetTitleWrap}>
              <h4 className={styles.presetTitle}>
                <Sparkles size={16} />
                Judge Demo Presets
              </h4>
              <span className={styles.presetCountBadge}>7 Authentic Receipts</span>
            </div>
            <p className={styles.presetSubtitle}>
              Click any scenario below to instantly load real receipts (clean dining, alcohol violations, messy thermal paper, French bistro, Uber transit PDF, hotel invoice):
            </p>
          </div>

          <div className={styles.presetGrid}>
            {DEMO_PRESETS.map((preset) => {
              const isActive = activePresetId === preset.id;
              const tagClass =
                preset.badgeType === 'success'
                  ? styles.tagSuccess
                  : preset.badgeType === 'warning'
                  ? styles.tagWarning
                  : preset.badgeType === 'purple'
                  ? styles.tagPurple
                  : styles.tagInfo;

              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`${styles.presetCard} ${isActive ? styles.presetCardActive : ''}`}
                  onClick={() => loadPreset(preset)}
                  title={`${preset.label} - ${preset.description}`}
                >
                  <div className={styles.presetCardTop}>
                    <div className={styles.presetIconLabel}>
                      <span className={styles.presetEmoji}>{preset.icon}</span>
                      <div className={styles.presetTextWrap}>
                        <span className={styles.presetLabel}>{preset.label}</span>
                        <span className={styles.presetSublabel}>{preset.sublabel}</span>
                      </div>
                    </div>
                    <span className={`${styles.presetTag} ${tagClass}`}>
                      {isActive ? 'Active' : preset.badge}
                    </span>
                  </div>
                  <p className={styles.presetDesc}>{preset.description}</p>
                </button>
              );
            })}
          </div>

          {activePreset && (
            <div className={styles.presetActiveBar}>
              <div className={styles.presetActiveBarLeft}>
                <Sparkles size={16} className={styles.activeSparkle} />
                <span>
                  Loaded preset: <strong>{activePreset.label}</strong> ({activePreset.sublabel}) • Category: <strong>{activePreset.category}</strong> • City: <strong>{activePreset.city}</strong>
                </span>
              </div>
              <div className={styles.presetActiveBarRight}>
                {activePreset.pdfUrl && (
                  <a
                    href={activePreset.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.pdfSourceLink}
                    title="Open original vector PDF in new tab"
                  >
                    <ExternalLink size={13} />
                    <span>View Raw PDF</span>
                  </a>
                )}
                <button
                  type="button"
                  className={styles.clearPresetBtn}
                  onClick={handleReset}
                >
                  Clear Preset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {pasteNotice && (
        <div className={styles.pasteSuccessBanner} role="status">
          <Sparkles size={18} className={styles.pasteIcon} />
          <span>{pasteNotice}</span>
        </div>
      )}

      {error && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form & Upload Step */}
      {!result && !isProcessing && (
        <>
          {/* Multi-Channel Ingestion Selector */}
          <div className={styles.channelBar}>
            <div className={styles.channelBarHeader}>
              <span className={styles.channelLabel}>
                <Globe size={16} />
                Submission Channel Simulation
              </span>
              <span className={styles.channelSub}>
                Test cross-channel duplicate detection across Slack, Email, and Web
              </span>
            </div>
            <div className={styles.channelOptions}>
              {SUBMISSION_CHANNELS.map(ch => {
                const Icon = ch.icon;
                const isActive = channel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    className={`${styles.channelButton} ${isActive ? styles.channelButtonActive : ''}`}
                    onClick={() => setChannel(ch.id)}
                    title={ch.hint}
                  >
                    <Icon size={16} />
                    <span className={styles.channelBtnText}>{ch.label}</span>
                    {isActive && <span className={styles.channelBadgeActive}>Active</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.metaGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>City Location (Policy Limit)</label>
              <select
                className={styles.select}
                value={city}
                onChange={e => setCity(e.target.value)}
              >
                {['New York', 'San Francisco', 'Chicago', 'Austin', 'Default'].map(location => (
                  <option key={location} value={location}>
                    {location === 'Default' ? 'Other / Default' : location}
                    {cityCaps[location] != null ? ` ($${Number(cityCaps[location]).toFixed(2)} Cap)` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Expense Category</label>
              <select
                className={styles.select}
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                <option value="Meals">Meals & Client Dining</option>
                <option value="Travel">Flights & Ground Transit</option>
                <option value="Lodging">Lodging & Hotels</option>
                <option value="Office Supplies">Hardware & Office Supplies</option>
                <option value="Software">Software & Subscriptions</option>
                <option value="Other">Other Expenses</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Client / Purpose</label>
              <input
                type="text"
                className={styles.input}
                placeholder="e.g. Partner Review Dinner"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
              />
            </div>
            {isPrivileged && (
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="receipt-employee">Submitting for</label>
                <select
                  id="receipt-employee"
                  className={styles.select}
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  required
                >
                  <option value="">Select an employee</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} ({employee.id})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Drag & Drop Zone */}
          {!file ? (
            <div
              className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className={styles.hiddenInput}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileInput}
              />
              <div className={styles.uploadIconWrap}>
                <UploadCloud size={32} />
              </div>
              <h3 className={styles.dropPrompt}>Drop receipt image or PDF here, or click to browse</h3>
              <p className={styles.dropSub}>
                Supports JPG, PNG, WEBP, and PDF corporate receipts
              </p>
              <div className={styles.pasteShortcutPill}>
                <span className={styles.kbdBadge}>Ctrl</span>
                <span className={styles.plusSign}>+</span>
                <span className={styles.kbdBadge}>V</span>
                <span className={styles.pasteShortcutText}>to paste screenshot from clipboard</span>
              </div>
            </div>
          ) : (
            <div className={styles.filePreviewCard}>
              <div className={styles.filePreviewInfo}>
                {previewUrl && (file.type.startsWith('image/') || previewUrl.endsWith('.png') || previewUrl.endsWith('.jpg')) ? (
                  <img src={previewUrl} alt="Receipt preview" className={styles.previewThumb} />
                ) : (
                  <FileText size={32} />
                )}
                <div>
                  <div className={styles.fileName}>{file.name}</div>
                  <div className={styles.fileSize}>
                    {(file.size / 1024).toFixed(1)} KB • Ready for AI extraction
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={styles.changeFileBtn}
                onClick={handleReset}
              >
                Change File
              </button>
            </div>
          )}

          {file && (
            <div className={styles.submitActionWrap}>
              <button
                type="button"
                className={styles.processBtn}
                onClick={handleProcess}
              >
                <Sparkles size={18} />
                <span>Exhume & Validate Receipt</span>
              </button>
            </div>
          )}
        </>
      )}

      {isProcessing && (
        <AiProcessingStepper
          previewUrl={previewUrl}
          fileName={file?.name || 'receipt_capture.jpg'}
        />
      )}


      {result && !isProcessing && (
        <AuditStatusPill
          status={result.validation.status}
          requestedAmount={result.base_amount_usd ?? result.extracted?.total_amount ?? 0}
          approvedAmount={result.validation.reimbursement_amount}
          flags={result.validation.flags}
          currency="USD"
          explanation={result.decision?.explanation || ''}
        />
      )}

      {result && !isProcessing && (
        <div className={styles.resultCard}>
          <div className={styles.resultHeader}>
            <div>
              <h3 className={styles.resultTitle}>Policy Evaluation Result</h3>
              {result.submission_channel && (
                <span className={styles.channelBadgeResult}>
                  Submitted via {result.submission_channel.toUpperCase()}
                </span>
              )}
            </div>
            <StatusBadge status={result.validation.status} />
          </div>

          {result.validation.flags && result.validation.flags.length > 0 && (
            <div className={styles.flagsSection}>
              <div className={styles.flagsHeader}>
                <AlertTriangle size={16} />
                <span>Identified Policy Triggers ({result.validation.flags.length})</span>
              </div>
              {result.validation.flags.map((flag, idx) => (
                <div key={idx} className={styles.flagItem}>
                  <span>•</span>
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          )}

          <ReceiptSplitView
            imageUrl={previewUrl}
            receiptData={result}
            city={city}
            category={category}
            clientName={clientName}
            readOnly
          />

          <div className={styles.resetProcessRow}>
            <button
              type="button"
              className={styles.newReceiptBtn}
              onClick={handleReset}
            >
              <RotateCcw size={16} />
              <span>Submit Another Receipt</span>
            </button>
            <Link to="/expenses" className={styles.viewExpensesBtn}>
              <span>View in My Expenses</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartSubmit;
