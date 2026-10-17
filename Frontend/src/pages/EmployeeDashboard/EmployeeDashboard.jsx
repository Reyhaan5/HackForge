import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Clock,
  AlertCircle,
  TrendingUp,
  UploadCloud,
  ArrowRight,
  Receipt,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Globe,
  MessageSquare,
  Mail,
  Smartphone,
  Paperclip,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useReceipts } from '../../context/ReceiptContext';
import StatCard from '../../components/StatCard/StatCard';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import styles from './EmployeeDashboard.module.css';

const SUBMISSION_CHANNELS = [
  { id: 'web', label: 'Web Portal', icon: Globe, hint: 'Direct browser upload' },
  { id: 'slack', label: 'Slack Bot', icon: MessageSquare, hint: '@Resolver Slack thread' },
  { id: 'email', label: 'Email Ingestion', icon: Mail, hint: 'receipts@company.com' },
  { id: 'mobile', label: 'Mobile Camera', icon: Smartphone, hint: 'iOS/Android camera' },
];

const CITY_OPTIONS = [
  { name: 'New York', cap: 100, currency: '$' },
  { name: 'San Francisco', cap: 90, currency: '$' },
  { name: 'Chicago', cap: 75, currency: '$' },
  { name: 'Austin', cap: 75, currency: '$' },
  { name: 'London', cap: 80, currency: '£' },
  { name: 'Tokyo', cap: 15000, currency: '¥' },
];

const SAMPLE_PRESETS = [
  {
    id: 'messy_thermal',
    name: 'Messy Thermal Coffee',
    cost: '$16.50',
    fileUrl: '/demo_receipts/1_messy_thermal_receipt.jpg',
    fileName: '1_messy_thermal_receipt.jpg',
    category: 'Meals',
    city: 'New York',
    client: 'Field Operations Coffee'
  },
  {
    id: 'alcohol_flag',
    name: 'Bistro Dinner + Wine',
    cost: '$142.80',
    fileUrl: '/demo_receipts/5_dinner_cocktails_alcohol.jpg',
    fileName: '5_dinner_cocktails_alcohol.jpg',
    category: 'Meals',
    city: 'Chicago',
    client: 'Team Review Dinner'
  },
  {
    id: 'uber_transit',
    name: 'Corporate Uber Ride',
    cost: '$42.50',
    fileUrl: '/demo_receipts/3_corporate_uber_receipt.png',
    fileName: '3_corporate_uber_receipt.png',
    category: 'Transport',
    city: 'San Francisco',
    client: 'Airport Transit'
  },
  {
    id: 'hotel_invoice',
    name: 'London Hotel Room',
    cost: '£285.00',
    fileUrl: '/demo_receipts/4_hotel_flight_invoice.png',
    fileName: '4_hotel_flight_invoice.png',
    category: 'Travel',
    city: 'London',
    client: 'London Summit'
  }
];

