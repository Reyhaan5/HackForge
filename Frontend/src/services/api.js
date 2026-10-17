import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Axios instance with timeout and base URL
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 45000,
});

let accessToken = null;

export function clearAccessToken() {
  accessToken = null;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) clearAccessToken();
    return Promise.reject(error);
  }
);

/**
 * Authenticate user against Backend logins table
 * @param {string} username
 * @param {string} password
 */
export async function login(username, password) {
  try {
    const response = await apiClient.post('/api/login', { username, password });
    accessToken = response.data?.token || null;
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail ||
      error.message ||
      'Invalid username or password',
      { cause: error }
    );
  }
}

/**
 * Register user into Backend logins table
 * @param {string} username
 * @param {string} password
 */
export async function register(username, password) {
  try {
    const response = await apiClient.post('/api/register', {
      username,
      password
    });
    accessToken = response.data?.token || null;
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail ||
      error.message ||
      'Registration failed',
      { cause: error }
    );
  }
}

/**
 * Process a receipt image by uploading it to FastAPI backend
 * @param {File} file
 * @param {string} city
 * @param {string} category
 * @param {string} clientName
 */
export async function processReceipt(
  file,
  city = 'New York',
  category = 'Meals',
  clientName = ''
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('city', city);
  formData.append('category', category);
  formData.append('client_name', clientName);

  try {
    const response = await apiClient.post('/api/process-receipt', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to process receipt with backend:', error);
    throw new Error(
      error.response?.data?.error ||
      error.message ||
      'Failed to reach receipt processing engine at http://localhost:8000',
      { cause: error }
    );
  }
}

/**
 * Fetch current session details including hashes, monthly total, and history
 */
export async function getSession() {
  try {
    const response = await apiClient.get('/api/session');
    return response.data;
  } catch (error) {
    console.warn('Backend /api/session not reachable:', error);
    return {
      processed_hashes: [],
      monthly_spent: 0,
      history: [],
    };
  }
}

/**
 * Reset session store on the backend
 */
export async function resetSession() {
  try {
    const response = await apiClient.post('/api/reset-session');
    return response.data;
  } catch (error) {
    console.error('Failed to reset backend session:', error);
    return { success: true, message: 'Session reset locally' };
  }
}

/**
 * Trigger CSV export download
 */
export function exportCSV(history = []) {
  const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['Date', 'Vendor', 'Total Amount', 'Currency', 'Status', 'Reimbursement Amount', 'Flags'],
    ...history.map(({ receipt = {}, result = {} }) => [
      receipt.date || 'N/A',
      receipt.vendor || 'UNKNOWN',
      receipt.total_amount || 0,
      receipt.currency || 'USD',
      result.status || 'UNKNOWN',
      result.reimbursement_amount || 0,
      (result.flags || []).join('; ')
    ])
  ];
  const csv = rows.map(row => row.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'receipt_graveyard_expenses.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default {
  processReceipt,
  getSession,
  resetSession,
  exportCSV,
};

