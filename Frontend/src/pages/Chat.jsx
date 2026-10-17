import { useState, useRef, useEffect } from "react";
import {
  Send,
  Home,
  LayoutDashboard,
  User,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import styles from "./styles/Chat.module.css";
import AnimatedLogo from "@/components/AnimatedLogo";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/api";
import MessageRenderer from "@/components/MessageRenderer";
import GlideSelect from "@/components/GlideSelect";
import PeekRating from "@/components/PeekRating";
import ThemeToggle from "@/components/ThemeToggle";

const languages=[
  { value:"English", label:"English", tag:"EN" },
  { value:"Hindi", label:"Hindi", tag:"हिन्दी" },
  { value:"Marathi", label:"Marathi", tag:"मराठी" },
  { value:"Gujarati", label:"Gujarati", tag:"ગુજરાતી" },
];

const translations={
  English:{
    initialMsg:(name) => `Hey ${name}! I'm Mitra, your campus counselor and academic advisor. What's on your mind today?`,
    newChatMsg:(name) => `Hey ${name}! How can I help you in this new session?`,
    resetMsg:(name) => `Fresh start! How can I help you today, ${name}?`,
    suggestions:[
      { label:"Course Recommendations", query:"Can you help me choose the right courses for next semester?" },
      { label:"Scholarships & Financial Aid", query:"What scholarship and financial aid options are available?" },
      { label:"Admission Deadlines & Fees", query:"What are the upcoming admission deadlines and fee structures?" },
    ]
  },
  Hindi:{
    initialMsg:(name) => `नमस्ते ${name}! मैं मित्रा हूँ, आपका कैंपस काउंसलर और शैक्षणिक सलाहकार। आज मैं आपकी क्या मदद कर सकता हूँ?`,
    newChatMsg:(name) => `नमस्ते ${name}! इस नए सत्र में मैं आपकी क्या मदद कर सकता हूँ?`,
    resetMsg:(name) => `नई शुरुआत! आज मैं आपकी क्या मदद कर सकता हूँ, ${name}?`,
    suggestions:[
      { label:"पाठ्यक्रम सुझाव", query:"क्या आप मुझे अगले सेमेस्टर के लिए सही कोर्स चुनने में मदद कर सकते हैं?" },
      { label:"छात्रवृत्ति और वित्तीय सहायता", query:"कौन सी छात्रवृत्ति और वित्तीय सहायता विकल्प उपलब्ध हैं?" },
      { label:"प्रवेश समय सीमा और फीस", query:"आगामी प्रवेश की समय सीमा और फीस संरचना क्या है?" },
    ]
  },
  Marathi:{
    initialMsg:(name) => `नमस्कार ${name}! मी मित्रा आहे, तुमचा कॅम्पस समुपदेशक आणि शैक्षणिक सल्लागार. आज मी तुमची काय मदत करू शकतो?`,
    newChatMsg:(name) => `नमस्कार ${name}! या नवीन सत्रात मी तुमची काय मदत करू शकतो?`,
    resetMsg:(name) => `नवीन सुरुवात! आज मी तुमची काय मदत करू शकतो, ${name}?`,
    suggestions:[
      { label:"अभ्यासक्रम शिफारसी", query:"पुढील सत्रासाठी योग्य अभ्यासक्रम निवडण्यासाठी तुम्ही मला मदत करू शकता का?" },
      { label:"शिष्यवृत्ती आणि आर्थिक मदत", query:"कोणते शिष्यवृत्ती आणि आर्थिक मदतीचे पर्याय उपलब्ध आहेत?" },
      { label:"प्रवेश अंतिम मुदत आणि फी", query:"आगामी प्रवेशाची अंतिम मुदत आणि फी संरचना काय आहे?" },
    ]
  },
  Gujarati:{
    initialMsg:(name) => `નમસ્તે ${name}! હું મિત્રા છું, તમારો કેમ્પસ કાઉન્સેલર અને શૈક્ષણિક સલાહકાર. આજે હું તમારી શું મદદ કરી શકું?`,
    newChatMsg:(name) => `નમસ્તે ${name}! આ નવા સત્રમાં હું તમારી શું મદદ કરી શકું?`,
    resetMsg:(name) => `નવી શરૂઆત! આજે હું તમારી શું મદદ કરી શકું, ${name}?`,
    suggestions:[
      { label:"કોર્સ ભલામણો", query:"શું તમે મને આગલા સેમેસ્ટર માટે યોગ્ય કોર્સ પસંદ કરવામાં મદદ કરી શકો છો?" },
      { label:"શિષ્યવૃત્તિ અને નાણાકીય સહાય", query:"કયા શિષ્યવૃત્તિ અને નાણાકીય સહાયના વિકલ્પો ઉપલબ્ધ છે?" },
      { label:"પ્રવેશની અંતિમ તારીખ અને ફી", query:"આગામી પ્રવેશની અંતિમ તારીખ અને ફી માળખું શું છે?" },
    ]
  }
};

const humanResponses = {
  course: "Choosing the right courses can feel overwhelming, but you don't have to do it alone! Based on your academic interests, I recommend balancing core requirements with electives that excite you. Would you like me to look at specific branch specializations or course syllabi with you?",
  scholarship: "We have several merit-based and need-based financial aid programs available! Applications for the upcoming term are currently open. Should I guide you through the eligibility criteria or document submission process?",
  housing: "Living on campus is a great way to experience university life! We offer single and shared dorms with 24/7 Wi-Fi, study lounges, and dining hall access. Are you interested in on-campus hostels or nearby off-campus options?",
  admission: "Admission dates vary slightly by department, but key deadlines for the upcoming semester are approaching fast. Fees can be paid in flexible installments. What specific degree program are you looking into?",
  default: "I hear you! As your campus counselor, I'm here to support you through every step of your college journey—whether it's managing study workload, navigating campus resources, or planning your career path. Tell me a bit more so I can help best!"
};

const getFormattedTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const generateId = () => Date.now();

export default function Chat(){
  const [user]=useState(() => {
    const storedUser = localStorage.getItem("user");
    if(storedUser){
      try{
        return JSON.parse(storedUser);
      } 
      catch{
        return null;
      }
    }
    return null;
  });
  const navigate = useNavigate();
  const location=useLocation();
  const initialHandledRef=useRef(false);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isCollapsed, setIsCollapsed]=useState(false);
  const [language, setLanguage]=useState(() => localStorage.getItem("preferredLanguage") || "English");
  const [feedbackRatings, setFeedbackRatings]=useState(() => {
    const saved=localStorage.getItem("chatFeedbackRatings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });
  const [feedbackStatus, setFeedbackStatus] = useState({});
  const messagesEndRef = useRef(null);

  const handleFeedback = async (msg, score) => {
    const msgId = typeof msg === "object" ? msg.id : msg;
    setFeedbackRatings((prev) => {
      const updated = { ...prev, [msgId]: score };
      localStorage.setItem("chatFeedbackRatings", JSON.stringify(updated));
      return updated;
    });

    setFeedbackStatus((prev) => ({ ...prev, [msgId]: "submitting" }));

    try {
      await api.post("/chat/feedback", {
        rating: score,
        user_message: msg?.userMessage || null,
        ai_reply: msg?.text || null,
        chat_id: msg?.chatId || null,
        student_id: user?.student_id || user?.id || null,
      });
      setFeedbackStatus((prev) => ({ ...prev, [msgId]: "saved" }));
    } catch (err) {
      console.warn("Feedback backend sync error, saved locally:", err);
      setFeedbackStatus((prev) => ({ ...prev, [msgId]: "error" }));
    }
  };

  const userName = user?.username || "Friend";

  const [messages, setMessages]=useState(() => {
    const defaultLang=localStorage.getItem("preferredLanguage") || "English";
    const t=translations[defaultLang] || translations.English;
    return [
      {
        id:"msg-init",
        sender:"counselor",
        text:t.initialMsg(userName),
        type:"initialMsg",
        time:"10:30 AM",
      },
    ];
  });

  const handleLanguageChange=(newLang) => {
    setLanguage(newLang);
    localStorage.setItem("preferredLanguage", newLang);
    const t=translations[newLang] || translations.English;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.type === "initialMsg") return { ...m, text:t.initialMsg(userName) };
        if (m.type === "resetMsg") return { ...m, text:t.resetMsg(userName) };
        return m;
      })
    );
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, isTyping]);

  const handleSend = async (textToSend) => {
    const query = textToSend || inputValue.trim();
    if (!query) return;

    const userMsgTime = getFormattedTime();
    const userMsg={
      id: generateId(),
      sender: "user",
      text: query,
      time: userMsgTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue("");
    setIsTyping(true);

    try {
      let responseText = "";
      let chatId = null;
      const parseResponse = (raw) => {
        if (typeof raw === "string") return raw;
        if (!raw) return "";
        if (Array.isArray(raw)) {
          return raw.map((item) => parseResponse(item)).filter(Boolean).join("\n\n");
        }
        if (typeof raw === "object") {
          return raw.text || raw.answer || raw.message || raw.content || JSON.stringify(raw);
        }
        return String(raw);
      };

      try {
        const res = await api.post("/chat", {
          query,
          student_id: user?.student_id || user?.id || null,
          language: language,
        });
        responseText = parseResponse(res.data?.answer || res.data?.message);
        chatId = res.data?.chat_id || null;
      } catch {
        const directRes = await fetch("http://localhost:5000/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            student_id: user?.student_id || user?.id || null,
            language: language,
          }),
        });
        const directData = await directRes.json();
        responseText = parseResponse(directData?.answer || directData?.message);
        chatId = directData?.chat_id || null;
      }

      if (!responseText) {
        responseText = humanResponses.default;
      }

      const counselorMsg = {
        id: generateId(),
        sender: "counselor",
        text: responseText,
        time: getFormattedTime(),
        chatId: chatId,
        userMessage: query,
      };

      setMessages((prev) => [...prev, counselorMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      const counselorMsg = {
        id:generateId(),
        sender: "counselor",
        text: "Sorry, I couldn't reach the admission assistant server. Please check that backend services are running.",
        time: getFormattedTime(),
      };
      setMessages((prev) => [...prev, counselorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendRef=useRef(handleSend);
  useEffect(() => {
    handleSendRef.current=handleSend;
  });

  useEffect(() => {
    const initialQuery=location.state?.initialQuery;
    if (initialQuery && !initialHandledRef.current) {
      initialHandledRef.current=true;
      navigate(location.pathname, { replace:true, state:{} });
      handleSendRef.current(initialQuery);
    }
  }, [location.state?.initialQuery, location.pathname, navigate]);

  const handleReset=() => {
    const resetId = generateId();
    const resetTime = getFormattedTime();

    setMessages([
      {
        id:resetId,
        sender:"counselor",
        text:(translations[language] || translations.English).resetMsg(userName),
        type:"resetMsg",
        time:resetTime,
      },
    ]);
  };

  return (
    <div className={styles.chatPage}>
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed:""}`}>
        <div className={styles.sidebarHeader}>
          {!isCollapsed && (
            <div className={styles.brandGroup}>
              <div className={styles.logoWrapper}>
                <AnimatedLogo />
              </div>
              <div className={styles.brandText}>
                <span className={styles.brandName}>Campus Mitra</span>
                <span className={styles.brandBadge}>AI Counselor</span>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={styles.collapseBtn}
            title={isCollapsed ? "Expand sidebar":"Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar":"Collapse sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen size={18} />:<PanelLeftClose size={18} />}
          </button>
        </div>

        <div className={styles.sidebarBody}>
          <span className={styles.navSectionTitle}>Navigation</span>
          <button
            onClick={() => navigate("/home")}
            className={styles.navButton}
            title="Home"
          >
            <Home className={styles.navIcon} />
            <span className={styles.navLabel}>Home</span>
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className={styles.navButton}
            title="Dashboard"
          >
            <LayoutDashboard className={styles.navIcon} />
            <span className={styles.navLabel}>Dashboard</span>
          </button>
          <button
            onClick={() => navigate("/profile")}
            className={styles.navButton}
            title="Profile"
          >
            <User className={styles.navIcon} />
            <span className={styles.navLabel}>Profile</span>
          </button>
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard} title={`${userName} (${user?.role || "Student"})`}>
            <div className={styles.userAvatar}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{userName}</span>
              <span className={styles.userRole}>{user?.role || "Student"}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className={styles.chatMainArea}>
        <main className={styles.mainLayout}>
          <header className={styles.counselorHeader}>
            <div>
              <h2>Mitra</h2>
              <p className={styles.subtitle}>Senior Academic Advisor & Student Counselor</p>
            </div>
            <div className={styles.headerActions}>
              <GlideSelect
                options={languages}
                value={language}
                onChange={(val) => handleLanguageChange(val)}
                ariaLabel="Select counseling language"
                showTags
                accentColor="var(--primary)"
                surfaceColor="var(--card)"
                highlightColor="var(--card-hover)"
                textColor="var(--text)"
                size="md"
                radius={10}
                menuWidth={180}
                placement="bottom"
                align="right"
                popDuration={180}
                glideDuration={240}
                rememberPosition
              />
              <button className={styles.actionBtn} onClick={handleReset}>
                Reset
              </button>
              <ThemeToggle />
            </div>
          </header>

          <div className={styles.messagesContainer}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.messageRow} ${
                  msg.sender === "user" ? styles.userRow:styles.counselorRow
                }`}
              >
                <div className={styles.messageBubble}>
                  <MessageRenderer text={msg.text} />
                  <span className={styles.timeStamp}>{msg.time}</span>
                </div>

                {msg.sender === "counselor" && msg.type !== "initialMsg" && msg.type !== "resetMsg" && (
                  <div className={styles.feedbackContainer}>
                    <span className={styles.feedbackLabel}>
                      {feedbackRatings[msg.id] ? "Feedback recorded:":"Rate this response:"}
                    </span>
                    <PeekRating
                      value={feedbackRatings[msg.id] || 0}
                      onChange={(score) => handleFeedback(msg, score)}
                      labels={["Poor", "Fair", "Good", "Helpful", "Exceptional"]}
                      size={16}
                      lift={4}
                      activeColor="var(--primary)"
                      idleColor="var(--muted)"
                      tipColor="var(--card)"
                      tipTextColor="var(--text)"
                      ariaLabel="Rate response feedback"
                    />
                    {feedbackStatus[msg.id] === "submitting" && (
                      <span className={styles.feedbackThankYou}>• Saving...</span>
                    )}
                    {(feedbackStatus[msg.id] === "saved" || (!feedbackStatus[msg.id] && feedbackRatings[msg.id] > 0)) && (
                      <span className={styles.feedbackThankYou}>• Thanks!</span>
                    )}
                    {feedbackStatus[msg.id] === "error" && (
                      <span className={styles.feedbackThankYou} style={{ color: "var(--warning)" }}>• Saved locally</span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className={`${styles.messageRow} ${styles.counselorRow}`}>
                <div className={styles.messageBubble}>
                  <div className={styles.typingIndicator}>
                    <div className={styles.dot} />
                    <div className={styles.dot} />
                    <div className={styles.dot} />
                  </div>
                </div>
              </div>
            )}

            {messages.length < 3 && !isTyping && (
              <div className={styles.suggestionsArea}>
                {(translations[language] || translations.English).suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    className={styles.suggestionChip}
                    onClick={() => handleSend(item.query)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form
            className={styles.inputForm}
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}>
            <input
              type="text"
              className={styles.chatInput}
              placeholder="Ask Mitra about courses, housing, fees..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}/>

            <button
              type="submit"
              className={styles.sendBtn}
              disabled={!inputValue.trim() || isTyping}
              aria-label="Send message">
              <Send size={16} />
            </button>
          </form>

          <p className={styles.disclaimer}>
            Campus Mitra can make mistakes. Please verify with the{" "}
            <a
              href="https://sbmp.ac.in"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.disclaimerLink}
            >
              official website
            </a>
            .
          </p>
        </main>
      </div>
    </div>
  );
}
