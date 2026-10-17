import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Bot, Sparkles, ChevronRight, UserRound, PhoneCall } from "lucide-react";
import DashboardLayout from "../components/layout/DashboardLayout";
import styles from "./styles/Dashboard.module.css";

const PROMPT_CHIPS=[
  "Check my branch cut-off eligibility",
  "Calculate fees & scholarship concessions",
  "Hostel, mess & campus facilities",
  "List of mandatory CAP admission documents",
];

export default function Dashboard() {
  const navigate=useNavigate();
  const [query, setQuery]=useState("");

  const [user]=useState(() => {
    try {
      const stored=localStorage.getItem("user");
      return stored ? JSON.parse(stored):null;
    } catch {
      return null;
    }
  });

  const [academicProfile]=useState(() => {
    try {
      const stored=localStorage.getItem("studentAcademicProfile");
      const parsed=stored ? JSON.parse(stored):null;
      return {
        entrancePercentile:parsed?.entrancePercentile || "96.42",
        targetBranch:parsed?.targetBranch || "Computer Engineering",
        category:parsed?.category || "General / Open",
      };
    } catch {
      return {
        entrancePercentile:"96.42",
        targetBranch:"Computer Engineering",
        category:"General / Open",
      };
    }
  });

  const [preferredLanguage]=useState(() => {
    try {
      return localStorage.getItem("preferredLanguage") || "English";
    } catch {
      return "English";
    }
  });

  const handleLaunch=(text) => {
    const q=typeof text === "string" ? text:query.trim();
    if (q) {
      navigate("/chat", { state:{ initialQuery:q } });
    } else {
      navigate("/chat");
    }
  };

  return (
    <DashboardLayout
      displayName={user?.username || "Student"}
      subtitle="Your centralized AI counseling center. Have questions about cutoffs, fees, or documents? Mitra is ready."
    >
      <div className={`${styles.card} ${styles.aiHeroCard}`}>
        <div className={styles.aiGlow} />

        <div>
          <h2 className={styles.aiHeroTitle}>What would you like to explore today?</h2>
          <p className={styles.aiHeroDesc}>
            Get instant, personalized guidance on cutoffs, seat matrices, scholarships, and admission procedures.
          </p>

          <form
            className={styles.queryLauncher}
            onSubmit={(e) => {
              e.preventDefault();
              handleLaunch();
            }}
          >
            <input
              type="text"
              className={styles.queryInput}
              placeholder="Ask Mitra about cutoffs, fees, branch comparisons..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className={styles.querySubmitBtn} aria-label="Ask AI Counselor">
              <ArrowUpRight size={18} />
            </button>
          </form>

          <div className={styles.promptChips}>
            {PROMPT_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className={styles.promptChip}
                onClick={() => handleLaunch(chip)}
              >
                <Sparkles size={14} />
                <span>{chip}</span>
              </button>
            ))}
          </div>
        </div>

        <button type="button" className={styles.primaryButton} onClick={() => handleLaunch()}>
          <Bot size={18} />
          <span>Start Counseling with Mitra</span>
          <ArrowUpRight size={16} />
        </button>
      </div>

      <div className={styles.sideStack}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>
              <UserRound size={18} />
            </div>
            <h3 className={styles.cardTitle}>Current Profile</h3>
          </div>

          <div className={styles.snapshotGrid}>
            <div className={styles.snapshotItem}>
              <span>Target Branch</span>
              <strong>{academicProfile.targetBranch}</strong>
            </div>
            <div className={styles.snapshotItem}>
              <span>Percentile</span>
              <strong>{String(academicProfile.entrancePercentile).replace(/%$/, "")}%</strong>
            </div>
            <div className={styles.snapshotItem}>
              <span>Category</span>
              <strong>{academicProfile.category}</strong>
            </div>
            <div className={styles.snapshotItem}>
              <span>AI Language</span>
              <strong>{preferredLanguage}</strong>
            </div>
          </div>

          <button
            type="button"
            className={styles.outlineActionBtn}
            onClick={() => navigate("/profile")}
          >
            <span>Manage Profile & Preferences</span>
            <ChevronRight size={15} />
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardIcon}>
              <Bot size={18} />
            </div>
            <h3 className={styles.cardTitle}>Support & Services</h3>
          </div>

          <button type="button" className={styles.quickActionItem} onClick={() => handleLaunch()}>
            <span className={styles.cardIcon}>
              <Bot size={18} />
            </span>
            <span>
              <strong>Instant AI Session</strong>
              <span>24/7 personalized answers</span>
            </span>
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            className={styles.quickActionItem}
            onClick={() => handleLaunch("I would like to request 1-on-1 counseling guidance.")}
          >
            <span className={styles.cardIcon}>
              <PhoneCall size={18} />
            </span>
            <span>
              <strong>1-on-1 Counselor Callback</strong>
              <span>Ask Mitra to schedule staff callback</span>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}