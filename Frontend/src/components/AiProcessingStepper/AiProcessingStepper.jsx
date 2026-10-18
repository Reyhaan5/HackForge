import { FileText } from 'lucide-react';
import styles from './AiProcessingStepper.module.css';

const AiProcessingStepper=({ previewUrl, fileName='receipt.jpg', fileType }) => {
  const isPdf=fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

  return (
    <section className={styles.processingCard} role="status" aria-live="polite">
      {previewUrl && !isPdf ? (
        <img className={styles.previewImage} src={previewUrl} alt="Uploaded receipt" />
      ):(
        <div className={styles.previewPlaceholder} aria-hidden="true">
          <FileText size={24} />
        </div>
      )}
      <div className={styles.processingInfo}>
        <h3 className={styles.processingTitle}>Processing receipt</h3>
        <p className={styles.processingText}>Please wait while we process it.</p>
        <p className={styles.fileName}>{fileName}</p>
      </div>
    </section>
  );
};

export default AiProcessingStepper;
