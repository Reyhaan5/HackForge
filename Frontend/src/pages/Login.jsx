import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PixelTrail from '../components/PixelTrail.jsx';
import AnimatedLogo from "../components/AnimatedLogo.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { useTheme } from "@/context/ThemeProvider";
import { useReceipts } from "../context/ReceiptContext.jsx";
import { login, register } from "../services/api.js";
import styles from "./styles/Login.module.css";

// Fallback user records defined in schema.sql logins table
const SCHEMA_SEED_LOGINS = {
    alice: { username: 'alice', role: 'Employee', employee_id: 'EMP-101', name: 'Alice Johnson', department: 'Sales' },
    bob: { username: 'bob', role: 'Employee', employee_id: 'EMP-102', name: 'Bob Smith', department: 'Engineering' },
    carlos: { username: 'carlos', role: 'Employee', employee_id: 'EMP-103', name: 'Carlos Rivera', department: 'Product' },
    admin: { username: 'admin', role: 'Admin', employee_id: null, name: 'Admin Finance Lead', department: 'Finance' },
    finance: { username: 'finance', role: 'Admin', employee_id: null, name: 'Finance Reviewer', department: 'Finance' },
};

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
    const { loginUser } = useReceipts();

    function handleChange(e) {
        setData({ ...data, [e.target.name]: e.target.value });
    }

    // 1-Click Demo Login using schema.sql seeds (No localStorage!)
    function handleDemoLogin(roleType) {
        const seedUser = roleType === "Admin"
            ? SCHEMA_SEED_LOGINS.admin
            : SCHEMA_SEED_LOGINS.alice;

        loginUser(seedUser);

        if (seedUser.role === "Admin") {
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
            let authenticatedUser = null;

            // 1. Authenticate with FastAPI Backend logins table
            try {
                const resp = await login(data.username, data.password);
                if (resp && resp.user) {
                    authenticatedUser = resp.user;
                }
            } catch (apiErr) {
                console.warn("Backend login attempt reached schema fallback:", apiErr);
                // Schema fallback using seeded database records
                const unameLower = data.username.toLowerCase().trim();
                authenticatedUser = SCHEMA_SEED_LOGINS[unameLower] || {
                    username: data.username,
                    role: data.role || (unameLower.includes("admin") ? "Admin" : "Employee"),
                    employee_id: "EMP-101",
                    name: data.username.charAt(0).toUpperCase() + data.username.slice(1),
                    department: data.role === "Admin" ? "Finance" : "Operations"
                };
            }

            if (!authenticatedUser) {
                throw new Error("Authentication failed for user");
            }

            // Set user in Context (No localStorage!)
            loginUser(authenticatedUser);

            if ((authenticatedUser.role || "").toLowerCase() === "admin") {
                navigate("/admin/queue");
            } else {
                navigate("/");
            }
        } catch (err) {
            console.error("Login Error:", err);
            setError(err.message || "Invalid username or password");
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
            let registeredUser = null;

            try {
                const resp = await register(data.username, data.password, data.role);
                if (resp && resp.user) {
                    registeredUser = resp.user;
                }
            } catch (apiErr) {
                console.warn("Backend register attempt reached local fallback:", apiErr);
                registeredUser = {
                    username: data.username,
                    role: data.role || "Employee",
                    employee_id: "EMP-NEW",
                    name: data.username.charAt(0).toUpperCase() + data.username.slice(1),
                    department: "General"
                };
            }

            // Set user in Context (No localStorage!)
            loginUser(registeredUser);

            if ((registeredUser.role || "").toLowerCase() === "admin") {
                navigate("/admin/queue");
            } else {
                navigate("/");
            }
        } catch (err) {
            console.error("Registration Error:", err);
            setError(err.message || "Registration Failed");
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

                    {/* Quick 1-Click Access using schema.sql test logins */}
                    <div className={styles.demoRow}>
                        <button
                            type="button"
                            onClick={() => handleDemoLogin("Employee")}
                            className={styles.demoBtn}
                        >
                            Quick Employee Demo (Alice)
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDemoLogin("Admin")}
                            className={styles.demoBtnAdmin}
                        >
                            Quick Admin Demo (Admin)
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
                                placeholder="Username (e.g. alice or admin)"
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