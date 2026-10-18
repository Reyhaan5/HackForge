import StatusBadge from '../StatusBadge/StatusBadge';
import styles from './ReceiptSplitView.module.css';

const ReceiptSplitView = ({
  imageUrl,
  fileType,
  receiptData,
  city,
  category,
  clientName = '',
}) => {
  const extracted = receiptData?.extracted || {};
  const lineItems = extracted.line_items || [];
  const flags = receiptData?.validation?.flags || [];
  const status = receiptData?.validation?.status || 'PENDING';
  const isPdf = fileType === 'application/pdf';
  const imagePath = imageUrl?.split(/[?#]/)[0] || '';
  const imagePreview = !isPdf || /\.(png|jpe?g|webp)$/i.test(imagePath);
  const context = [city, category, clientName].filter(Boolean).join(' · ');
  const formatAmount = (amount) =>
    amount == null ? 'Not read from receipt' : `${extracted.currency || ''} ${Number(amount).toFixed(2)}`.trim();
  const formatINR = amount => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2
  }).format(Number(amount) || 0);

  return (
    <div className={styles.reviewLayout}>
      <section className={styles.detailsPanel} aria-labelledby="receipt-details-title">
        <header className={styles.panelHeader}>
          <div>
            <h3 id="receipt-details-title">Receipt details</h3>
            {context && <p>{context}</p>}
          </div>
          <StatusBadge status={status} />
        </header>

        <dl className={styles.detailsList}>
          <div className={styles.detailRow}>
            <dt>Vendor</dt>
            <dd>{extracted.vendor || 'Not read from receipt'}</dd>
          </div>
          <div className={styles.detailRow}>
            <dt>Date</dt>
            <dd>{extracted.date || 'Not read from receipt'}</dd>
          </div>
          {extracted.calculated_tax != null && (
            <div className={styles.detailRow}>
              <dt>Sales tax</dt>
              <dd>{formatAmount(extracted.calculated_tax)}</dd>
            </div>
          )}
          <div className={`${styles.detailRow} ${styles.totalRow}`}>
            <dt>Receipt total</dt>
            <dd>{formatAmount(extracted.total_amount)}</dd>
          </div>
          {receiptData?.base_amount_inr != null && (
            <div className={`${styles.detailRow} ${styles.totalRow}`}>
              <dt>Base amount (INR)</dt>
              <dd>{formatINR(receiptData.base_amount_inr)}</dd>
            </div>
          )}
        </dl>

        {lineItems.length > 0 && (
          <div className={styles.section}>
            <h4>Items</h4>
            <ul className={styles.itemList}>
              {lineItems.map((item, index) => (
                <li className={styles.itemRow} key={`${item.description}-${index}`}>
                  <span>{item.description || 'Item'}</span>
                  <span>{formatAmount(item.amount)}</span>
                  {item.disallowed && <span className={styles.flagLabel}>Flagged</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {flags.length > 0 && (
          <div className={styles.flags}>
            <h4>Policy flags</h4>
            <ul>
              {flags.map((flag, index) => <li key={index}>{flag}</li>)}
            </ul>
          </div>
        )}
      </section>

      <section className={styles.previewPanel} aria-label="Uploaded receipt">
        {imageUrl ? (
          imagePreview ? (
            <img className={styles.receiptImage} src={imageUrl} alt="Uploaded receipt" />
          ) : (
            <iframe className={styles.receiptPdf} src={imageUrl} title="Uploaded receipt PDF" />
          )
        ) : (
          <p>Receipt preview unavailable.</p>
        )}
      </section>
    </div>
  );
};

export default ReceiptSplitView;
