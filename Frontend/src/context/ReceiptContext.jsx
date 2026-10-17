import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { clearAccessToken, getAccessToken, getPolicy, getSession, resetSession as apiResetSession, updateReceiptStatus as apiUpdateReceiptStatus } from '../services/api';

const DEFAULT_MONTHLY_LIMIT = 2000.0;

const ReceiptContext = createContext(undefined);

export const ReceiptProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return getAccessToken() ? JSON.parse(window.sessionStorage.getItem('hackforge.user') || 'null') : null;
    } catch {
      return null;
    }
  });
  const sessionRequestRef = useRef(0);

  const [history, setHistory] = useState([]);
  const [monthlySpent, setMonthlySpent] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(DEFAULT_MONTHLY_LIMIT);
  const [policyRules, setPolicyRules] = useState(null);

  const loginUser = useCallback((userData) => {
    sessionRequestRef.current += 1;
    setHistory([]);
    setMonthlySpent(0);
    window.sessionStorage.setItem('hackforge.user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logoutUser = useCallback(() => {
    sessionRequestRef.current += 1;
    clearAccessToken();
    window.sessionStorage.removeItem('hackforge.user');
    setUser(null);
    setHistory([]);
    setMonthlySpent(0);
  }, []);

  useEffect(() => {
    window.addEventListener('hackforge:unauthorized', logoutUser);
    return () => window.removeEventListener('hackforge:unauthorized', logoutUser);
  }, [logoutUser]);

  const refreshSession = useCallback(async () => {
    const requestId = ++sessionRequestRef.current;
    try {
      const data = await getSession();
      if (requestId !== sessionRequestRef.current) return;
      setMonthlySpent(Number(data?.monthly_spent) || 0);
      const backendItems = (data?.history || []).map((item, index) => ({
        ...item,
        id: item.id || `backend_${index}_${item.timestamp || 'session'}`,
        receipt: item.receipt || {},
        result: item.result || {},
        city: item.city || 'New York',
        category: item.category || 'General Expense',
        client_name: item.client_name || '',
        submission_channel: item.submission_channel || 'web',
        imageUrl: item.imageUrl || undefined,
        timestamp: item.timestamp || new Date().toISOString()
      }));

      setHistory(current => {
        const localById = new Map(current.map(item => [item.id, item]));
        return backendItems.map(item => ({ ...localById.get(item.id), ...item, imageUrl: localById.get(item.id)?.imageUrl }));
      });
    } catch (err) {
      console.warn('Could not refresh receipt history:', err);
      if (err.response?.status === 401) {
        clearAccessToken();
        window.sessionStorage.removeItem('hackforge.user');
        setUser(null);
        setHistory([]);
      }
    }
    try {
      const policy = await getPolicy();
      if (requestId === sessionRequestRef.current) {
        setPolicyRules(policy?.rules || null);
        setMonthlyLimit(Number(policy?.rules?.monthly_limit) || DEFAULT_MONTHLY_LIMIT);
      }
    } catch (err) {
      console.warn('Could not load backend expense policy:', err);
    }
  }, []);

  useEffect(() => {
    if (!user || !getAccessToken()) return undefined;
    const timer = window.setTimeout(refreshSession, 0);
    return () => window.clearTimeout(timer);
  }, [user, refreshSession]);

  const addProcessedReceipt = useCallback(
    (res, metadata) => {
      const newItem = {
        id: res.receipt_id != null ? `rec_${res.receipt_id}` : `rec_${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
        receipt: res.extracted,
        result: res.validation,
        city: metadata.city,
        category: metadata.category,
        client_name: metadata.client_name,
        submission_channel: metadata.submission_channel || res.submission_channel || 'web',
        imageUrl: metadata.imageUrl
      };

      setHistory(prev => [newItem, ...prev]);
      return newItem.id;
    },
    []
  );

  const updateReceiptStatus = useCallback(async (id, newStatus, notes = '') => {
    // 1. Optimistic local state update
    setHistory(prev =>
      prev.map(item => {
        if (item.id === id) {
          const reimbAmt =
            newStatus === 'APPROVED' ? Number(item.receipt?.total_amount) || 0 : 0;
          return {
            ...item,
            result: {
              ...item.result,
              status: newStatus,
              reimbursement_amount: reimbAmt,
              flags:
                newStatus === 'APPROVED'
                  ? (item.result.flags || []).filter(f => !f.includes('Requires manager approval'))
                  : item.result.flags
            }
          };
        }
        return item;
      })
    );

    // 2. Persistent Backend update to PostgreSQL
    try {
      await apiUpdateReceiptStatus(id, newStatus, notes);
    } catch (err) {
      console.error('Failed to persist receipt status to backend:', err);
    }
  }, []);

  const resetAllData = useCallback(async () => {
    if (!['Admin', 'Finance'].includes(user?.role)) {
      throw new Error('Only Admin or Finance accounts can reset backend receipts.');
    }
    sessionRequestRef.current += 1;
    await apiResetSession();
    setHistory([]);
    setMonthlySpent(0);
  }, [user]);

  return (
    <ReceiptContext.Provider
      value={{
        user,
        loginUser,
        logoutUser,
        monthlySpent,
        monthlyLimit,
        policyRules,
        history,
        refreshSession,
        addProcessedReceipt,
        updateReceiptStatus,
        resetAllData
      }}
    >
      {children}
    </ReceiptContext.Provider>
  );
};

// Context hooks are intentionally exported alongside their provider.
// eslint-disable-next-line react-refresh/only-export-components
export const useReceipts = () => {
  const context = useContext(ReceiptContext);
  if (!context) {
    throw new Error('useReceipts must be used within a ReceiptProvider');
  }
  return context;
};

export default ReceiptContext;

