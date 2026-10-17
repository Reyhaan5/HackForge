import { useState } from "react";
import StaggeredMenu from "../StaggeredMenu";
import { Bell } from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import styles from "../../pages/styles/Dashboard.module.css";
import modalStyles from "../../pages/styles/Modal.module.css";
import { STUDENT_MENU_ITEMS, SOCIAL_ITEMS } from "../../constants/navigation";

export default function DashboardLayout({
  menuItems=STUDENT_MENU_ITEMS,
  socialItems=SOCIAL_ITEMS,
  greeting="Welcome back,",
  displayName,
  subtitle,
  children,
}) {
  const [isNotifOpen, setIsNotifOpen]=useState(false);

  return (
    <div className={styles.dashboard}>
      <StaggeredMenu
        position="left"
        items={menuItems}
        socialItems={socialItems}
        displaySocials={socialItems.length > 0}
        displayItemNumbering
        menuButtonColor="var(--text)"
        openMenuButtonColor="var(--text)"
        changeMenuColorOnOpen
        colors={["var(--border)", "var(--primary)"]}
        accentColor="var(--primary)"
      />
      <div className={styles.bg} />

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.topPanel}>
            <h1>
              {greeting} <span>{displayName}</span>
            </h1>
            {subtitle && <p className={styles.topSubtitle}>{subtitle}</p>}
          </div>

          <div className={styles.headerActions}>
            <ThemeToggle />
            <button
              className={styles.notificationButton}
              aria-label="Alerts"
              onClick={() => setIsNotifOpen(true)}
            >
              <Bell size={20} />
              <span className={styles.notificationDot} />
            </button>
          </div>
        </header>

        <section className={styles.contentGrid}>
          {children}
        </section>
      </main>

      {isNotifOpen && (
        <div className={modalStyles.modalOverlay} onClick={() => setIsNotifOpen(false)}>
          <div className={modalStyles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={modalStyles.modalTitle}>Campus Announcements</h2>
            <p className={modalStyles.modalDescription}>
              • CAP Round Option Form is currently live.<br />
              • MAHADBT Scholarship renewal deadline: Nov 15.<br />
              • For branch cutoffs, ask Mitra directly on Chat!
            </p>
            <div className={modalStyles.buttonGroup}>
              <button className={modalStyles.primaryButton} onClick={() => setIsNotifOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
