import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Axios instance with timeout and base URL
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 45000,
});

const TOKEN_KEY='hackforge.accessToken';
let accessToken=null;
try {
  accessToken=typeof window === 'undefined' ? null:window.sessionStorage.getItem(TOKEN_KEY);
} catch {
  accessToken=null;
}

export function getAccessToken() {
  return accessToken;
}

function setAccessToken(token) {
  accessToken=token || null;
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
    config.headers.Authorization=`Bearer ${accessToken}`;
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
  city,
  category,
  clientName='',
  optionsOrChannel='web',
  employeeId,
  attendeeCount=1
) {
  let submissionChannel;
  let empId=employeeId;
  let attendees=attendeeCount;

  if (typeof optionsOrChannel === 'object' && optionsOrChannel !== null) {
    submissionChannel=optionsOrChannel.submissionChannel || 'web';
    empId=optionsOrChannel.employeeId;
    attendees=optionsOrChannel.attendeeCount ?? 1;
  } else {
    submissionChannel=optionsOrChannel || 'web';
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('city', city);
  formData.append('category', category);
  formData.append('client_name', clientName);
  formData.append('submission_channel', submissionChannel);
  formData.append('attendee_count', String(attendees));
  if (empId) formData.append('employee_id', empId);

  const controller=new AbortController();
  const timeoutId=setTimeout(() => controller.abort(), 120000);
  try {
    // Let the browser create the multipart Content-Type boundary. Axios
    // interceptors or default headers can otherwise leave FastAPI unable to
    // parse the uploaded form body.
    const response=await fetch(`${BASE_URL}/api/process-receipt`, {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` }:{},
      body: formData,
      signal: controller.signal,
    });
    const data=await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        clearAccessToken();
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('hackforge:unauthorized'));
      }
      throw Object.assign(new Error(data.detail || data.error || `Request failed (${response.status})`), {
        status: response.status,
        responseData: data,
      });
    }
    return data;
  } catch (error) {
    const backendMessage=error.responseData?.detail || error.responseData?.error;
    console.error('Failed to process receipt with backend:', JSON.stringify({
      status: error.status,
      message: backendMessage || error.message,
      response: error.responseData,
    }));
    throw new Error(
      backendMessage ||
      error.message ||
      'Failed to reach receipt processing engine at http://localhost:8000',
      { cause: error }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch current session details including hashes, monthly total, and history
 */
export async function getSession() {
  const response=await apiClient.get('/api/session');
  return response.data;
}

export async function getEmployees() {
  const response=await apiClient.get('/api/employees');
  return response.data;
}

export async function getPolicy() {
  const response=await apiClient.get('/api/policy');
  return response.data;
}

export async function updatePolicy(rules) {
  const response=await apiClient.put('/api/policy', rules);
  return response.data;
}

/**
 * Reset session store on the backend
 */
export async function resetSession() {
  const response=await apiClient.post('/api/reset-session');
  return response.data;
}

/**
 * Trigger CSV export download
 */
export async function exportCSV() {
  const response=await apiClient.get('/api/export-csv', { responseType: 'blob' });
  const url=URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  const disposition=response.headers['content-disposition'];
  link.download=disposition?.match(/filename="?([^";]+)"?/i)?.[1] || 'receipts_export.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Update receipt status on the backend (Approve / Reject)
 * @param {number|string} receiptId
 * @param {string} status 'APPROVED' | 'REJECTED'
 * @param {string} notes
 */
export async function updateReceiptStatus(receiptId, status, notes='') {
  const numericId=String(receiptId).replace(/^rec_/, '');
  const response=await apiClient.patch(`/api/receipts/${numericId}/status`, {
    status,
    notes,
  });
  return response.data;
}

/**
 * Ingest receipt via simulated email forwarding (Channel A)
 */
export async function simulateEmailReceipt(file, fromEmail, subject, body = '') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('from_email', fromEmail);
  formData.append('subject', subject);
  formData.append('body', body);

  const response = await apiClient.post('/api/ingest/email/simulate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

/**
 * Check IMAP inbox listener configuration status
 */
export async function getEmailIngestStatus() {
  const response = await apiClient.get('/api/ingest/email/status');
  return response.data;
}

/**
 * Trigger manual check of IMAP inbox
 */
export async function syncEmailInbox(maxEmails = 10) {
  const response = await apiClient.post(`/api/ingest/email/sync?max_emails=${maxEmails}`);
  return response.data;
}

/**
 * Check S3 Bucket ingestion status
 */
export async function getS3IngestStatus() {
  const response = await apiClient.get('/api/ingest/s3/status');
  return response.data;
}

/**
 * Trigger manual sync of S3 bucket inbox/ folder
 */
export async function syncS3Inbox(maxItems = 20) {
  const response = await apiClient.post(`/api/ingest/s3/sync?max_items=${maxItems}`);
  return response.data;
}

/**
 * Ingest receipt via simulated S3 upload (Channel B)
 */
export async function simulateS3Receipt(file, employeeId, filename = null) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('employee_id', employeeId);
  if (filename) formData.append('filename', filename);

  const response = await apiClient.post('/api/ingest/s3/simulate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export default {
  processReceipt,
  getSession,
  resetSession,
  exportCSV,
  updateReceiptStatus,
  simulateEmailReceipt,
  getEmailIngestStatus,
  syncEmailInbox,
  getS3IngestStatus,
  syncS3Inbox,
  simulateS3Receipt,
};


