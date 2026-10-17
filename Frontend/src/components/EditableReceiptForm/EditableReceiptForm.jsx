import React, { useState } from 'react';
import { Plus, Trash2, Check, Sparkles } from 'lucide-react';
import styles from './EditableReceiptForm.module.css';

export const EditableReceiptForm = ({
  initialData = {},
  city: initialCity = 'New York',
  category: initialCategory = 'Meals',
  clientName: initialClientName = '',
  onSave
}) => {
  const [vendor, setVendor] = useState(initialData.vendor || '');
  const [date, setDate] = useState(initialData.date || new Date().toISOString().split('T')[0]);
  const [totalAmount, setTotalAmount] = useState(initialData.total_amount?.toString() || '0');
  const [currency, setCurrency] = useState(initialData.currency || 'USD');
  const [city, setCity] = useState(initialCity || 'New York');
  const [category, setCategory] = useState(initialCategory || 'Meals');
  const [clientName, setClientName] = useState(initialClientName || '');
  const [isItemized, setIsItemized] = useState(initialData.is_itemized ?? true);
  const [lineItems, setLineItems] = useState(initialData.line_items || []);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: '', amount: 0 }]);
  };

  const handleUpdateLineItem = (index, field, val) => {
    const updated = [...lineItems];
    if (field === 'amount') {
      updated[index].amount = parseFloat(val) || 0;
    } else {
      updated[index].description = val;
    }
    setLineItems(updated);
  };

  const handleRemoveLineItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const updatedExtracted = {
      vendor,
      date,
      total_amount: parseFloat(totalAmount) || 0,
      currency,
      is_itemized: isItemized,
      line_items: lineItems
    };

    if (onSave) {
      onSave({
        extracted: updatedExtracted,
        city,
        category,
        clientName
      });
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <form className={styles.formContainer} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <h3 className={styles.title}>Extracted Receipt Details</h3>
        <span className={styles.badgeNotice}>
          <Sparkles size={13} />
          <span>Editable AI Output</span>
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Vendor Name</label>
          <input
            type="text"
            className={styles.input}
            value={vendor}
            onChange={e => setVendor(e.target.value)}
            required
            placeholder="e.g. Blue Hill NYC"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Date of Expense</label>
          <input
            type="date"
            className={styles.input}
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Total Amount</label>
          <input
            type="number"
            step="0.01"
            className={styles.input}
            value={totalAmount}
            onChange={e => setTotalAmount(e.target.value)}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Currency</label>
          <select
            className={styles.select}
            value={currency}
            onChange={e => setCurrency(e.target.value)}
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="INR">INR (₹)</option>
            <option value="CAD">CAD ($)</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>City Location</label>
          <select
            className={styles.select}
            value={city}
            onChange={e => setCity(e.target.value)}
          >
            <option value="New York">New York (Meal Cap $100)</option>
            <option value="San Francisco">San Francisco (Meal Cap $90)</option>
            <option value="Chicago">Chicago (Meal Cap $75)</option>
            <option value="Austin">Austin (Meal Cap $75)</option>
            <option value="Default">Other / Default ($75)</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Expense Category</label>
          <select
            className={styles.select}
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="Meals">Meals & Entertainment</option>
            <option value="Travel">Flights & Rail</option>
            <option value="Lodging">Lodging & Hotels</option>
            <option value="Office Supplies">Hardware & Office Supplies</option>
            <option value="Software">Software & Cloud Subscriptions</option>
            <option value="Other">Other Expenses</option>
          </select>
        </div>

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label className={styles.label}>Client / Project Name (Optional)</label>
          <input
            type="text"
            className={styles.input}
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            placeholder="e.g. Acme Corp Hackathon Sprint"
          />
        </div>
      </div>

      {/* Line Items Editor */}
      <div className={styles.lineItemsSection}>
        <div className={styles.lineItemsHeader}>
          <h4 className={styles.lineItemsTitle}>Itemized Line Items ({lineItems.length})</h4>
          <button
            type="button"
            className={styles.addItemButton}
            onClick={handleAddLineItem}
          >
            <Plus size={14} />
            <span>Add Item</span>
          </button>
        </div>

        {lineItems.length === 0 ? (
          <div className={styles.emptyLineItems}>
            No itemized items detected. Click "Add Item" to add line item breakdown.
          </div>
        ) : (
          <div className={styles.lineItemsList}>
            {lineItems.map((item, idx) => (
              <div key={idx} className={styles.lineItemRow}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Item description (e.g. Business Lunch)"
                  value={item.description}
                  onChange={e => handleUpdateLineItem(idx, 'description', e.target.value)}
                />
                <input
                  type="number"
                  step="0.01"
                  className={styles.input}
                  placeholder="0.00"
                  value={item.amount}
                  onChange={e => handleUpdateLineItem(idx, 'amount', e.target.value)}
                />
                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() => handleRemoveLineItem(idx)}
                  title="Remove line item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.actionsRow}>
        <button type="submit" className={styles.saveButton}>
          <Check size={16} />
          <span>{savedSuccess ? 'Details Updated!' : 'Confirm & Re-evaluate Policy'}</span>
        </button>
      </div>
    </form>
  );
};

export default EditableReceiptForm;

