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
  Smartphone
} from 'lucide-react';
import { useReceipts } from '../../context/ReceiptContext';
import { getEmployees, processReceipt } from '../../services/api';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import ReceiptSplitView from '../../components/ReceiptSplitView/ReceiptSplitView';
import AuditStatusPill from '../../components/AuditStatusPill/AuditStatusPill';
import AiProcessingStepper from '../../components/AiProcessingStepper/AiProcessingStepper';
import styles from './SmartSubmit.module.css';

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
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile?.type)) {
      setError('Choose a JPG, PNG, or WEBP image. PDF uploads are not supported by the receipt processor.');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setResult(null);

    // Create preview
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
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
  const loadQuickSample = async (sampleType) => {
    setError(null);
    setResult(null);

    let sampleFileUrl = '/demo_receipts/6_client_lunch_approved.jpg';
    let sampleFileName = 'client_lunch_approved.jpg';
    let sampleCity = 'New York';
    let sampleCat = 'Meals';
    let sampleClient = 'Acme Corp Review Dinner';

    if (sampleType === 'approved') {
      sampleFileUrl = '/demo_receipts/6_client_lunch_approved.jpg';
      sampleFileName = 'client_lunch_approved.jpg';
      sampleCity = 'New York';
      sampleCat = 'Meals';
      sampleClient = 'Acme Corp Review Dinner';
    } else if (sampleType === 'alcohol') {
      sampleFileUrl = '/demo_receipts/5_dinner_cocktails_alcohol.jpg';
      sampleFileName = 'dinner_cocktails_alcohol.jpg';
      sampleCity = 'Chicago';
      sampleCat = 'Meals';
      sampleClient = 'Team Happy Hour';
    } else if (sampleType === 'messy_thermal') {
      sampleFileUrl = '/demo_receipts/1_messy_thermal_receipt.jpg';
      sampleFileName = 'messy_thermal_receipt.jpg';
      sampleCity = 'New York';
      sampleCat = 'Meals';
      sampleClient = 'Client Field Lunch';
    } else if (sampleType === 'bistro_dining') {
      sampleFileUrl = '/demo_receipts/2_restaurant_bistro_receipt.jpg';
      sampleFileName = 'restaurant_bistro_receipt.jpg';
      sampleCity = 'San Francisco';
      sampleCat = 'Meals';
      sampleClient = 'Executive Partner Dinner';
    } else if (sampleType === 'wrinkled_market') {
      sampleFileUrl = '/demo_receipts/7_wrinkled_market_receipt.jpg';
      sampleFileName = 'wrinkled_market_receipt.jpg';
      sampleCity = 'Austin';
      sampleCat = 'Meals';
      sampleClient = 'Hardware Supplies Sprint';
    }

    setCity(sampleCity);
    setCategory(sampleCat);
    setClientName(sampleClient);

    try {
      const response = await fetch(sampleFileUrl);
      if (!response.ok) throw new Error(`Could not fetch ${sampleFileName}`);
      const blob = await response.blob();
      const fileObj = new File([blob], sampleFileName, { type: blob.type || 'image/jpeg' });
      setFile(fileObj);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      setError(`Failed to load preset image: ${err.message}`);
    }
  };

  const handleProcess = async () => {
    if (!file) {
      setError('Please select or drop a receipt image first.');
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
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={styles.container}>
      {/* Intro Header */}
      <div className={styles.introCard}>
        <h2 className={styles.introTitle}>Exhume & Resolve Paper Receipts</h2>
        <p className={styles.introDesc}>
          Drop receipt photos, scans, or itemized slips. The backend extracts the receipt, checks it against the active expense policy, and stores the result in your expense history.
        </p>

        {/* Quick Sample Selector for Live Judge Demonstrations */}
        <div className={styles.quickPills}>
          <span className={styles.pillLabel}>Judge Demo Presets:</span>
          <button
            type="button"
            className={styles.samplePill}
            onClick={() => loadQuickSample('approved')}
            title="Clean, in-policy business lunch ($84)"
          >
            🍽️ Clean Lunch (NYC $84)
          </button>
          <button
            type="button"
            className={styles.samplePill}
            onClick={() => loadQuickSample('alcohol')}
            title="Dinner check with itemized alcohol - triggers policy warning"
          >
            🍷 Alcohol Policy Flag
          </button>
          <button
            type="button"
            className={styles.samplePill}
            onClick={() => loadQuickSample('messy_thermal')}
            title="Real-world crumpled thermal receipt (Microsoft AI dataset)"
          >
            📄 Messy Thermal Paper
          </button>
          <button
            type="button"
            className={styles.samplePill}
            onClick={() => loadQuickSample('bistro_dining')}
            title="High-density multi-item French bistro check (Mindee dataset)"
          >
            ☕ Multi-Item Bistro
          </button>
          <button
            type="button"
            className={styles.samplePill}
            onClick={() => loadQuickSample('wrinkled_market')}
            title="Faded degraded paper receipt"
          >
            🧾 Faded Thermal Slip
          </button>
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
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileInput}
              />
              <div className={styles.uploadIconWrap}>
                <UploadCloud size={32} />
              </div>
              <h3 className={styles.dropPrompt}>Drop receipt image here, or click to browse</h3>
              <p className={styles.dropSub}>
                Supports JPG, PNG, and WEBP receipt images
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
                {previewUrl && file.type.startsWith('image/') ? (
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
