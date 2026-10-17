import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Receipt,
  LayoutDashboard,
  UploadCloud,
  FileSpreadsheet,
  ShieldAlert,
  BarChart3,
  RotateCcw,
  Menu,
  X,
  User,
  ShieldCheck,
  LogOut,
  UserCircle
} from 'lucide-react';
import { useReceipts } from '../../context/ReceiptContext';
import styles from './Layout.module.css';

export const Layout = ({ children }) => {
  const { user, logoutUser, role, setRole, monthlySpent, monthlyLimit, history, resetAllData } = useReceipts();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const pendingCount = history.filter(
    item => item.result.status === 'PENDING_APPROVAL' || item.result.status === 'FLAGGED'
  ).length;

  const currentUser = user;

  const handleLogout = () => {
    if (logoutUser) logoutUser();
    navigate("/login");
  };

  const handleRoleToggle = (newRole) => {
    setRole(newRole);
    if (newRole === 'admin' && !location.pathname.startsWith('/admin')) {
      navigate('/admin/queue');
    } else if (newRole === 'employee' && location.pathname.startsWith('/admin')) {
      navigate('/');
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Employee Expense Dashboard';
      case '/submit':
        return 'Smart Receipt Resolver';
      case '/expenses':
        return 'My Expense Records';
      case '/admin/queue':
        return 'Admin Approval Queue';
      case '/admin/analytics':
        return 'Expense Analytics & Compliance';
      default:
        return 'Receipt Graveyard Resolver';
    }
  };

  const percentSpent = Math.min(100, Math.round((monthlySpent / monthlyLimit) * 100));

  return (
    <div className={styles.shell}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <Receipt size={22} strokeWidth={2.2} />
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>Graveyard Resolver</span>
            <span className={styles.brandSubtitle}>AI Receipt Engine</span>
          </div>
        </div>

        <nav className={styles.navSection}>
          <div className={styles.sectionGroup}>
            <span className={styles.sectionHeader}>Employee Portal</span>
            <NavLink
              to="/"
              end
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/submit"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              <UploadCloud size={18} />
              <span>Smart Submit</span>
            </NavLink>

            <NavLink
              to="/expenses"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              <FileSpreadsheet size={18} />
              <span>My Expenses</span>
            </NavLink>
          </div>

          <div className={styles.sectionGroup}>
            <span className={styles.sectionHeader}>Admin & Finance</span>
            <NavLink
              to="/admin/queue"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              <ShieldAlert size={18} />
              <span>Approval Queue</span>
              {pendingCount > 0 && <span className={styles.navBadge}>{pendingCount}</span>}
            </NavLink>

            <NavLink
              to="/admin/analytics"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              <BarChart3 size={18} />
              <span>Analytics</span>
            </NavLink>
          </div>
        </nav>

        {/* Monthly limit widget */}
        <div className={styles.sidebarFooter}>
          <div className={styles.budgetCard}>
            <div className={styles.budgetHeader}>
              <span>Monthly Budget</span>
              <span className={styles.budgetAmount}>
                ${monthlySpent.toFixed(2)} / ${monthlyLimit}
              </span>
            </div>
            <progress
              className={styles.progressBar}
              value={monthlySpent}
              max={monthlyLimit}
            />
            <div className={styles.budgetNotice}>
              {percentSpent}% consumed this cycle
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className={styles.mainContainer}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              className={styles.menuToggle}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className={styles.pageTitleContainer}>
              <h1 className={styles.pageTitle}>{getPageTitle()}</h1>
            </div>
          </div>

          <div className={styles.headerRight}>
            {/* Employee / Admin Toggle Switch */}
            <div className={styles.roleSwitchWrapper} role="group" aria-label="Role Switcher">
              <button
                type="button"
                onClick={() => handleRoleToggle('employee')}
                className={`${styles.roleOption} ${role === 'employee' ? styles.roleOptionActive : ''}`}
              >
                <User size={15} />
                <span>Employee</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleToggle('admin')}
                className={`${styles.roleOption} ${role === 'admin' ? styles.roleOptionActive : ''}`}
              >
                <ShieldCheck size={15} />
                <span>Admin</span>
              </button>
            </div>

            {/* Reset Session button */}
            <button
              type="button"
              className={styles.resetButton}
              onClick={async () => {
                if (window.confirm('Reset session and clear all processed receipts?')) {
                  await resetAllData();
                }
              }}
              title="Reset backend session memory"
            >
              <RotateCcw size={15} />
              <span>Reset Session</span>
            </button>

            {/* Logged in user info */}
            {currentUser && (
              <div className={styles.userBadge}>
                <UserCircle size={16} />
                <span>{currentUser.username || 'User'}</span>
              </div>
            )}

            {/* Sign Out / Switch account */}
            <button
              type="button"
              className={styles.logoutButton}
              onClick={handleLogout}
              title="Sign out or switch accounts"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

