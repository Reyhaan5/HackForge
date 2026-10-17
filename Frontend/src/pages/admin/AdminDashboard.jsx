import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  ArrowUpRight,
  Users,
  BarChart,
  ChevronRight,
} from "lucide-react";
import styles from "../styles/Dashboard.module.css";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { ADMIN_MENU_ITEMS } from "../../constants/navigation";

export default function AdminDashboard(){
  const [admin]=useState(() => {
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
  
    const [analytics, setAnalytics]=useState({
    totalApplications:850,
    totalQueries:3450,
    pendingDocuments:42,
    totalStudents:1250,
  });
  const navigate = useNavigate();

  useEffect(()=>{
    const fetchAnalytics=async () => {
      try{
        const resp=await api.get("/admin/analytics/summary", { withCredentials: true });
        const d=resp.data?.data;
        if (d && d.students && d.students.totalStudents > 0) {
          setAnalytics({
            totalApplications:d.students.registeredUserAccounts,
            totalQueries:d.questions.totalQuestionsAsked,
            pendingDocuments:12,
            totalStudents:d.students.totalStudents
          });
        }
      }
      catch(err){
        console.error("Failed to fetch analytics:", err);
      }
    };
    fetchAnalytics();
  }, []);
  const displayName=admin?.username||"Admin";

  return(
    <DashboardLayout
      menuItems={ADMIN_MENU_ITEMS}
      displayName={displayName}
      greeting="Welcome,">

      <div className={`${styles.card} ${styles.aiCard}`}>
        <div className={styles.aiGlow}/>
        <div className={styles.aiIcon}>
          <BarChart size={25}/>
        </div>
        <h2 className={styles.aiTitle}>System Overview</h2>
        <p className={styles.aiDescription}>
          Currently tracking <strong>{analytics.totalApplications}</strong> active student applications out of <strong>{analytics.totalStudents}</strong> registered students. 
          Campus Mitra has successfully resolved <strong>{analytics.totalQueries}</strong> queries so far, drastically reducing manual support workload.
        </p>

        <button
          className={styles.primaryButton}
          onClick={() => navigate("/admin/analytics")}>
          View Full Analytics
          <ArrowUpRight size={17}/>
        </button>
      </div>

      <div className={`${styles.card} ${styles.quickCard}`}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>Pending Tasks</h2>
          </div>
        </div>

                <div className={styles.quickActions}>
          <button className={styles.quickAction} onClick={() => navigate("/chat")}>
            <span className={styles.quickIcon}>
              <Users size={19}/>
            </span>
            <span>
              <strong>Student Queries</strong>
              <span>Monitor and reply to chats</span>
            </span>
            <ChevronRight size={17}/>
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

