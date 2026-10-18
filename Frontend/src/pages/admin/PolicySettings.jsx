import { useEffect, useState } from 'react';
import { Plus, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { getPolicy, updatePolicy } from '../../services/api';
import { useReceipts } from '../../context/ReceiptContext';
import styles from './PolicySettings.module.css';

const defaults = {
  monthly_limit: 167000,
  approval_threshold: 16700,
  client_meal_per_person_limit: 5010,
  city_daily_caps: { 'New York': 8350, 'San Francisco': 7515, Chicago: 6263, Austin: 6263, Default: 6263 },
  category_caps: { 'Office Supplies': 12525, Transport: 8350 },
  non_reimbursable_keywords: ['alcohol', 'wine', 'beer', 'liquor', 'cocktail', 'spa', 'massage', 'movie', 'casino', 'gift', 'tobacco'],
};

const asAmount = value => value === '' ? '' : Number(value);

export default function PolicySettings() {
  const { refreshSession } = useReceipts();
  const [rules, setRules] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getPolicy().then(data => setRules({ ...defaults, ...data.rules }))
      .catch(() => setError('Could not load the active policy. Refresh the page to try again.'))
      .finally(() => setLoading(false));
  }, []);

  const setAmount = (key, value) => setRules(current => ({ ...current, [key]: asAmount(value) }));
  const setNamedAmount = (key, name, field, value) => setRules(current => {
    const entries = { ...current[key] };
    if (field === 'name') {
      const next = {};
      Object.entries(entries).forEach(([oldName, amount]) => { next[oldName === name ? value : oldName] = amount; });
      return { ...current, [key]: next };
    }
    entries[name] = asAmount(value);
    return { ...current, [key]: entries };
  });
  const addNamedAmount = key => setRules(current => {
    const entries = { ...current[key] };
    let suffix = Object.keys(entries).length + 1;
    let name = `New rule ${suffix}`;
    while (name in entries) name = `New rule ${++suffix}`;
    entries[name] = 0;
    return { ...current, [key]: entries };
  });
  const removeNamedAmount = (key, name) => setRules(current => {
    const entries = { ...current[key] };
    delete entries[name];
    return { ...current, [key]: entries };
  });

  async function save(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      const payload = {
        ...rules,
        monthly_limit: Number(rules.monthly_limit),
        approval_threshold: Number(rules.approval_threshold),
        client_meal_per_person_limit: Number(rules.client_meal_per_person_limit),
        city_daily_caps: Object.fromEntries(Object.entries(rules.city_daily_caps).map(([name, value]) => [name.trim(), Number(value)])),
        category_caps: Object.fromEntries(Object.entries(rules.category_caps).map(([name, value]) => [name.trim(), Number(value)])),
        non_reimbursable_keywords: rules.non_reimbursable_keywords.map(word => word.trim().toLowerCase()).filter(Boolean),
      };
      if ([payload.monthly_limit, payload.approval_threshold, payload.client_meal_per_person_limit].some(value => !Number.isFinite(value) || value < 0)) {
        throw new Error('Enter a valid zero or positive amount for each policy limit.');
      }
      if ([...Object.entries(payload.city_daily_caps), ...Object.entries(payload.category_caps)].some(([name, amount]) => !name || !Number.isFinite(amount) || amount < 0)) {
        throw new Error('Each city and category needs a name and a zero or positive amount.');
      }
      const response = await updatePolicy(payload);
      setRules({ ...defaults, ...response.rules });
      await refreshSession();
      setMessage('Policy saved. New receipt submissions will use these rules.');
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Policy could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className={styles.loading} role="status">Loading active policy…</p>;

  return <div className={styles.page}>
    <header className={styles.intro}>
      <div><h2>Policy settings</h2></div>
      <div className={styles.adminMark}><ShieldCheck size={17} /> Admin controls</div>
    </header>

    <form onSubmit={save} className={styles.form}>
      <section className={styles.section}>
          <div className={styles.sectionHeading}><div><h3>Spending & approvals</h3><p>Limits are evaluated in Indian rupees.</p></div></div>
        <div className={styles.amountGrid}>
          <label className={styles.field}>Monthly employee budget
            <span className={styles.amountInput}><span>₹</span><input type="number" min="0" step="0.01" required value={rules.monthly_limit} onChange={e => setAmount('monthly_limit', e.target.value)} /></span>
            <small>Maximum reimbursable spend per employee each month.</small>
          </label>
          <label className={styles.field}>Manager approval threshold
            <span className={styles.amountInput}><span>₹</span><input type="number" min="0" step="0.01" required value={rules.approval_threshold} onChange={e => setAmount('approval_threshold', e.target.value)} /></span>
            <small>Expenses above this amount are sent for manager review.</small>
          </label>
          <label className={styles.field}>Client meal allowance per person
            <span className={styles.amountInput}><span>₹</span><input type="number" min="0" step="0.01" required value={rules.client_meal_per_person_limit} onChange={e => setAmount('client_meal_per_person_limit', e.target.value)} /></span>
            <small>Applied to client meals using the attendee count.</small>
          </label>
        </div>
      </section>

      {[['city_daily_caps', 'City daily meal caps', 'Daily meal reimbursement limits by city. A Default rule covers unlisted cities.'], ['category_caps', 'Category spending caps', 'Maximum reimbursable amount for selected expense categories.']].map(([key, title, description]) => (
        <section className={styles.section} key={key}>
          <div className={styles.sectionHeading}><div><h3>{title}</h3><p>{description}</p></div><button type="button" className={styles.addButton} onClick={() => addNamedAmount(key)}><Plus size={16} /> Add rule</button></div>
          <div className={styles.ruleRows}>
            {Object.entries(rules[key] || {}).map(([name, amount], index) => <div className={styles.ruleRow} key={`${key}-${index}`}>
              <label className={styles.srOnly}>{title} name</label><input aria-label={`${title} name`} value={name} onChange={e => setNamedAmount(key, name, 'name', e.target.value)} required />
              <label className={styles.srOnly}>{title} amount</label><span className={styles.amountInput}><span>₹</span><input aria-label={`${name} cap in INR`} type="number" min="0" step="0.01" value={amount} onChange={e => setNamedAmount(key, name, 'amount', e.target.value)} required /></span>
              <button type="button" className={styles.removeButton} aria-label={`Remove ${name}`} onClick={() => removeNamedAmount(key, name)}><Trash2 size={16} /></button>
            </div>)}
            {Object.keys(rules[key] || {}).length === 0 && <p className={styles.empty}>No caps configured. Add a rule to set a limit.</p>}
          </div>
        </section>
      ))}

      <section className={styles.section}>
        <div className={styles.sectionHeading}><div><h3>Non-reimbursable keywords</h3><p>Matching receipt line items are excluded from reimbursement.</p></div></div>
        <label className={styles.field}>Restricted terms<textarea rows="4" value={(rules.non_reimbursable_keywords || []).join(', ')} onChange={e => setRules(current => ({ ...current, non_reimbursable_keywords: e.target.value.split(/[\n,]+/) }))} placeholder="alcohol, wine, spa, casino" /><small>Separate terms with commas or line breaks. Matching ignores letter case.</small></label>
      </section>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {message && <p className={styles.success} role="status">{message}</p>}
      <footer className={styles.footer}><span>Changes are stored in the active backend policy.</span><button className={styles.saveButton} type="submit" disabled={saving}><Save size={16} />{saving ? 'Saving…' : 'Save policy'}</button></footer>
    </form>
  </div>;
}
