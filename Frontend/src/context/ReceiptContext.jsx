import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSession, resetSession as apiResetSession } from '../services/api';

const DEFAULT_MONTHLY_LIMIT = 2000.0;

// High quality initial seed data so the dashboard & admin queue look alive immediately
const INITIAL_SEED_ITEMS = [
  {
    id: 'rec_101',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    city: 'New York',
    category: 'Meals',
    client_name: 'Acme Corp Partner Dinner',
    imageUrl: 'https://images.unsplash.com/photo-1554415707-9e4c299e3231?auto=format&fit=crop&w=600&q=80',
    receipt: {
      vendor: 'Blue Hill At Stone Barns',
      date: '2026-10-15',
      total_amount: 88.50,
      currency: 'USD',
      is_itemized: true,
      line_items: [
        { description: 'Artisanal Bread & Farm Butter', amount: 14.50 },
        { description: 'Roasted Organic Hen & Squash', amount: 52.00 },
        { description: 'Espresso & Herbal Tisane', amount: 22.00 }
      ]
    },
    result: {
      status: 'APPROVED',
      flags: [],
      reimbursement_amount: 88.50
    }
  },
  {
    id: 'rec_102',
    timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
    city: 'San Francisco',
    category: 'Meals',
    client_name: 'Tech Partner Synapse',
    imageUrl: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=600&q=80',
    receipt: {
      vendor: 'Benu Bistro SF',
      date: '2026-10-14',
      total_amount: 142.00,
      currency: 'USD',
      is_itemized: true,
      line_items: [
        { description: 'Chef Tasting Platter', amount: 98.00 },
        { description: 'Artisan Sparkling Water', amount: 14.00 },
        { description: 'Pinot Noir Glass (Alcohol)', amount: 30.00 }
      ]
    },
    result: {
      status: 'FLAGGED',
      flags: [
        '⚠️ Over San Francisco cap: $142.00 exceeds $90.00 limit',
        "🚫 Non-reimbursable item detected: 'pinot noir'"
      ],
      reimbursement_amount: 0.0
    }
  },
  {
    id: 'rec_103',
    timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
    city: 'Austin',
    category: 'Lodging',
    client_name: 'FOSS Hackathon Keynote',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
    receipt: {
      vendor: 'The Line Hotel Austin',
      date: '2026-10-12',
      total_amount: 245.00,
      currency: 'USD',
      is_itemized: true,
      line_items: [
        { description: 'Standard King Room 1 Night', amount: 215.00 },
        { description: 'City Tourism Tax', amount: 30.00 }
      ]
    },
    result: {
      status: 'PENDING_APPROVAL',
      flags: [
        '🔒 Requires manager approval (>$200.00)'
      ],
      reimbursement_amount: 245.00
    }
  },
  {
    id: 'rec_104',
    timestamp: new Date(Date.now() - 3600000 * 72).toISOString(),
    city: 'Chicago',
    category: 'Office Supplies',
    client_name: 'Internal Dev Equipment',
    imageUrl: 'https://images.unsplash.com/photo-1588508065123-287b28e013da?auto=format&fit=crop&w=600&q=80',
    receipt: {
      vendor: 'Micro Center Chicago',
      date: '2026-10-10',
      total_amount: 68.20,
      currency: 'USD',
      is_itemized: true,
      line_items: [
        { description: 'USB-C Thunderbolt Hub', amount: 49.99 },
        { description: 'Cat6 Ethernet 25ft Cable', amount: 18.21 }
      ]
    },
    result: {
      status: 'APPROVED',
      flags: [],
      reimbursement_amount: 68.20
    }
  }
];

const ReceiptContext = createContext(undefined);

export const ReceiptProvider = ({ children }) => {
  const [user, setUser] = useState({
    username: 'alice',
    role: 'Employee',
    employee_id: 'EMP-101',
    name: 'Alice Johnson',
    department: 'Sales'
  });

  const [role, setRole] = useState('employee');

  const loginUser = useCallback((userData) => {
    setUser(userData);
    const r = (userData?.role || 'employee').toLowerCase();
    setRole(r === 'admin' ? 'admin' : 'employee');
  }, []);

  const logoutUser = useCallback(() => {
    setUser(null);
  }, []);

  useEffect(() => {
    localStorage.setItem('rgr_history_cache', JSON.stringify(history));
    const spent = history
      .filter(item => item.result.status === 'APPROVED' || item.result.status === 'PENDING_APPROVAL')
      .reduce((acc, curr) => acc + (curr.result.reimbursement_amount || 0), 0);
    setMonthlySpent(spent);
    localStorage.setItem('rgr_monthly_spent', spent.toString());
  }, [history]);

  const toggleRole = useCallback(() => {
    setRole(prev => (prev === 'employee' ? 'admin' : 'employee'));
  }, []);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSession();
      if (data && data.history && data.history.length > 0) {
        const backendItems = data.history.map((h, idx) => ({
          id: h.id || `backend_${idx}_${Date.now()}`,
          receipt: h.receipt,
          result: h.result,
          city: h.city || 'New York',
          category: h.category || 'General Expense',
          client_name: h.client_name || '',
          imageUrl: h.imageUrl || undefined,
          timestamp: h.timestamp || new Date().toISOString()
        }));

        setHistory(prev => {
          const existingIds = new Set(backendItems.map(b => b.id));
          const uniquePrev = prev.filter(p => !existingIds.has(p.id));
          return [...backendItems, ...uniquePrev];
        });
      }
    } catch (err) {
      console.warn('Session refresh from backend had warning:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const addProcessedReceipt = useCallback(
    (res, metadata) => {
      const newItem = {
        id: `rec_${Date.now()}`,
        timestamp: new Date().toISOString(),
        receipt: res.extracted,
        result: res.validation,
        city: metadata.city,
        category: metadata.category,
        client_name: metadata.client_name,
        imageUrl: metadata.imageUrl
      };

      setHistory(prev => [newItem, ...prev]);
    },
    []
  );

  const updateReceiptStatus = useCallback((id, newStatus) => {
    setHistory(prev =>
      prev.map(item => {
        if (item.id === id) {
          const reimbAmt =
            newStatus === 'APPROVED' ? item.receipt.total_amount : 0.0;
          return {
            ...item,
            result: {
              ...item.result,
              status: newStatus,
              reimbursement_amount: reimbAmt,
              flags:
                newStatus === 'APPROVED'
                  ? item.result.flags.filter(f => !f.includes('Requires manager approval'))
                  : item.result.flags
            }
          };
        }
        return item;
      })
    );
  }, []);

  const resetAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiResetSession();
    } catch (err) {
      console.warn('Backend reset call warning:', err);
    }
    setHistory([]);
    setMonthlySpent(0);
    localStorage.removeItem('rgr_history_cache');
    localStorage.removeItem('rgr_monthly_spent');
    setIsLoading(false);
  }, []);

  return (
    <ReceiptContext.Provider
      value={{
        user,
        loginUser,
        logoutUser,
        role,
        setRole,
        toggleRole,
        monthlySpent,
        monthlyLimit: DEFAULT_MONTHLY_LIMIT,
        history,
        isLoading,
        error,
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

export const useReceipts = () => {
  const context = useContext(ReceiptContext);
  if (!context) {
    throw new Error('useReceipts must be used within a ReceiptProvider');
  }
  return context;
};

export default ReceiptContext;

