import { useState } from 'react';
import {
  Split,
  Clock,
  ShieldAlert,
  X
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './AuditStatusPill.module.css';

const formatINR = amount => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(Number(amount) || 0);

// SVG Seal Badge matching the user's uploaded icon
const ApprovedSealIcon = ({ size = 20, color = "#34d399", className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ flexShrink: 0 }}
  >
    {/* Sunburst Rays */}
    <line x1="256" y1="18" x2="256" y2="60" stroke={color} strokeWidth="26" strokeLinecap="round" />
    <line x1="256" y1="452" x2="256" y2="494" stroke={color} strokeWidth="26" strokeLinecap="round" />
    <line x1="18" y1="256" x2="60" y2="256" stroke={color} strokeWidth="26" strokeLinecap="round" />
    <line x1="452" y1="256" x2="494" y2="256" stroke={color} strokeWidth="26" strokeLinecap="round" />
    <line x1="88" y1="88" x2="118" y2="118" stroke={color} strokeWidth="26" strokeLinecap="round" />
    <line x1="394" y1="394" x2="424" y2="424" stroke={color} strokeWidth="26" strokeLinecap="round" />
    <line x1="424" y1="88" x2="394" y2="118" stroke={color} strokeWidth="26" strokeLinecap="round" />
    <line x1="118" y1="394" x2="88" y2="424" stroke={color} strokeWidth="26" strokeLinecap="round" />

    {/* Rosette scalloped outline */}
    <path
      d="M256 90C280 90 295 106 318 114C341 121 364 121 383 136C402 151 407 174 420 193C433 212 452 229 456 252C460 275 446 295 443 318C440 341 448 364 436 384C424 403 402 411 385 426C368 440 355 460 332 466C309 472 288 460 265 461C242 462 222 473 199 469C176 465 160 447 141 435C123 422 100 417 87 398C74 379 80 356 75 333C70 310 54 292 53 269C51 246 68 227 74 205C80 183 78 159 93 143C108 126 131 124 151 113C170 102 188 85 212 82C226 80 241 90 256 90Z"
      stroke={color}
      strokeWidth="24"
      strokeLinejoin="round"
    />

    {/* Inner ring */}
    <circle cx="256" cy="270" r="95" stroke={color} strokeWidth="24" />

    {/* Checkmark */}
    <path
      d="M205 272L242 309L312 232"
      stroke={color}
      strokeWidth="26"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const AuditStatusPill = ({
  status = 'APPROVED',
  approvedAmount = 0,
  requestedAmount = 0,
  currency = 'INR',
  flags = [],
  explanation = '',
  onClose,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const normStatus = (status || '').toUpperCase();

  const getConfig = () => {
    switch (normStatus) {
      case 'APPROVED':
        return {
          label: 'APPROVED',
          desc: `Full reimbursement (${formatINR(approvedAmount || requestedAmount)})`,
          isApprovedSeal: true,
          containerClass: styles.pillApproved,
          btnClass: styles.btnApproved,
          descClass: styles.descApproved,
          closeClass: styles.closeApproved,
          iconFill: 'var(--status-approved-accent)',
        };

      case 'PARTIAL':
      case 'FLAGGED':
        return {
          label: 'PARTIALLY APPROVED',
          desc: `${formatINR(approvedAmount)} of ${formatINR(requestedAmount)} (deductions applied)`,
          Icon: Split,
          containerClass: styles.pillPartial,
          btnClass: styles.btnPartial,
          descClass: styles.descPartial,
          closeClass: styles.closePartial,
          iconFill: 'var(--status-partial-accent)',
        };

      case 'PENDING_APPROVAL':
      case 'PENDING':
        return {
          label: 'PENDING APPROVAL',
          desc: `Requires manager sign-off (${formatINR(requestedAmount)})`,
          Icon: Clock,
          containerClass: styles.pillPending,
          btnClass: styles.btnPending,
          descClass: styles.descPending,
          closeClass: styles.closePending,
          iconFill: 'var(--status-pending-accent)',
        };

      case 'REJECTED':
      default:
        return {
          label: 'REJECTED',
          desc: explanation || (flags.length > 0 ? flags[0] : `Policy violation detected (${formatINR(0)} reimbursable)`),
          Icon: ShieldAlert,
          containerClass: styles.pillRejected,
          btnClass: styles.btnRejected,
          descClass: styles.descRejected,
          closeClass: styles.closeRejected,
          iconFill: 'var(--status-rejected-accent)',
        };
    }
  };

  const config = getConfig();
  const IconComponent = config.Icon;

  const iconVariants = {
    hidden: { x: 0, y: 0, opacity: 0, rotate: 0 },
    visible: (custom) => ({
      x: custom.x,
      y: custom.y,
      opacity: 0.9,
      rotate: 360,
      transition: {
        x: { duration: 0.35, ease: 'easeOut' },
        y: { duration: 0.35, ease: 'easeOut' },
        opacity: { duration: 0.25 },
        rotate: {
          duration: 0.8,
          type: 'spring',
          stiffness: 120,
          damping: 12,
        },
      },
    }),
  };

  return (
    <div className={styles.pillWrapper}>
      <AnimatePresence>
        <motion.div
          className={styles.pillMotion}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Top-Left Floating Animated Icon on Hover */}
          <motion.div
            initial="hidden"
            animate={isHovered ? "visible" : "hidden"}
            variants={iconVariants}
            custom={{ x: -14, y: -12 }}
            className={`${styles.floatingIcon} ${styles.floatingTopLeft}`}
          >
            {config.isApprovedSeal ? (
              <ApprovedSealIcon size={22} color={config.iconFill} />
            ) : (
              <IconComponent size={20} color={config.iconFill} />
            )}
          </motion.div>

          {/* Bottom-Right Floating Animated Icon on Hover */}
          <motion.div
            initial="hidden"
            animate={isHovered ? "visible" : "hidden"}
            variants={iconVariants}
            custom={{ x: 14, y: 12 }}
            className={`${styles.floatingIcon} ${styles.floatingBottomRight}`}
          >
            {config.isApprovedSeal ? (
              <ApprovedSealIcon size={22} color={config.iconFill} />
            ) : (
              <IconComponent size={20} color={config.iconFill} />
            )}
          </motion.div>

          {/* Extended Wide Banner Body */}
          <div className={`${styles.pillContainer} ${config.containerClass}`}>
            <div className={styles.contentLeft}>
              {config.isApprovedSeal ? (
                <ApprovedSealIcon size={24} color={config.iconFill} />
              ) : (
                <IconComponent size={18} color={config.iconFill} style={{ flexShrink: 0 }} />
              )}

              <button
                type="button"
                className={`${styles.pillBtn} ${config.btnClass}`}
                onClick={onClick}
              >
                {config.label}
              </button>

              <span className={`${styles.pillDesc} ${config.descClass}`}>
                {config.desc}
              </span>
            </div>

            {onClose && (
              <div className={styles.contentRight}>
                <button
                  type="button"
                  onClick={onClose}
                  className={`${styles.closeBtn} ${config.closeClass}`}
                  aria-label="Dismiss banner"
                >
                  <X size={15} />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AuditStatusPill;