export const EmployeeDashboard = () => {
  const { user, history, monthlySpent, monthlyLimit, policyRules } = useReceipts();
  const navigate = useNavigate();

  // Drop Zone state
  const [channel, setChannel] = useState('web');
  const [city, setCity] = useState('New York');
  const [category, setCategory] = useState('Meals');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Compute stat metrics
  const totalReimbursed = history
    .filter(item => ['APPROVED', 'PARTIAL'].includes(item.result?.status))
    .reduce((acc, curr) => acc + (curr.result?.reimbursement_amount || curr.result?.approved_amount || 0), 0);

  const pendingCount = history.filter(
    item => item.result?.status === 'PENDING_APPROVAL' || item.result?.status === 'FLAGGED'
  ).length;

  const rejectedCount = history.filter(
    item => item.result?.status === 'REJECTED'
  ).length;

  const remainingBudget = Math.max(0, monthlyLimit - monthlySpent);
  const budgetPercent = Math.min(100, Math.round((monthlySpent / (monthlyLimit || 1)) * 100));

  // City per-diem cap computation
  const activeCityConfig = CITY_OPTIONS.find(c => c.name === city) || CITY_OPTIONS[0];
  const cityTodaySpent = history
    .filter(item => item.city === city && item.category === 'Meals')
    .reduce((acc, curr) => acc + (Number(curr.receipt?.total_amount) || 0), 0);
  const cityPercent = Math.min(100, Math.round((cityTodaySpent / activeCityConfig.cap) * 100));

  // Last 8 submissions for the Live Feed Table
  const recentSubmissions = history.slice(0, 8);

  // Forward selected/dropped file directly to Smart Submit
  const forwardToSmartSubmit = (selectedFile) => {
    navigate('/submit', {
      state: {
        file: selectedFile,
        city,
        category,
        channel
      }
    });
  };

  const forwardPresetToSmartSubmit = (preset) => {
    navigate('/submit', {
      state: {
        preset: preset,
        fileUrl: preset.fileUrl,
        fileName: preset.fileName,
        city: preset.city || city,
        category: preset.category || category,
        channel
      }
    });
  };

  // Global Clipboard (Ctrl+V) listener
  useEffect(() => {
    const handlePaste = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type && item.type.startsWith('image/')) {
            const pastedFile = item.getAsFile();
            if (pastedFile) {
              e.preventDefault();
              forwardToSmartSubmit(pastedFile);
              break;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [city, category, channel]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      forwardToSmartSubmit(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      forwardToSmartSubmit(e.target.files[0]);
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* Header Banner */}
      <div className={styles.welcomeBanner}>
        <div className={styles.welcomeText}>
          <div className={styles.taglineBadge}>
            <Sparkles size={13} />
            <span>AI Expense Command Center</span>
          </div>
          <h1 className={styles.greeting}>Your expenses, at a glance</h1>
          <p className={styles.subgreeting}>
            Receipts in, reimbursements moving. Automatic policy verification conquers the receipt graveyard.
          </p>
        </div>
        <Link to="/submit" className={styles.ctaButton}>
          <UploadCloud size={18} />
          <span>Add a receipt</span>
        </Link>
      </div>

      {/* High-Level Month Stat Figures */}
      <div className={styles.statsGrid}>
        <StatCard
          title="Total Reimbursed"
          value={`$${totalReimbursed.toFixed(2)}`}
          subtitle="Cleared & approved"
          icon={DollarSign}
          variant="success"
        />
        <StatCard
          title="In review"
          value={`${pendingCount} receipts`}
          subtitle="Forwarded to admin queue"
          icon={Clock}
          variant="warning"
        />
        <StatCard
          title="Rejected / Flagged"
          value={`${rejectedCount} receipts`}
          subtitle="Policy exceptions flagged"
          icon={AlertCircle}
          variant="danger"
        />
        <StatCard
          title="Monthly Limit"
          value={`$${monthlyLimit.toFixed(2)}`}
          subtitle={`$${remainingBudget.toFixed(2)} remaining`}
          icon={TrendingUp}
          variant="primary"
        />
      </div>

      {/* Section 1: Drop Zone */}
      <section className={styles.dropZoneSection}>
        <div className={styles.dropZoneContainer}>
          <div className={styles.dropZoneHeader}>
            <div className={styles.dropZoneTitleBlock}>
              <h2 className={styles.dropZoneHeading}>Drop Zone</h2>
              <p className={styles.dropZoneSubheading}>
                Drop messy, faded receipts or paste from clipboard. AI instantly extracts merchant, line items, and audit flags.
              </p>
            </div>

            {/* Submission Channel Switcher */}
            <div className={styles.channelSwitcher}>
              {SUBMISSION_CHANNELS.map(ch => {
                const Icon = ch.icon;
                const isActive = channel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    className={`${styles.channelTab} ${isActive ? styles.channelTabActive : ''}`}
                    onClick={() => setChannel(ch.id)}
                    title={ch.hint}
                  >
                    <Icon size={14} />
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Drop Box Target */}
          <div
            className={`${styles.dropBox} ${isDragging ? styles.dropBoxDragging : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className={styles.hiddenFileInput}
              onChange={handleFileInput}
            />

            <div className={styles.dropBoxContent}>
              {/* Micro-Illustrations */}
              <div className={styles.illustrationsCluster}>
                {/* Thermal Receipt with Coffee Stain Micro-Illustration */}
                <svg className={styles.microIllustration} viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 15C15 12.7909 16.7909 11 19 11H81C83.2091 11 85 12.7909 85 15V95L76 90L67 95L58 90L50 95L42 90L34 95L25 90L15 95V15Z" fill="#FFFFFF" stroke="#2A2A2A" strokeWidth="2.5" strokeLinejoin="round"/>
                  <line x1="26" y1="26" x2="52" y2="26" stroke="#2A2A2A" strokeWidth="3" strokeLinecap="round"/>
                  <line x1="26" y1="36" x2="74" y2="36" stroke="#636B70" strokeWidth="2" strokeDasharray="2 3"/>
                  <line x1="26" y1="46" x2="68" y2="46" stroke="#636B70" strokeWidth="2" strokeDasharray="2 3"/>
                  <line x1="26" y1="56" x2="55" y2="56" stroke="#636B70" strokeWidth="2" strokeDasharray="2 3"/>
                  <line x1="26" y1="70" x2="74" y2="70" stroke="#2A2A2A" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="68" cy="62" r="18" stroke="#F59D2A" strokeWidth="2" strokeDasharray="4 3" opacity="0.45" fill="#F59D2A" fillOpacity="0.08"/>
                  <path d="M30 82L45 82" stroke="#10B981" strokeWidth="3" strokeLinecap="round"/>
                </svg>

                {/* Smartphone Viewfinder Micro-Illustration */}
                <svg className={styles.microIllustration} viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="22" y="10" width="56" height="90" rx="10" fill="#FFFFFF" stroke="#2A2A2A" strokeWidth="2.5"/>
                  <rect x="28" y="20" width="44" height="68" rx="4" fill="#DCE7EC" fillOpacity="0.5"/>
                  <path d="M36 28H42M36 28V34M64 28H58M64 28V34M36 78H42M36 78V72M64 78H58M64 78V72" stroke="#2A2A2A" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="50" cy="15" r="2" fill="#2A2A2A"/>
                  <circle cx="50" cy="53" r="8" fill="#FFD13B" stroke="#2A2A2A" strokeWidth="2"/>
                </svg>
              </div>

              <div className={styles.dropTextGroup}>
                <p className={styles.dropPrompt}>
                  <strong>Drop your receipt file here</strong>, or <span className={styles.browseLink}>browse files</span>
                </p>
                <p className={styles.dropSubtext}>
                  Accepts thermal chits, taxi chits, invoices & restaurant itemized stubs (JPG, PNG, PDF)
                </p>
                <div className={styles.clipboardBadge}>
                  <Paperclip size={12} />
                  <span>Pro-tip: Press <code>Ctrl + V</code> / <code>Cmd + V</code> anywhere to paste screenshot</span>
                </div>
              </div>
            </div>
          </div>

          {/* Authentic Samples Bar */}
          <div className={styles.presetsBar}>
            <span className={styles.presetsLabel}>TRY AUTHENTIC SAMPLES:</span>
            <div className={styles.presetButtons}>
              {SAMPLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={styles.presetChip}
                  onClick={() => forwardPresetToSmartSubmit(preset)}
                  title={`Open ${preset.name} in Smart Submit`}
                >
                  <span>{preset.name}</span>
                  <span className={styles.presetPrice}>{preset.cost}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contextual Selectors & Primary Gold CTA */}
          <div className={styles.dropZoneControls}>
            <div className={styles.controlsRow}>
              <div className={styles.controlField}>
                <label className={styles.fieldLabel}>CITY / PER-DIEM CAP</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={styles.selectInput}
                >
                  {CITY_OPTIONS.map(c => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.currency}{c.cap}/day limit)
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.controlField}>
                <label className={styles.fieldLabel}>CATEGORY</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={styles.selectInput}
                >
                  <option value="Meals">Meals & Sustenance</option>
                  <option value="Transport">Transport & Rideshare</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Client Entertainment">Client Entertainment ($60/head)</option>
                  <option value="Travel">Travel & Lodging</option>
                </select>
              </div>
            </div>

            <div className={styles.ctaWrapper}>
              <button
                type="button"
                onClick={() => navigate('/submit', { state: { city, category, channel } })}
                className={styles.primaryGoldBtn}
              >
                <Sparkles size={16} />
                <span>{['Admin', 'Finance'].includes(user?.role) ? 'Process & Resolve Receipt' : 'Submit Receipt for Processing'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2-Column Split: Section 2 Live Feed Table (Left/Center) + Section 3 Policy Tracker (Right Sidebar) */}
      <div className={styles.mainContentGrid}>
        {/* Section 2: Live Feed Table */}
        <section className={styles.liveFeedCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardHeaderTitleGroup}>
              <h2 className={styles.sectionHeading}>Live Feed</h2>
              <span className={styles.sectionSubtitle}>
                Recently uploaded receipts with real-time audit match and compliance status
              </span>
            </div>
            <Link to="/expenses" className={styles.viewAllLink}>
              <span>All expenses ({history.length})</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {recentSubmissions.length === 0 ? (
            <div className={styles.emptyState}>
              <Receipt size={38} className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>No receipts logged yet</p>
              <p className={styles.emptyText}>
                When you or teammates drop a receipt, its line items, policy clearances, and amounts appear here live.
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={styles.emptyActionButton}
              >
                Drop your first receipt <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.feedTable}>
                <thead>
                  <tr>
                    <th>STATUS</th>
                    <th>MERCHANT & DETAILS</th>
                    <th className={styles.thRight}>AMOUNT</th>
                    <th>POLICY MATCH</th>
                    <th className={styles.thAction}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSubmissions.map((item) => {
                    const status = item.result?.status || 'PENDING_APPROVAL';
                    const isApproved = status === 'APPROVED';
                    const isPartial = status === 'PARTIAL';
                    const isViolated = status === 'REJECTED' || (item.result?.flags && item.result.flags.some(f => f.toLowerCase().includes('duplicate') || f.toLowerCase().includes('alcohol')));

                    let matchBadgeClass = styles.matchPillClear;
                    let matchLabel = '100% Policy Match';

                    if (isViolated) {
                      matchBadgeClass = styles.matchPillDanger;
                      matchLabel = item.result?.flags?.[0] || 'Violation Detected';
                    } else if (isPartial || item.result?.flags?.length > 0) {
                      matchBadgeClass = styles.matchPillWarn;
                      matchLabel = item.result?.flags?.[0] || 'Requires Review';
                    } else if (status === 'PENDING_APPROVAL') {
                      matchBadgeClass = styles.matchPillPending;
                      matchLabel = 'In Admin Queue';
                    }

                    const formattedAmount = new Intl.NumberFormat(undefined, {
                      style: 'currency',
                      currency: item.receipt?.currency || 'USD'
                    }).format(Number(item.receipt?.total_amount) || 0);

                    return (
                      <tr key={item.id} className={styles.feedRow}>
                        <td className={styles.tdStatus}>
                          <StatusBadge status={status} />
                        </td>
                        <td className={styles.tdMerchant}>
                          <div className={styles.merchantCell}>
                            <span className={styles.merchantName}>
                              {item.receipt?.vendor || 'Unknown Merchant'}
                            </span>
                            <div className={styles.merchantMeta}>
                              <span>{item.receipt?.date || 'Today'}</span>
                              <span className={styles.metaDot}>•</span>
                              <span>{item.category || 'Meals'}</span>
                              <span className={styles.metaDot}>•</span>
                              <span>{item.city || 'Default'}</span>
                              {item.channel && (
                                <>
                                  <span className={styles.metaDot}>•</span>
                                  <span className={styles.channelBadge}>{item.channel}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className={styles.tdAmount}>
                          <span className={styles.monoAmount}>{formattedAmount}</span>
                        </td>
                        <td className={styles.tdMatch}>
                          <span className={`${styles.matchPill} ${matchBadgeClass}`}>
                            {isApproved && <CheckCircle2 size={12} />}
                            {isViolated && <ShieldAlert size={12} />}
                            {matchLabel}
                          </span>
                        </td>
                        <td className={styles.tdAction}>
                          <Link
                            to="/expenses"
                            className={styles.inspectBtn}
                            title="Inspect itemized breakdown"
                          >
                            <span>Inspect</span>
                            <ChevronRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Section 3: Policy Tracker Sidebar */}
        <aside className={styles.policyTrackerSidebar}>
          <div className={styles.trackerCard}>
            <div className={styles.trackerHeader}>
              <div className={styles.trackerTitleGroup}>
                <Shield className={styles.trackerHeaderIcon} size={18} />
                <h2 className={styles.sectionHeading}>Policy Tracker</h2>
              </div>
              <span className={styles.trackerSubheading}>Accumulating limits & policy caps</span>
            </div>

            {/* Monthly Limit Progress */}
            <div className={styles.limitBlock}>
              <div className={styles.limitLabelRow}>
                <span className={styles.limitLabel}>Monthly Spend vs Cap</span>
                <span className={styles.monoCap}>
                  ${monthlySpent.toFixed(2)} / ${monthlyLimit.toFixed(2)}
                </span>
              </div>
              <div className={styles.progressBarTrack}>
                <div
                  className={`${styles.progressBarFill} ${budgetPercent > 90 ? styles.progressDanger : budgetPercent > 70 ? styles.progressWarn : styles.progressNormal}`}
                  style={{ width: `${budgetPercent}%` }}
                />
              </div>
              <div className={styles.limitFooter}>
                <span className={styles.progressPercent}>{budgetPercent}% utilized</span>
                <span className={styles.progressRemaining}>${remainingBudget.toFixed(2)} remaining</span>
              </div>
            </div>

            {/* City Per-Diem Cap Progress */}
            <div className={styles.limitBlock}>
              <div className={styles.limitLabelRow}>
                <span className={styles.limitLabel}>{activeCityConfig.name} Daily Per-Diem</span>
                <span className={styles.monoCap}>
                  {activeCityConfig.currency}{cityTodaySpent.toFixed(2)} / {activeCityConfig.currency}{activeCityConfig.cap}.00
                </span>
              </div>
              <div className={styles.progressBarTrack}>
                <div
                  className={`${styles.progressBarFill} ${cityPercent > 90 ? styles.progressDanger : cityPercent > 70 ? styles.progressWarn : styles.progressNormal}`}
                  style={{ width: `${cityPercent}%` }}
                />
              </div>
              <div className={styles.limitFooter}>
                <span className={styles.progressPercent}>{cityPercent}% of daily allowance</span>
                <span className={styles.progressRemaining}>Auto-enforced</span>
              </div>
            </div>

            <div className={styles.divider} />

            {/* Guardrail Rules Overview */}
            <div className={styles.guardrailsSection}>
              <span className={styles.guardrailsTitle}>ACTIVE POLICY GUARDRAILS</span>
              <ul className={styles.guardrailsList}>
                <li className={styles.guardrailItem}>
                  <ShieldCheck size={14} className={styles.guardrailIconGreen} />
                  <span>NYC Meal: $100 | SF: $90 | Default: $75</span>
                </li>
                <li className={styles.guardrailItem}>
                  <ShieldCheck size={14} className={styles.guardrailIconGreen} />
                  <span>Single expense &gt; $200 routes to Manager</span>
                </li>
                <li className={styles.guardrailItem}>
                  <ShieldAlert size={14} className={styles.guardrailIconAmber} />
                  <span>Alcohol & tobacco: Non-reimbursable</span>
                </li>
                <li className={styles.guardrailItem}>
                  <ShieldAlert size={14} className={styles.guardrailIconRed} />
                  <span>Cross-employee duplicate hash defense</span>
                </li>
              </ul>
            </div>

            {/* Admin Routing Indicator */}
            <div className={styles.routingBanner}>
              <div className={styles.routingIndicator}>
                <span className={styles.routingPulse} />
                <span className={styles.routingTitle}>Two-Stage Processing</span>
              </div>
              <p className={styles.routingText}>
                Employees drop receipts for automated ingestion; designated Admins review and smart-submit from the Admin Processing Queue.
              </p>
              {['Admin', 'Finance'].includes(user?.role) && (
                <Link to="/admin/process" className={styles.adminQueueLink}>
                  <span>Open Admin Intake Queue</span>
                  <ExternalLink size={13} />
                </Link>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
