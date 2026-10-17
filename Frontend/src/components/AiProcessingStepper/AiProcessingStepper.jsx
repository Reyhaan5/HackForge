import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Camera,
  Search,
  Scale,
  CheckCircle2,
  Loader2,
  FileText,
  ShieldCheck,
  Zap
} from 'lucide-react';
import styles from './AiProcessingStepper.module.css';

const STAGES = [
  {
    id: 'enhancement',
    title: 'Image Enhancement & EXIF Rectification',
    description: 'Deskewing, thermal contrast normalization, and computing duplicate pHash fingerprint.',
    icon: Camera,
    color: '#38bdf8',
    targetProgress: 35
  },
  {
    id: 'ocr',
    title: 'Deep Neural OCR & Entity Extraction',
    description: 'Scanning vendor header, timestamp, currency, itemized line items, and sales tax.',
    icon: Search,
    color: '#818cf8',
    targetProgress: 72
  },
  {
    id: 'policy',
    title: 'Corporate Policy & Per-Diem Audit Engine',
    description: 'Cross-referencing city daily caps, weekend expense flags, alcohol detection, and approval limits.',
    icon: Scale,
    color: '#f97316',
    targetProgress: 98
  }
];

export const AiProcessingStepper = ({ previewUrl, fileName = 'receipt.jpg' }) => {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    // Dynamic progressive ticker that advances gracefully while awaiting backend response
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 32) return prev + 3;
        if (prev < 68) return prev + 2;
        if (prev < 94) return prev + 1;
        return prev;
      });
    }, 180);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress < 35) {
      setCurrentStageIdx(0);
    } else if (progress < 72) {
      setCurrentStageIdx(1);
    } else {
      setCurrentStageIdx(2);
    }
  }, [progress]);

  return (
    <div className={styles.stepperContainer}>
      {/* Laser Scanning Visual Canvas */}
      <div className={styles.scannerWrapper}>
        <div className={styles.scannerHeader}>
          <div className={styles.scannerBadge}>
            <Zap size={14} className={styles.zapIcon} />
            <span>Neural OCR Engine v2.4</span>
          </div>
          <span className={styles.progressPercent}>{Math.min(99, progress)}%</span>
        </div>

        <div className={styles.viewportArea}>
          {previewUrl ? (
            <div className={styles.imageCard}>
              <img src={previewUrl} alt="Scanning receipt" className={styles.scanTargetImg} />
              
              {/* Holographic Laser Scanner Beam */}
              <div className={styles.laserBeam} />
              
              {/* Sci-Fi Grid Overlay */}
              <div className={styles.gridOverlay} />

              {/* Target Bounding Frame */}
              <div className={styles.hudCornerTopLeft} />
              <div className={styles.hudCornerTopRight} />
              <div className={styles.hudCornerBottomLeft} />
              <div className={styles.hudCornerBottomRight} />

              <div className={styles.activePillTag}>
                <span className={styles.pulseDot} />
                <span>EXHUMING DATA</span>
              </div>
            </div>
          ) : (
            <div className={styles.emptyScanner}>
              <FileText size={48} className={styles.emptyIcon} />
              <span>Analyzing Document Structure...</span>
            </div>
          )}
        </div>

        <div className={styles.scannerFooter}>
          <span className={styles.scanningFileName}>{fileName}</span>
          <span className={styles.engineMeta}>4-Stage Resolution Pipeline</span>
        </div>
      </div>

      {/* Progressive Multi-Stage Timeline */}
      <div className={styles.timelineWrapper}>
        <div className={styles.timelineHeader}>
          <div>
            <h3 className={styles.timelineTitle}>Automated Receipt Resolution</h3>
            <p className={styles.timelineSubtitle}>
              Continuous AI verification with corporate policy guardrails
            </p>
          </div>
          <div className={styles.activeStageTag}>
            <Sparkles size={14} />
            <span>Stage {currentStageIdx + 1} of 3</span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className={styles.progressBarTrack}>
          <motion.div
            className={styles.progressBarFill}
            initial={{ width: '10%' }}
            animate={{ width: `${Math.min(99, progress)}%` }}
            transition={{ ease: 'easeOut', duration: 0.3 }}
          />
        </div>

        {/* Step Items */}
        <div className={styles.stepList}>
          {STAGES.map((stage, idx) => {
            const isCompleted = currentStageIdx > idx;
            const isActive = currentStageIdx === idx;
            const isPending = currentStageIdx < idx;
            const StageIcon = stage.icon;

            return (
              <motion.div
                key={stage.id}
                className={`${styles.stepItem} ${
                  isActive ? styles.stepItemActive : isCompleted ? styles.stepItemDone : styles.stepItemPending
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className={styles.stepIconContainer}>
                  {isCompleted ? (
                    <div className={styles.iconCheck}>
                      <CheckCircle2 size={18} />
                    </div>
                  ) : isActive ? (
                    <div className={styles.iconActive}>
                      <Loader2 size={18} className={styles.spinIcon} />
                    </div>
                  ) : (
                    <div className={styles.iconPending}>
                      <StageIcon size={16} />
                    </div>
                  )}
                  {idx < STAGES.length - 1 && (
                    <div
                      className={`${styles.stepLine} ${
                        isCompleted ? styles.stepLineDone : ''
                      }`}
                    />
                  )}
                </div>

                <div className={styles.stepContent}>
                  <div className={styles.stepHeadingRow}>
                    <h4 className={styles.stepTitle}>{stage.title}</h4>
                    {isActive && (
                      <span className={styles.liveIndicator}>
                        <span className={styles.liveDot} />
                        PROCESSING
                      </span>
                    )}
                    {isCompleted && (
                      <span className={styles.doneIndicator}>RESOLVED</span>
                    )}
                  </div>
                  <p className={styles.stepDesc}>{stage.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AiProcessingStepper;
