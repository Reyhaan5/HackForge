import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PixelTrail from '../components/PixelTrail.jsx';
import api from '../api/api.js';
import AnimatedLogo from "../components/AnimatedLogo.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { useTheme } from "@/context/ThemeProvider";
import { useReceipts } from "../context/ReceiptContext.jsx";
import styles from "./styles/Login.module.css";

function useCssVar(prop) {
    const { theme } = useTheme();
    const [value, setValue] = useState(() =>
        getComputedStyle(document.documentElement).getPropertyValue(prop).trim()
    );
    useEffect(() => {
        setValue(
            getComputedStyle(document.documentElement).getPropertyValue(prop).trim()
        );
    }, [theme, prop]);
    return value;
}

function Login() {
    const [data, setData] = useState({
        username: "",
        role: "Employee",
        password: "",
    });
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const trailColor = useCssVar("--primary-color") || useCssVar("--primary") || "#4F46E5";
    const { setRole } = useReceipts ? useReceipts() : { setRole: () => {} };

    function handleChange(e) {
        setData({ ...data, [e.target.name]: e.target.value });
    }

    // 1-Click Demo Login Helper
    function handleDemoLogin(roleType) {
        const username = roleType === "Admin" ? "admin_finance" : "employee_alex";
        const token = "demo_token_" + Date.now();
        const userObj = { username, role: roleType };

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(userObj));
        localStorage.setItem("rgr_user_role", roleType.toLowerCase());
        setRole(roleType.toLowerCase());

        if (roleType === "Admin") {
            navigate("/admin/queue");
        } else {
            navigate("/");
        }
    }

    async function handleLogin() {
        setError("");
        if (!data.username.trim() || !data.password.trim()) {
            setError("Username and Password are required");
            return;
        }
        if (data.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        try {
            setLoading(true);
            let userRole = data.role || "Employee";
            let token = "token_" + Date.now();
            let userObj = { username: data.username, role: userRole };

            // Attempt backend API login if available
            try {
                const resp = await api.post(
                    "/auth/login",
                    {
                        username: data.username,
                        password: data.password
                    },
                    { withCredentials: true }
                );
                if (resp.data?.success && resp.data?.token) {
                    token = resp.data.token;
                    if (resp.data.user) {
                        userObj = resp.data.user;
                        userRole = resp.data.user.role || userRole;
                    }
                }
            } catch (apiErr) {
                console.log("Backend auth endpoint not responding, completing local session auth:", apiErr);
                // Fallback for hackathon demo
                if (data.username.toLowerCase().includes("admin") || data.role === "Admin") {
                    userRole = "Admin";
                }
            }

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(userObj));
            localStorage.setItem("rgr_user_role", userRole.toLowerCase());
            setRole(userRole.toLowerCase());

            if (userRole.toLowerCase() === "admin") {
                navigate("/admin/queue");
            } else {
                navigate("/");
            }
        } catch (err) {
            console.log("Login Error Occurred: ", err);
            const backendMessage = err.response?.data?.message;
            setError(backendMessage || "Login Failed");
        } finally {
            setLoading(false);
        }
    }

    async function handleRegisterInitiate(e) {
        e.preventDefault();
        setError("");
        if (!data.username.trim()) {
            setError("Username is Required");
            return;
        }
        if (!data.password.trim()) {
            setError("Password is Required");
            return;
        }
        if (data.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        try {
            setLoading(true);
            let userRole = data.role || "Employee";
            let token = "token_" + Date.now();
            let userObj = { username: data.username, role: userRole };

            try {
                const resp = await api.post(
                    "/auth/register",
                    {
                        username: data.username,
                        role: data.role,
                        password: data.password
                    },
                    { withCredentials: true }
                );
                if (resp.data?.success && resp.data?.token) {
                    token = resp.data.token;
                    if (resp.data.user) {
                        userObj = resp.data.user;
                        userRole = resp.data.user.role || userRole;
                    }
                }
            } catch (apiErr) {
                console.log("Backend register endpoint offline, completing local session registration:", apiErr);
            }

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(userObj));
            localStorage.setItem("rgr_user_role", userRole.toLowerCase());
            setRole(userRole.toLowerCase());

            if (userRole.toLowerCase() === "admin") {
                navigate("/admin/queue");
            } else {
                navigate("/");
            }
        } catch (err) {
            console.log("Registration Error Occurred: ", err);
            const backendMessage = err.response?.data?.message;
            setError(backendMessage || "Registration Failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.leftSection}>
                <PixelTrail
                    gridSize={50}
                    trailSize={0.1}
                    maxAge={250}
                    interpolate={5}
                    color={trailColor}
                    gooeyFilter={{ id: "custom-goo-filter", strength: 2 }}
                    gooeyEnabled
                    gooStrength={2}
                />
                    
                <div className={styles.left}>
                    <div className={styles.logo}>
                        <AnimatedLogo />
                    </div>
                    <h1>Receipt Graveyard</h1>
                    <p>AI Expense Resolution & Policy Engine</p>
                </div>
            </div>
            <div className={styles.rightSection}>
                <div className={styles.loginThemeToggle}>
                    <ThemeToggle />
                </div>
                <div className={styles.box}>
                    <h1 className={styles.title}>
                        {isRegister ? "Register" : "Login"}
                    </h1>
                    <p className={styles.subtitle}>Enter your credentials to access the expense portal</p>

                    {/* Quick 1-Click Access for Hackathon Demo */}
                    <div className={styles.demoRow}>
                        <button
                            type="button"
                            onClick={() => handleDemoLogin("Employee")}
                            className={styles.demoBtn}
                        >
                            Quick Employee Demo
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDemoLogin("Admin")}
                            className={styles.demoBtnAdmin}
                        >
                            Quick Admin Demo
                        </button>
                    </div>

                    {isRegister && (
                        <div className={styles.form}>
                            <input
                                type="text"
                                name="username"
                                placeholder="Username"
                                value={data.username}
                                onChange={handleChange}
                                className={styles.loginInput}
                            />
                            <select
                                name="role"
                                value={data.role}
                                onChange={handleChange}
                                className={styles.loginSelect}
                            >
                                <option value="Employee">Employee Portal</option>
                                <option value="Admin">Admin Approval & Finance</option>
                            </select>

                            <input
                                type="password"
                                name="password"
                                placeholder="Password (min 6 characters)"
                                value={data.password}
                                onChange={handleChange}
                                className={styles.loginInput}
                            />
                            <button 
                                className={styles.btn}
                                onClick={handleRegisterInitiate}
                                disabled={loading}
                            >
                                {loading ? "Creating Account..." : "Register"}
                            </button>
                        </div>
                    )}
                    
                    {!isRegister && (
                        <div className={styles.form}>
                            <input
                                type="text"
                                name="username"
                                placeholder="Username (e.g. employee or admin)"
                                value={data.username}
                                onChange={handleChange}
                                className={styles.loginInput}
                            />
                            <select
                                name="role"
                                value={data.role}
                                onChange={handleChange}
                                className={styles.loginSelect}
                            >
                                <option value="Employee">Employee Portal</option>
                                <option value="Admin">Admin Approval & Finance</option>
                            </select>
                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                value={data.password}
                                onChange={handleChange}
                                className={styles.loginInput}
                            />
                            <button 
                                className={styles.btn}
                                onClick={handleLogin}
                                disabled={loading}
                            >
                                {loading ? "Authenticating..." : "Login"}
                            </button>
                        </div>
                    )}
                    
                    <p className={styles.switch}>
                        {isRegister ? "Already Have An Account ?" : "Don't have an Account ?"}
                        <span
                            onClick={() => {
                                setIsRegister(!isRegister);
                                setError("");
                            }}
                        > 
                            {isRegister ? " Log In" : " Sign up"}
                        </span>
                    </p>
                    {error && (
                        <p className={styles.error}>
                            {error}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Login;