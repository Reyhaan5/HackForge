import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ReceiptProvider } from './context/ReceiptContext';
import { ThemeProvider } from './context/ThemeProvider';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Receipt Graveyard Resolver Pages
const Login = lazy(() => import('./pages/Login'));
const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard/EmployeeDashboard'));
const SmartSubmit = lazy(() => import('./pages/SmartSubmit/SmartSubmit'));
const Expenses = lazy(() => import('./pages/Expenses/Expenses'));
const AdminQueue = lazy(() => import('./pages/AdminQueue/AdminQueue'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics/AdminAnalytics'));

const pageWithLayout = (page, requiredRole) => (
  <ProtectedRoute requiredRole={requiredRole}><Layout>{page}</Layout></ProtectedRoute>
);

export function App() {
  return (
    <ThemeProvider>
      <ReceiptProvider>
        <BrowserRouter>
          <Suspense fallback={<p role="status">Loading page...</p>}>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route path="/" element={pageWithLayout(<EmployeeDashboard />)} />
              <Route path="/submit" element={pageWithLayout(<SmartSubmit />)} />
              <Route path="/expenses" element={pageWithLayout(<Expenses />)} />

              <Route path="/admin/queue" element={pageWithLayout(<AdminQueue />, ['Admin', 'Finance'])} />
              <Route path="/admin/analytics" element={pageWithLayout(<AdminAnalytics />, ['Admin', 'Finance'])} />
              <Route path="/admin" element={<Navigate to="/admin/queue" replace />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ReceiptProvider>
    </ThemeProvider>
  );
}

export default App;
