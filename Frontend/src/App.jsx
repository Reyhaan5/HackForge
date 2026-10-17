import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ReceiptProvider } from './context/ReceiptContext';
import { ThemeProvider } from './context/ThemeProvider';
import Layout from './components/Layout/Layout';

// Receipt Graveyard Resolver Pages
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard/EmployeeDashboard';
import SmartSubmit from './pages/SmartSubmit/SmartSubmit';
import Expenses from './pages/Expenses/Expenses';
import AdminQueue from './pages/AdminQueue/AdminQueue';
import AdminAnalytics from './pages/AdminAnalytics/AdminAnalytics';

export function App() {
  return (
    <ThemeProvider>
      <ReceiptProvider>
        <BrowserRouter>
          <Routes>
            {/* Authentication */}
            <Route path="/login" element={<Login />} />

            {/* Employee Portal Routes */}
            <Route
              path="/"
              element={
                <Layout>
                  <EmployeeDashboard />
                </Layout>
              }
            />
            <Route
              path="/submit"
              element={
                <Layout>
                  <SmartSubmit />
                </Layout>
              }
            />
            <Route
              path="/expenses"
              element={
                <Layout>
                  <Expenses />
                </Layout>
              }
            />

            {/* Admin & Finance Routes */}
            <Route
              path="/admin/queue"
              element={
                <Layout>
                  <AdminQueue />
                </Layout>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <Layout>
                  <AdminAnalytics />
                </Layout>
              }
            />
            <Route
              path="/admin"
              element={<Navigate to="/admin/queue" replace />}
            />

            {/* Fallback to Employee Dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ReceiptProvider>
    </ThemeProvider>
  );
}

export default App;