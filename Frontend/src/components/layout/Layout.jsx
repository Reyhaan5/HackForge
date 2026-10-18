import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  FileSpreadsheet,
  ShieldAlert,
  BarChart3,
  SlidersHorizontal,
  RotateCcw,
  Menu,
  X,
  LogOut,
  UserCircle,
  Scan
} from 'lucide-react';
import { useReceipts } from '../../context/ReceiptContext';
import ThemeToggle from '../ThemeToggle';
import ArrowFillButton from '../ArrowFillButton';
import projectLogo from '../../assets/logo.svg';
import styles from './Layout.module.css';

export const Layout = ({ children }) => {
  const { user, logoutUser, history, resetAllData } = useReceipts();
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

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Employee Expense Dashboard';
      case '/submit':
        return 'Submit Receipt';
      case '/expenses':
        return 'My Expense Records';
      case '/admin/process':
        return 'Admin Receipt Processing & Intake';
      case '/admin/queue':
        return 'Admin Approval Queue';
      case '/admin/analytics':
        return 'Expense Analytics & Compliance';
      case '/admin/policy':
        return 'Policy settings';
      default:
        return 'Receipt Graveyard Resolver';
    }
  };

  return (
    <div className={styles.shell}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <img src={projectLogo} alt="Receipt Graveyard Logo" className={styles.brandLogoImg} />
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
              <span>Submit Receipt</span>
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

          {['Admin', 'Finance'].includes(user?.role) && <div className={styles.sectionGroup}>
            <span className={styles.sectionHeader}>Admin & Finance</span>
            <NavLink
              to="/admin/process"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
              }
            >
              <Scan size={18} />
              <span>Receipt Processing</span>
            </NavLink>

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
            {user?.role === 'Admin' && <NavLink to="/admin/policy" onClick={() => setMobileOpen(false)} className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
              <SlidersHorizontal size={18} /><span>Policy</span>
            </NavLink>}
          </div>}
        </nav>

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
            <ThemeToggle />
            {/* Reset all backend receipts; available only to privileged roles. */}
            {['Admin', 'Finance'].includes(user?.role) && <button
              type="button"
              className={styles.resetButton}
              onClick={async () => {
                if (window.confirm('This permanently deletes every receipt in the backend. Continue?')) {
                  try {
                    await resetAllData();
                  } catch (err) {
                    window.alert(err.message || 'Backend reset failed. No local data was cleared.');
                  }
                }
              }}
              title="Delete all backend receipts"
            >
              <RotateCcw size={15} />
              <span>Reset Receipts</span>
            </button>}

            {/* Logged in user info */}
            {currentUser && (
              <div className={styles.userBadge}>
                <UserCircle size={16} />
                <span>{currentUser.username || 'User'}</span>
              </div>
            )}

            {/* Sign Out / Switch account */}
            <ArrowFillButton
              btnText="Sign Out"
              onClick={handleLogout}
              icon={LogOut}
              size="sm"
              bgColor="#dc2626"
              textColor="#ffffff"
              fillBgColor="#ffffff"
              fillTextColor="#dc2626"
              className="shadow-sm shadow-red-500/20"
              title="Sign out or switch accounts"
            />
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

