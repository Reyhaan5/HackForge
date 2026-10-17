import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { clearAccessToken, getSession, resetSession as apiResetSession } from '../services/api';

const DEFAULT_MONTHLY_LIMIT = 2000.0;

const ReceiptContext = createContext(undefined);

export const ReceiptProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const sessionRequestRef = useRef(0);

  const [history, setHistory] = useState([]);
  const monthlySpent = useMemo(
    () => history
      .filter(item => item.result?.status === 'APPROVED' || item.result?.status === 'PENDING_APPROVAL')
      .reduce((total, item) => total + (Number(item.result?.reimbursement_amount) || 0), 0),
    [history]
  );

  const loginUser = useCallback((userData) => {
    setUser(userData);
  }, []);

  const logoutUser = useCallback(() => {
    clearAccessToken();
    setUser(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const requestId = ++sessionRequestRef.current;
    try {
      const data = await getSession();
      if (requestId !== sessionRequestRef.current) return;
      const backendItems = (data?.history || []).map((item, index) => ({
        ...item,
        id: item.id || `backend_${index}_${item.timestamp || 'session'}`,
        receipt: item.receipt || {},
        result: item.result || {},
        city: item.city || 'New York',
        category: item.category || 'General Expense',
        client_name: item.client_name || '',
        imageUrl: item.imageUrl || undefined,
        timestamp: item.timestamp || new Date().toISOString()
      }));

      setHistory(current => {
        const backendIds = new Set(backendItems.map(item => item.id));
        const localItems = current.filter(item => !backendIds.has(item.id));
        return [...backendItems, ...localItems];
      });
    } catch (err) {
      console.warn('Could not refresh receipt history:', err);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(refreshSession, 0);
    return () => window.clearTimeout(timer);
  }, [refreshSession]);

  const addProcessedReceipt = useCallback(
    (res, metadata) => {
      const newItem = {
        id: `rec_${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
        receipt: res.extracted,
        result: res.validation,
        city: metadata.city,
        category: metadata.category,
        client_name: metadata.client_name,
        imageUrl: metadata.imageUrl
      };

      setHistory(prev => [newItem, ...prev]);
      return newItem.id;
    },
    []
  );

  const updateProcessedReceipt = useCallback((id, result, metadata) => {
    setHistory(history => history.map(item => item.id === id ? {
      ...item,
      receipt: result.extracted,
      result: result.validation,
      city: metadata?.city ?? item.city,
      category: metadata?.category ?? item.category,
      client_name: metadata?.clientName ?? item.client_name
    } : item));
  }, []);

  const updateReceiptStatus = useCallback((id, newStatus) => {
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
  }, []);

  const resetAllData = useCallback(async () => {
    sessionRequestRef.current += 1;
    try {
      if (['Admin', 'Finance'].includes(user?.role)) {
        await apiResetSession();
      }
    } finally {
      setHistory([]);
    }
  }, [user]);

  return (
    <ReceiptContext.Provider
      value={{
        user,
        loginUser,
        logoutUser,
        monthlySpent,
        monthlyLimit: DEFAULT_MONTHLY_LIMIT,
        history,
        refreshSession,
        addProcessedReceipt,
        updateProcessedReceipt,
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

