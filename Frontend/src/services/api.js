import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Axios instance with timeout and base URL
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 45000,
});

/**
 * Authenticate user against Backend logins table
 * @param {string} username
 * @param {string} password
 */
export async function login(username, password) {
  try {
    const response = await apiClient.post('/api/login', { username, password });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail ||
      error.message ||
      'Invalid username or password'
    );
  }
}

/**
 * Register user into Backend logins table
 * @param {string} username
 * @param {string} password
 * @param {string} role
 * @param {string|null} employeeId
 */
export async function register(username, password, role = 'Employee', employeeId = null) {
  try {
    const response = await apiClient.post('/api/register', {
      username,
      password,
      role,
      employee_id: employeeId
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail ||
      error.message ||
      'Registration failed'
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
      'Failed to reach receipt processing engine at http://localhost:8000'
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
    console.warn('Backend /api/session not reachable, using local storage cache:', error);
    const cached = localStorage.getItem('rgr_session_cache');
    if (cached) {
      return JSON.parse(cached);
    }
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
    localStorage.removeItem('rgr_session_cache');
    return response.data;
  } catch (error) {
    console.error('Failed to reset backend session:', error);
    localStorage.removeItem('rgr_session_cache');
    return { success: true, message: 'Session reset locally' };
  }
}

/**
 * Trigger CSV export download
 */
export async function exportCSV() {
  try {
    const response = await apiClient.get('/api/export-csv', {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'receipt_graveyard_expenses.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.warn('Backend CSV export failed, generating CSV from session history:', error);
    const session = await getSession();
    let csvContent = 'data:text/csv;charset=utf-8,Date,Vendor,Total Amount,Currency,Status,Reimbursement Amount,Flags\n';
    session.history.forEach((item) => {
      const r = item.receipt || {};
      const v = item.result || {};
      const row = [
        `"${r.date || 'N/A'}"`,
        `"${(r.vendor || 'UNKNOWN').replace(/"/g, '""')}"`,
        r.total_amount || 0,
        `"${r.currency || 'USD'}"`,
        `"${v.status || 'UNKNOWN'}"`,
        v.reimbursement_amount || 0,
        `"${(v.flags || []).join('; ').replace(/"/g, '""')}"`,
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'receipt_graveyard_expenses.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export default {
  processReceipt,
  getSession,
  resetSession,
  exportCSV,
};

