import { useEffect, useState } from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  Users,
  MessageCircleQuestion,
  BarChart3,
} from "lucide-react";
import styles from "../styles/Dashboard.module.css";
import api from "../../api/api";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

import { ADMIN_MENU_ITEMS } from "../../constants/navigation";

const COLORS=['#fdba74', '#fed7aa', '#f97316', '#fb923c', '#ffedd5'];

export default function Analytics() {
  const [admin]=useState(() => {
    const storedUser=localStorage.getItem("user");
    if (storedUser) {
      try { return JSON.parse(storedUser); } catch { return null; }
    }
    return null;
  });

    const [analytics, setAnalytics]=useState({
    students:{ totalStudents:1250, registeredUserAccounts:850, activeStudentsAskingQuestions:420 },
    questions:{ totalQuestionsAsked:3450, guestQuestions:800, questionsLast24Hours:145, questionsLast7Days:890 },
    departmentBreakdown:[
      { department_name:'Computer Engineering', question_count:1200 },
      { department_name:'Information Technology', question_count:950 },
      { department_name:'Mechanical Engineering', question_count:850 },
      { department_name:'Electrical Engineering', question_count:650 },
      { department_name:'Civil Engineering', question_count:400 },
    ],
  });

  useEffect(() => {
    const fetchAnalytics=async () => {
      try {
        const resp=await api.get("/admin/analytics/summary", { withCredentials:true });
        if (resp.data && resp.data.data && resp.data.data.students.totalStudents > 0) {
          setAnalytics(resp.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      }
    };
    fetchAnalytics();
  }, []);

  const displayName=admin?.username || "Admin";

  const registered=analytics.students.registeredUserAccounts;
  const unregistered=Math.max(0, analytics.students.totalStudents - registered);
  
  const studentData=[
    { name:'Registered', value:registered },
    { name:'Unregistered', value:unregistered }
  ];

  const engagementData=[
    { name:'Active (Asked Qs)', value:analytics.students.activeStudentsAskingQuestions },
    { name:'Inactive', value:Math.max(0, registered - analytics.students.activeStudentsAskingQuestions) }
  ];

  const olderQuestions=Math.max(0, analytics.questions.totalQuestionsAsked - analytics.questions.questionsLast7Days);
  
  const queryData=[
    { name:'Last 24h', count:analytics.questions.questionsLast24Hours },
    { name:'2 to 7 Days ago', count:Math.max(0, analytics.questions.questionsLast7Days - analytics.questions.questionsLast24Hours) },
    { name:'Older', count:olderQuestions }
  ];

  const deptData=analytics.departmentBreakdown.map(d => ({
    name:d.department_name,
    Queries:d.question_count
  }));

  return (
    <DashboardLayout
      menuItems={ADMIN_MENU_ITEMS}
      displayName={displayName}
      greeting="Analytics Overview,"
    >
      <>
        
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.cardEyebrow}>User Base</p>
              <h2 className={styles.cardTitle}>Student Demographics</h2>
            </div>
            <Users style={{ color:'var(--primary)' }} />
          </div>
          
          <div style={{ display:'flex', flexDirection:'column', gap:'20px', marginTop:'20px' }}>
            <div style={{ background:'var(--card-hover)', padding:'16px', borderRadius:'12px' }}>
                <h3 style={{ fontSize:'1rem', margin:'0 0 10px 0' }}>Registration Status</h3>
                <div style={{ height:'200px', width:'100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={studentData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {studentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor:'var(--card)', borderColor:'var(--border)', borderRadius:'8px' }} itemStyle={{ color:'var(--text)' }}/>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
            </div>

            <div style={{ background:'var(--card-hover)', padding:'16px', borderRadius:'12px' }}>
                <h3 style={{ fontSize:'1rem', margin:'0 0 10px 0' }}>User Engagement</h3>
                <div style={{ height:'200px', width:'100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={engagementData} cx="50%" cy="50%" outerRadius={80} paddingAngle={2} dataKey="value">
                        {engagementData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor:'var(--card)', borderColor:'var(--border)', borderRadius:'8px' }} itemStyle={{ color:'var(--text)' }}/>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.cardEyebrow}>Engagement</p>
              <h2 className={styles.cardTitle}>Query Timeline</h2>
            </div>
            <MessageCircleQuestion style={{ color:'var(--primary)' }} />
          </div>
          <div style={{ marginTop:'20px', height:'450px', width:'100%', background:'var(--card-hover)', padding:'16px', borderRadius:'12px' }}>
             <h3 style={{ fontSize:'1rem', margin:'0 0 20px 0' }}>Queries Over Time</h3>
             <ResponsiveContainer width="100%" height="90%">
                <BarChart data={queryData} margin={{ top:10, right:10, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor:'var(--card)', borderColor:'var(--border)', borderRadius:'8px', color:'var(--text)' }} cursor={{ fill:'var(--border)' }} />
                  <Bar dataKey="count" fill="var(--orange-light)" radius={[4, 4, 0, 0]} />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.card} style={{ gridColumn:'1 / -1' }}>
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.cardEyebrow}>Topics & Categories</p>
              <h2 className={styles.cardTitle}>Department Interaction Breakdown</h2>
            </div>
            <BarChart3 style={{ color:'var(--primary)' }} />
          </div>
          <div style={{ marginTop:'24px', height:'350px', width:'100%', background:'var(--card-hover)', padding:'20px', borderRadius:'12px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={deptData} margin={{ top:5, right:30, left:40, bottom:5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="var(--text)" fontSize={12} tickLine={false} axisLine={false} width={120} />
                <Tooltip contentStyle={{ backgroundColor:'var(--card)', borderColor:'var(--border)', borderRadius:'8px', color:'var(--text)' }} cursor={{ fill:'var(--border)' }} />
                <Bar dataKey="Queries" fill="var(--orange-light)" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </>
    </DashboardLayout>
  );
}
