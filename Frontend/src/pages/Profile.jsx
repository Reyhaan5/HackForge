import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StaggeredMenu from "../components/StaggeredMenu";
import {
  ArrowLeft,
  Sparkles,
  User,
  GraduationCap,
  Sliders,
  Check,
  PhoneCall,
  Save,
} from "lucide-react";
import styles from "./styles/Profile.module.css";
import { STUDENT_MENU_ITEMS, SOCIAL_ITEMS } from "../constants/navigation";
import SquishSwitch from '../components/SquishSwitch';

export default function Profile() {
  const navigate=useNavigate();

  const [user, setUser]=useState(() => {
    const stored=localStorage.getItem("user");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [academicData, setAcademicData]=useState(() => {
    const saved=localStorage.getItem("studentAcademicProfile");
    if(saved){
      try{
        return JSON.parse(saved);
      } 
      catch(err) {
        console.log(err);
      }
    }
    return{
      sscPercentage:"",
      hscPercentage:"",
      entranceExam:"",
      entrancePercentile:"",
      targetBranch:"",
      category:"",
    };
  });

  const [counselingPrefs, setCounselingPrefs]=useState(() => {
    const savedLang=user?.preferredLanguage || localStorage.getItem("preferredLanguage") || "English";
    const saved=localStorage.getItem("counselingPreferences");
    if (saved) {
      try {
        const parsed=JSON.parse(saved);
        return { ...parsed, language:savedLang };
      } catch (err) {
        console.error("Failed to parse counseling preferences", err);
      }
    }
    return {
      language:savedLang,
      tone:"detailed",
      targetYear:"2026-2027",
    };
  });

  const [parentMode, setParentMode]=useState(false);
  const [savedStatus, setSavedStatus]=useState(false);

  const handleAcademicChange=(e) => {
    setAcademicData({ ...academicData, [e.target.name]:e.target.value });
    setSavedStatus(false);
  };

  const handleLanguageSelect=(lang) => {
    setCounselingPrefs({ ...counselingPrefs, language:lang });
    localStorage.setItem("preferredLanguage", lang);
    setSavedStatus(false);
  };

  const handleToneSelect=(tone) => {
    setCounselingPrefs({ ...counselingPrefs, tone });
    setSavedStatus(false);
  };

  const handleSave=() => {
    localStorage.setItem("studentAcademicProfile", JSON.stringify(academicData));
    localStorage.setItem("counselingPreferences", JSON.stringify(counselingPrefs));
    localStorage.setItem("preferredLanguage", counselingPrefs.language);
    if (user) {
      const updatedUser={ ...user, preferredLanguage:counselingPrefs.language };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
    setSavedStatus(true);
    setTimeout(() => {
      setSavedStatus(false);
    }, 3000);
  };

  const handleStartCounseling=() => {
    handleSave();
    navigate("/chat");
  };

  const displayName=user?.username || "Student";
  const displayEmail=user?.email || `${displayName.toLowerCase().replace(/\s+/g, "")}@student.ac.in`;

  return (
    <div className={styles.profilePage}>
      <StaggeredMenu
        position="left"
        items={STUDENT_MENU_ITEMS}
        socialItems={SOCIAL_ITEMS}
        displaySocials
        displayItemNumbering
        menuButtonColor="var(--text)"
        openMenuButtonColor="var(--text)"
        changeMenuColorOnOpen
        colors={["var(--border)", "var(--primary)"]}
        accentColor="var(--primary)"
      />

      <main className={styles.main}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => navigate("/dashboard")}>
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>

        <section className={styles.profileBanner}>
          <div className={styles.bannerGlow} />
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              <User size={38} />
            </div>
            <div className={styles.userMeta}>
              <h1>{displayName}</h1>
              <p>{displayEmail}</p>
            </div>
          </div>

          <button className={styles.bannerAction} onClick={handleStartCounseling}>
            <Sparkles size={18} />
            Consult AI Counselor
          </button>
        </section>

        <div className={styles.parentToggleCard}>
          <div className={styles.parentToggleInfo}>
            <h3>Parent/Guardian View Mode</h3>
            <p>
              Switch on to see verified fee structure and official grievance helpline.
            </p>
          </div>
          <SquishSwitch
            checked={parentMode}
            onChange={(checked) => setParentMode(typeof checked === 'boolean' ? checked : Boolean(checked?.target?.checked))}
            label="Parent mode"
            trackColor="var(--border)"
            trackOnColor="var(--primary)"
            width={76}
            height={38}
            radius={19}
            speed={50}
            stretch={36}
            hoverScale={1.035}
            colorDuration={320}
            disabled={false}
            thumbColor="var(--muted)"
            thumbOnColor="var(--primary-foreground)"
          />
        </div>

        {parentMode && (
          <section className={styles.parentPanel}>
            <div className={styles.parentRow}>
              <div className={styles.parentBox}>
                <h4>Transparent Fee Breakdown</h4>
                <p>
                  Tuition, development, and university exam fees are governed strictly by FRA (Fees Regulating Authority). TFWS and EBC concessions apply as per norms.
                </p>
              </div>
              <div className={styles.parentBox}>
                <h4>Hostel & Campus Safety</h4>
                <p>
                  24/7 campus security, separate monitored boys and girls hostels, and biometrics attendance notifications are enabled for guardians.
                </p>
              </div>
              <div className={styles.parentBox}>
                <h4>Direct Admission Helpline</h4>
                <p>
                  <PhoneCall size={14} style={{ marginRight:6, verticalAlign:"middle" }} />
                  +91 (022) 2854-5566 (Admin Desk)
                  <br />
                  Office hours: Mon - Sat (9:30 AM to 5:00 PM)
                </p>
              </div>
            </div>
          </section>
        )}

        <div className={styles.grid}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>
                <GraduationCap size={22} />
              </div>
              <div>
                <h2>Academic Profile & Scores</h2>
                <p>Keep your qualifying examination details up-to-date for accurate cutoff advice</p>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="sscPercentage">Class 10th (SSC)%</label>
                <input
                  id="sscPercentage"
                  name="sscPercentage"
                  type="text"
                  value={academicData.sscPercentage}
                  onChange={handleAcademicChange}
                  placeholder="e.g. 96.5"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="hscPercentage">Class 12th (HSC)%</label>
                <input
                  id="hscPercentage"
                  name="hscPercentage"
                  type="text"
                  value={academicData.hscPercentage}
                  onChange={handleAcademicChange}
                  placeholder="e.g. 87.20"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="entranceExam">Entrance Exam</label>
                <select
                  id="entranceExam"
                  name="entranceExam"
                  value={academicData.entranceExam}
                  onChange={handleAcademicChange}
                >
                  <option value="MHT-CET">MHT-CET</option>
                  <option value="JEE Main">JEE Main</option>
                  <option value="Both">Both (MHT-CET & JEE)</option>
                  <option value="Diploma Merit">Diploma Merit (DSE)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="entrancePercentile">Score / Percentile</label>
                <input
                  id="entrancePercentile"
                  name="entrancePercentile"
                  type="text"
                  value={academicData.entrancePercentile}
                  onChange={handleAcademicChange}
                  placeholder="e.g. 96.42"
                />
              </div>

              <div className={styles.formGroupFull}>
                <label htmlFor="targetBranch">Target Specialization</label>
                <select
                  id="targetBranch"
                  name="targetBranch"
                  value={academicData.targetBranch}
                  onChange={handleAcademicChange}
                >
                  <option value="Computer Engineering">Computer Engineering</option>
                  <option value="AI & Data Science">Artificial Intelligence & Data Science</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Telecommunication">Electronics & Telecommunication</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                </select>
              </div>

              <div className={styles.formGroupFull}>
                <label htmlFor="category">Seat Allocation Category</label>
                <select
                  id="category"
                  name="category"
                  value={academicData.category}
                  onChange={handleAcademicChange}
                >
                  <option value="General / Open">General / Open</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="EWS">EWS (Economically Weaker Section)</option>
                  <option value="TFWS">TFWS (Tuition Fee Waiver Scheme)</option>
                </select>
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>
                <Sliders size={22} />
              </div>
              <div>
                <h2>Counseling Preferences</h2>
                <p>Personalize how Campus-Mitra guides you during counseling chats</p>
              </div>
            </div>

            <div className={styles.formGroupFull}>
              <label>Chatbot Interaction Language</label>
              <div className={styles.languagePills}>
                {["English", "Hindi", "Marathi", "Gujarati"].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    className={`${styles.langPill} ${
                      counselingPrefs.language === lang ? styles.langPillActive:""
                    }`}
                    onClick={() => handleLanguageSelect(lang)}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formGroupFull} style={{ marginTop:18 }}>
              <label>Counselor Guidance Style</label>
              <div className={styles.toneList}>
                <label
                  className={`${styles.toneOption} ${
                    counselingPrefs.tone === "detailed" ? styles.toneActive:""
                  }`}
                >
                  <input
                    type="radio"
                    name="tone"
                    value="detailed"
                    checked={counselingPrefs.tone === "detailed"}
                    onChange={() => handleToneSelect("detailed")}
                  />
                  <div>
                    <strong>Detailed & In-Depth</strong>
                    <span>Includes cut-off trends, placement stats, and syllabus breakdowns.</span>
                  </div>
                </label>

                <label
                  className={`${styles.toneOption} ${
                    counselingPrefs.tone === "concise" ? styles.toneActive:""
                  }`}
                >
                  <input
                    type="radio"
                    name="tone"
                    value="concise"
                    checked={counselingPrefs.tone === "concise"}
                    onChange={() => handleToneSelect("concise")}
                  />
                  <div>
                    <strong>Quick & Direct</strong>
                    <span>Brief answers focused strictly on cut-off numbers and document lists.</span>
                  </div>
                </label>

                <label
                  className={`${styles.toneOption} ${
                    counselingPrefs.tone === "mentorship" ? styles.toneActive:""
                  }`}
                >
                  <input
                    type="radio"
                    name="tone"
                    value="mentorship"
                    checked={counselingPrefs.tone === "mentorship"}
                    onChange={() => handleToneSelect("mentorship")}
                  />
                  <div>
                    <strong>Step-by-Step Mentorship</strong>
                    <span>Friendly, roadmap-style advice explaining each CAP round step.</span>
                  </div>
                </label>
              </div>
            </div>
          </section>
        </div>

        <div className={styles.saveBar}>
          {savedStatus && (
            <span className={styles.saveSuccess}>
              <Check size={16} style={{ marginRight:6, verticalAlign:"middle" }} />
              Preferences saved
            </span>
          )}
          <button className={styles.saveButton} onClick={handleSave}>
            <Save size={16} style={{ marginRight:8, verticalAlign:"middle" }} />
            Save Profile & Preferences
          </button>
        </div>
      </main>
    </div>
  );
}
