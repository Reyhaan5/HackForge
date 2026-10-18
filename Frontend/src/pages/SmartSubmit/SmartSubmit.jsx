import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
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
    label: 'Clean Lunch (NYC $84)',
    fileUrl: '/demo_receipts/6_client_lunch_approved.jpg',
    fileName: '6_client_lunch_approved.jpg',
    city: 'New York',
    category: 'Meals',
    client: 'Acme Corp Review Dinner',
  },
  {
    id: 'alcohol_flag',
    label: 'Alcohol Policy Flag',
    fileUrl: '/demo_receipts/5_dinner_cocktails_alcohol.jpg',
    fileName: '5_dinner_cocktails_alcohol.jpg',
    city: 'Chicago',
    category: 'Meals',
    client: 'Team Happy Hour',
  },
  {
    id: 'messy_thermal',
    label: 'Messy Thermal Paper',
    fileUrl: '/demo_receipts/1_messy_thermal_receipt.jpg',
    fileName: '1_messy_thermal_receipt.jpg',
    city: 'New York',
    category: 'Meals',
    client: 'Field Site Operations Lunch',
  },
  {
    id: 'bistro_dining',
    label: 'Multi-Item Bistro',
    fileUrl: '/demo_receipts/2_restaurant_bistro_receipt.jpg',
    fileName: '2_restaurant_bistro_receipt.jpg',
    city: 'San Francisco',
    category: 'Meals',
    client: 'Executive Partner Dinner',
  },
  {
    id: 'uber_transit',
    label: 'Uber Transit (PDF)',
    fileUrl: '/demo_receipts/3_corporate_uber_receipt.png',
    fileName: '3_corporate_uber_receipt.png',
    city: 'New York',
    category: 'Travel',
    client: 'JFK Airport to Client HQ',
  },
  {
    id: 'hotel_invoice',
    label: 'Hotel Folio (PDF)',
    fileUrl: '/demo_receipts/4_hotel_flight_invoice.png',
    fileName: '4_hotel_flight_invoice.png',
    city: 'Austin',
    category: 'Lodging',
    client: 'Tech Summit Accommodation',
  },
  {
    id: 'wrinkled_market',
    label: 'Faded Thermal Slip',
    fileUrl: '/demo_receipts/7_wrinkled_market_receipt.jpg',
    fileName: '7_wrinkled_market_receipt.jpg',
    city: 'Austin',
    category: 'Other',
    client: 'Hardware Supplies Sprint',
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
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
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

  const location = useLocation();

  useEffect(() => {
    if (location.state) {
      if (location.state.city) setCity(location.state.city);
      if (location.state.category) setCategory(location.state.category);
      if (location.state.channel) setChannel(location.state.channel);
      if (location.state.clientName) setClientName(location.state.clientName);

      if (location.state.file) {
        selectFile(location.state.file);
      } else if (location.state.preset) {
        loadPreset(location.state.preset);
      } else if (location.state.fileUrl) {
        setPreviewUrl(location.state.fileUrl);
        fetch(location.state.fileUrl)
          .then(res => res.blob())
          .then(blob => {
            const fileName = location.state.fileName || location.state.fileUrl.split('/').pop();
            const f = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
            setFile(f);
          })
          .catch(err => console.warn('Could not auto-fetch redirected preset file:', err));
      }
    }
  }, [location.state]);

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
    if (!city || !category) {
      setError('Choose the expense city and category before submitting.');
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
        <h2 className={styles.introTitle}>
          {isPrivileged ? 'Admin Smart Processing Engine' : 'Submit Business Expense Receipt'}
        </h2>
        <p className={styles.introDesc}>
          {isPrivileged
            ? 'Process, smart-audit, and verify incoming receipts across all ingestion channels. Extract itemized line items and apply corporate policies.'
            : 'Upload or drop receipts. Your receipt will be automatically ingested with its source channel and routed to Admin Processing for policy verification.'}
        </p>

        {/* Quick Sample Selector for Live Judge Demonstrations */}
        <div className={styles.quickPills}>
          <span className={styles.pillLabel}>Judge Demo Presets:</span>
          {DEMO_PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={`${styles.samplePill} ${isActive ? styles.samplePillActive : ''}`}
                onClick={() => loadPreset(preset)}
              >
                {preset.label}
              </button>
            );
          })}
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
                <option value="" disabled>Select a city</option>
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
                <option value="" disabled>Select a category</option>
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
                <span>{isPrivileged ? 'Exhume & Smart Submit' : 'Submit Receipt for Admin Processing'}</span>
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
