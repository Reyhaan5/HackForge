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
  Cloud,
  ExternalLink,
  Check
} from 'lucide-react';
import { useReceipts } from '../../context/ReceiptContext';
import { getEmployees, processReceipt, simulateEmailReceipt, simulateS3Receipt } from '../../services/api';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import ReceiptSplitView from '../../components/ReceiptSplitView/ReceiptSplitView';
import AuditStatusPill from '../../components/AuditStatusPill/AuditStatusPill';
import AiProcessingStepper from '../../components/AiProcessingStepper/AiProcessingStepper';
import styles from './SmartSubmit.module.css';

const SUBMISSION_CHANNELS=[
  { id: 'web', label: 'Web Portal', icon: Globe, hint: 'Direct browser upload' },
  { id: 'slack', label: 'Slack Bot', icon: MessageSquare, hint: '@Resolver Slack thread' },
  { id: 'email', label: 'Email Ingestion', icon: Mail, hint: 'receipts@company.com' },
  { id: 's3', label: 'AWS S3 Bucket', icon: Cloud, hint: 's3://vault/inbox/' },
  { id: 'mobile', label: 'Mobile Camera', icon: Smartphone, hint: 'iOS/Android camera' },
];

export const SmartSubmit = () => {
  const { user, addProcessedReceipt, refreshSession, policyRules }=useReceipts();
  const isPrivileged=['Admin', 'Finance'].includes(user?.role);
  const cityCaps=policyRules?.city_daily_caps || {};

  // Form states
  const [channel, setChannel] = useState('web');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [clientName, setClientName] = useState('');
  const [employees, setEmployees]=useState([]);
  const [employeeId, setEmployeeId]=useState(user?.employee_id || '');

  // Email Ingestion Simulation States
  const [emailSender, setEmailSender] = useState(user?.email || 'sarah.connor@company.com');
  const [emailSubject, setEmailSubject] = useState('[NYC] Business Lunch with Acme Corp');
  const [emailBody, setEmailBody] = useState('City: New York, Category: Meals, Client: Acme Corp, Attendees: 2');

  // File states
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [pasteNotice, setPasteNotice]=useState(null);

  useEffect(() => {
    if (!isPrivileged) return;
    let isCurrent=true;
    getEmployees().then(list => {
      if (!isCurrent) return;
      setEmployees(list);
      setEmployeeId(current => current || list[0]?.id || '');
    }).catch(err => {
      if (isCurrent) setError(err.message || 'Could not load employees from the backend.');
    });
    return () => {
      isCurrent=false;
    };
  }, [isPrivileged]);

  const location=useLocation();

  useEffect(() => {
    if (location.state) {
      if (location.state.city) setCity(location.state.city);
      if (location.state.category) setCategory(location.state.category);
      if (location.state.channel) setChannel(location.state.channel);
      if (location.state.clientName) setClientName(location.state.clientName);

      if (location.state.file) {
        selectFile(location.state.file);
      } else if (location.state.fileUrl) {
        setPreviewUrl(location.state.fileUrl);
        fetch(location.state.fileUrl)
          .then(res => res.blob())
          .then(blob => {
            const fileName=location.state.fileName || location.state.fileUrl.split('/').pop();
            const f=new File([blob], fileName, { type: blob.type || 'image/jpeg' });
            setFile(f);
          })
          .catch(err => console.warn('Could not load the selected receipt file:', err));
      }
    }
  }, [location.state]);

  useEffect(() => () => {
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const selectFile=(selectedFile) => {
    const isImage=['image/jpeg', 'image/png', 'image/webp'].includes(selectedFile?.type);
    const isPdf=selectedFile?.type === 'application/pdf' || selectedFile?.name?.toLowerCase().endsWith('.pdf');

    if (!isImage && !isPdf) {
      setError('Choose a JPG, PNG, WEBP image or PDF receipt document.');
      return;
    }
    setFile(selectedFile);
    setError(null);
    setResult(null);

    const url=URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
  };


  useEffect(() => {
    const handlePaste=(e) => {
      const activeTag=document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.clipboardData && e.clipboardData.items) {
        const items=e.clipboardData.items;
        for (let i=0; i < items.length; i++) {
          if (items[i].type && items[i].type.startsWith('image/')) {
            const pastedFile=items[i].getAsFile();
            if (pastedFile) {
              e.preventDefault();
              selectFile(pastedFile);
              setPasteNotice('📸 Receipt image pasted directly from clipboard!');
              const timer=setTimeout(() => setPasteNotice(null), 4000);
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

  const loadBistroSample=async () => {
    setError(null);
    setResult(null);
    setCity('San Francisco');
    setCategory('Meals');
    setClientName('Executive Partner Dinner');

    try {
      const response=await fetch('/demo_receipts/2_restaurant_bistro_receipt.jpg');
      if (!response.ok) throw new Error('Could not load the Multi-Item Bistro sample.');
      const blob=await response.blob();
      const sampleFile=new File([blob], '2_restaurant_bistro_receipt.jpg', {
        type: blob.type || 'image/jpeg',
      });
      setFile(sampleFile);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err.message || 'Could not load the Multi-Item Bistro sample.');
    }
  };

  const handleProcess = async () => {
    if (!file) {
      setError('Please select or drop a receipt image or PDF first.');
      return;
    }
    if (channel !== 'email' && channel !== 's3') {
      if (isPrivileged && !employeeId) {
        setError('Select an employee before submitting a receipt for them.');
        return;
      }
      if (!city || !category) {
        setError('Choose the expense city and category before submitting.');
        return;
      }
    }

    setIsProcessing(true);
    setError(null);

    try {
      if (channel === 'email') {
        const emailRes = await simulateEmailReceipt(file, emailSender, emailSubject, emailBody);
        if (!emailRes?.success || !emailRes.receipt) {
          throw new Error(emailRes?.error || 'Email ingestion failed.');
        }
        const rData = emailRes.receipt;
        const res = {
          success: true,
          receipt_id: rData.receipt_id,
          image_url: rData.preview_url,
          submission_channel: 'email',
          currency: rData.currency,
          original_amount: rData.original_amount,
          exchange_rate: 1.0,
          base_amount_usd: rData.base_amount_usd,
          base_amount_inr: rData.base_amount_inr ?? rData.base_amount_usd,
          extracted: {
            vendor: rData.vendor,
            date: rData.date,
            total_amount: rData.original_amount,
            currency: rData.currency,
            line_items: []
          },
          validation: {
            status: rData.status,
            flags: rData.flags || [],
            reimbursement_amount: rData.approved_amount
          },
          decision: {
            status: rData.status,
            approved_amount: rData.approved_amount,
            flags: rData.flags || [],
            explanation: rData.explanation
          }
        };
        setResult(res);
        addProcessedReceipt(res, {
          city: emailRes.metadata_inferred?.city || city || 'Default',
          category: emailRes.metadata_inferred?.category || category || 'Meals',
          client_name: emailRes.metadata_inferred?.client_name || clientName,
          submission_channel: 'email',
          imageUrl: previewUrl || rData.preview_url
        });
        await refreshSession();
        return;
      }

      if (channel === 's3') {
        const s3EmpId = user?.employee_id || employeeId || 'EMP-101';
        const s3Res = await simulateS3Receipt(file, s3EmpId, file.name);
        if (!s3Res?.success || !s3Res.receipt) {
          throw new Error(s3Res?.error || 'S3 ingestion failed.');
        }
        const rData = s3Res.receipt;
        const res = {
          success: true,
          receipt_id: rData.receipt_id,
          image_url: rData.preview_url,
          submission_channel: 's3',
          currency: rData.currency,
          original_amount: rData.original_amount,
          exchange_rate: 1.0,
          base_amount_usd: rData.base_amount_usd,
          base_amount_inr: rData.base_amount_inr ?? rData.base_amount_usd,
          extracted: {
            vendor: rData.vendor,
            date: rData.date,
            total_amount: rData.original_amount,
            currency: rData.currency,
            line_items: []
          },
          validation: {
            status: rData.status,
            flags: rData.flags || [],
            reimbursement_amount: rData.approved_amount
          },
          decision: {
            status: rData.status,
            approved_amount: rData.approved_amount,
            flags: rData.flags || [],
            explanation: rData.explanation
          }
        };
        setResult(res);
        addProcessedReceipt(res, {
          city: s3Res.metadata_inferred?.city || 'Default',
          category: s3Res.metadata_inferred?.category || 'General',
          client_name: s3Res.metadata_inferred?.client_name || 'S3 Cloud Ingestion',
          submission_channel: 's3',
          imageUrl: previewUrl || rData.preview_url
        });
        await refreshSession();
        return;
      }

      // Call FastAPI backend POST /api/process-receipt
      const res=await processReceipt(file, city, category, clientName, {
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
    if (fileInputRef.current) fileInputRef.current.value='';
  };

  return (
    <div className={styles.container}>
      {/* Intro Header */}
      <div className={styles.introCard}>
        <h2 className={styles.introTitle}>
          {isPrivileged ? 'Admin Smart Processing Engine':'Submit Business Expense Receipt'}
        </h2>
        <button type="button" className={styles.sampleButton} onClick={loadBistroSample}>
          <FileText size={15} />
          <span>Multi-Item Bistro</span>
        </button>
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
          {}
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
                const Icon=ch.icon;
                const isActive=channel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    className={`${styles.channelButton} ${isActive ? styles.channelButtonActive:''}`}
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

          {channel === 'email' && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.07)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', fontWeight: 600, fontSize: '1rem' }}>
                  <Mail size={20} />
                  <span>Stage 1 Automated Ingestion: Inbound Corporate Gateway</span>
                </div>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#4ade80',
                  border: '1px solid rgba(34, 197, 94, 0.3)'
                }}>
                  ● IMAP Listener Active
                </span>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                Simulate forwarding an invoice or receipt to <strong>receipts@company.com</strong>. The ingestion daemon automatically resolves the employee from the sender, infers city and category from email tags, discards email signature junk (&lt;4KB logos), and fires the Gemini extraction pipeline.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    From (Sender Employee Email):
                  </label>
                  <input
                    type="email"
                    className={styles.input}
                    value={emailSender}
                    onChange={e => setEmailSender(e.target.value)}
                    placeholder="employee@company.com"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    To (Automated Ingestion Inbox):
                  </label>
                  <input
                    type="text"
                    className={styles.input}
                    value="receipts@company.com (Automated Intake)"
                    disabled
                    style={{ opacity: 0.75, cursor: 'not-allowed', background: 'rgba(0,0,0,0.15)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Email Subject Line (supports smart tags like [NYC], [London], etc.):
                </label>
                <input
                  type="text"
                  className={styles.input}
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="[NYC] Business Lunch with Acme Corp"
                />
              </div>
            </div>
          )}

          {channel === 's3' && (
            <div style={{
              background: 'rgba(234, 179, 8, 0.07)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#facc15', fontWeight: 600, fontSize: '1rem' }}>
                  <Cloud size={20} />
                  <span>Stage 1 Automated Ingestion: AWS S3 Cloud Storage Bucket</span>
                </div>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  background: 'rgba(234, 179, 8, 0.15)',
                  color: '#facc15',
                  border: '1px solid rgba(234, 179, 8, 0.3)'
                }}>
                  ● S3 Watcher / Webhook Poller
                </span>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                Simulate network scanners, ERP bulk drops, or mobile presigned S3 uploads into <strong>s3://expense-vault/inbox/</strong>. The S3 poller automatically streams the file, extracts the employee and location tags from the object key/filename, verifies policy rules, and moves the file to <code>processed/</code> or <code>quarantine/</code>.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Target S3 Object Key Path:
                  </label>
                  <input
                    type="text"
                    className={styles.input}
                    value={`inbox/${isPrivileged && employeeId ? employeeId : (user?.employee_id || 'EMP-101')}/${file?.name || 'receipt.jpg'}`}
                    disabled
                    style={{ opacity: 0.85, cursor: 'not-allowed', background: 'rgba(0,0,0,0.15)', fontFamily: 'monospace', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Associated Employee:
                  </label>
                  {isPrivileged ? (
                    <select
                      className={styles.select}
                      value={employeeId}
                      onChange={e => setEmployeeId(e.target.value)}
                    >
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.id})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className={styles.input}
                      value={`${user?.name || 'User'} (${user?.employee_id || 'EMP-101'})`}
                      disabled
                      style={{ opacity: 0.75, cursor: 'not-allowed', background: 'rgba(0,0,0,0.15)' }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {channel !== 'email' && channel !== 's3' && (
            <div className={styles.metaGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>City Location (Policy Limit)</label>
              <select
                className={styles.select}
                value={city}
                onChange={e => setCity(e.target.value)}
              >
                <option value="" disabled>Select a city</option>
                <optgroup label="Indian Metros & Tech Hubs">
                  {['Mumbai', 'Bengaluru', 'Delhi NCR', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Ahmedabad', 'Jaipur'].map(location => (
                    <option key={location} value={location}>
                      {location}
                      {cityCaps[location] != null ? ` (₹${Number(cityCaps[location]).toLocaleString('en-IN')} Cap)`:''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="International & Other">
                  {['New York', 'San Francisco', 'Chicago', 'Austin', 'London', 'Default'].map(location => (
                    <option key={location} value={location}>
                      {location === 'Default' ? 'Other / Default':location}
                      {cityCaps[location] != null ? ` (₹${Number(cityCaps[location]).toLocaleString('en-IN')} Cap)`:''}
                    </option>
                  ))}
                </optgroup>
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
          )}

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
                <span>
                  {channel === 'email' 
                    ? '⚡ Ingest Forwarded Email Receipt' 
                    : (isPrivileged ? 'Exhume & Smart Submit' : 'Submit Receipt for Admin Processing')}
                </span>
              </button>
            </div>
          )}
        </>
      )}

      {isProcessing && (
        <AiProcessingStepper
          previewUrl={previewUrl}
          fileName={file?.name || 'receipt_capture.jpg'}
          fileType={file?.type}
        />
      )}


      {result && !isProcessing && (
        <AuditStatusPill
          status={result.validation.status}
          requestedAmount={result.base_amount_inr ?? result.extracted?.total_amount ?? 0}
          approvedAmount={result.validation.reimbursement_amount}
          flags={result.validation.flags}
          currency="INR"
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
            fileType={file?.type}
            receiptData={result}
            city={city}
            category={category}
            clientName={clientName}
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
