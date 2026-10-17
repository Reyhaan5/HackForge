import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeProvider";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import Preview from "./pages/Preview";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Analytics from "./pages/admin/Analytics";

// protect dashboard, application, chat, studentProfile, counselorProfile
function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace/>}/>
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />}/>
          <Route path="/dashboard" element={<Dashboard />}/>
          <Route path="/profile" element={<Profile />}/>
          <Route path="/onboarding" element={<Onboarding />}/>
          <Route path="/preview" element={<Preview />}/>
          <Route path="/chat" element={<Chat />}/>
          <Route path="/admin" element={<AdminDashboard />}/>
          <Route path="/admin/analytics" element={<Analytics />}/>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;