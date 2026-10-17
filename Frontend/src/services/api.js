import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Axios instance with timeout and base URL
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 45000,
});

const TOKEN_KEY = 'hackforge.accessToken';
let accessToken = null;
try {
  accessToken = typeof window === 'undefined' ? null : window.sessionStorage.getItem(TOKEN_KEY);
} catch {
  accessToken = null;
}

export function getAccessToken() {
  return accessToken;
}

function setAccessToken(token) {
  accessToken = token || null;
  if (typeof window !== 'undefined') {
    if (accessToken) window.sessionStorage.setItem(TOKEN_KEY, accessToken);
    else window.sessionStorage.removeItem(TOKEN_KEY);
  }
}

export function clearAccessToken() {
  setAccessToken(null);
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
    if (error.response?.status === 401) {
      clearAccessToken();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('hackforge:unauthorized'));
    }
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
    setAccessToken(response.data?.token);
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
    setAccessToken(response.data?.token);
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
  clientName = '',
  { employeeId, attendeeCount = 1 } = {}
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('city', city);
  formData.append('category', category);
  formData.append('client_name', clientName);
  formData.append('attendee_count', String(attendeeCount));
  if (employeeId) formData.append('employee_id', employeeId);

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
      error.response?.data?.detail ||
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
  const response = await apiClient.get('/api/session');
  return response.data;
}

export async function getEmployees() {
  const response = await apiClient.get('/api/employees');
  return response.data;
}

export async function getPolicy() {
  const response = await apiClient.get('/api/policy');
  return response.data;
}

/**
 * Reset session store on the backend
 */
export async function resetSession() {
  const response = await apiClient.post('/api/reset-session');
  return response.data;
}

/**
 * Trigger CSV export download
 */
export async function exportCSV() {
  const response = await apiClient.get('/api/export-csv', { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  const disposition = response.headers['content-disposition'];
  link.download = disposition?.match(/filename="?([^";]+)"?/i)?.[1] || 'receipts_export.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default {
  processReceipt,
  getSession,
  resetSession,
  exportCSV,
};

