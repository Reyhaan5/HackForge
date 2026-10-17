import { lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import AnimatedLogo from "../components/AnimatedLogo.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { useTheme } from "../context/ThemeProvider.jsx";
import { useReceipts } from "../context/ReceiptContext.jsx";
import { clearAccessToken, login, register } from "../services/api.js";
import styles from "./styles/Login.module.css";

const PixelTrail = lazy(() => import("../components/PixelTrail.jsx"));

function Login() {
    const [data, setData] = useState({
        username: "",
        password: "",
    });
    const [isRegister, setIsRegister] = useState(false);
    const [selectedRole, setSelectedRole] = useState("Employee");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { theme } = useTheme();
    const { loginUser, refreshSession } = useReceipts();
    const trailColor = theme === "dark" ? "#f97316" : "#ea580c";

    function handleChange(e) {
        setData({ ...data, [e.target.name]: e.target.value });
    }

    async function handleLogin(e) {
        e.preventDefault();
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
            const response = await login(data.username, data.password);
            const authenticatedUser = response?.user;
            if (!authenticatedUser) throw new Error("The server returned no user account.");
            if ((authenticatedUser.role || "").toLowerCase() !== selectedRole.toLowerCase()) {
                clearAccessToken();
                throw new Error(`This account is registered as ${authenticatedUser.role}. Select that role and try again.`);
            }

            // Set user in Context (No localStorage!)
            loginUser(authenticatedUser);
            await refreshSession();

            if (["admin", "finance"].includes((authenticatedUser.role || "").toLowerCase())) {
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
        if (selectedRole !== "Employee") {
            setError("Admin and Finance accounts must be created by an existing administrator. Choose Employee to register.");
            return;
        }
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
            const response = await register(data.username, data.password);
            const registeredUser = response?.user;
            if (!registeredUser) throw new Error("The server returned no user account.");

            // Set user in Context (No localStorage!)
            loginUser(registeredUser);
            await refreshSession();

            if (["admin", "finance"].includes((registeredUser.role || "").toLowerCase())) {
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
                <Suspense fallback={null}>
                    <PixelTrail
                        gridSize={50}
                        trailSize={0.1}
                        maxAge={250}
                        interpolate={5}
                        color={trailColor}
                        gooeyFilter={{ id: "login-pixel-trail", strength: 2 }}
                    />
                </Suspense>
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
                    <p className={styles.roleNote}>{isRegister ? "Choose Employee to create an account. Admin and Finance accounts must be provisioned by an administrator." : "Choose your account role. Access is still verified against your account on the server."}</p>

                    {isRegister && (
                        <form className={styles.form} onSubmit={handleRegisterInitiate}>
                            <label className={styles.roleLabel} htmlFor="register-role">Register as</label>
                            <select id="register-role" className={styles.loginInput} value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
                                <option value="Employee">Employee</option>
                                <option value="Admin">Admin (admin-created accounts)</option>
                                <option value="Finance">Finance (admin-created accounts)</option>
                            </select>
                            <input
                                type="text"
                                name="username"
                                placeholder="Username"
                                autoComplete="username"
                                required
                                value={data.username}
                                onChange={handleChange}
                                className={styles.loginInput}
                            />
                            <input
                                type="password"
                                name="password"
                                placeholder="Password (min 6 characters)"
                                autoComplete="new-password"
                                minLength={6}
                                required
                                value={data.password}
                                onChange={handleChange}
                                className={styles.loginInput}
                            />
                            <button
                                type="submit"
                                className={styles.btn}
                                disabled={loading}
                            >
                                {loading ? "Creating Account..." : "Register"}
                            </button>
                        </form>
                    )}
                    
                    {!isRegister && (
                        <form className={styles.form} onSubmit={handleLogin}>
                            <label className={styles.roleLabel} htmlFor="login-role">Sign in as</label>
                            <select id="login-role" className={styles.loginInput} value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
                                <option value="Employee">Employee</option>
                                <option value="Admin">Admin</option>
                                <option value="Finance">Finance</option>
                            </select>
                            <input
                                type="text"
                                name="username"
                                placeholder="Username"
                                autoComplete="username"
                                required
                                value={data.username}
                                onChange={handleChange}
                                className={styles.loginInput}
                            />
                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                autoComplete="current-password"
                                minLength={6}
                                required
                                value={data.password}
                                onChange={handleChange}
                                className={styles.loginInput}
                            />
                            <button
                                type="submit"
                                className={styles.btn}
                                disabled={loading}
                            >
                                {loading ? "Authenticating..." : "Login"}
                            </button>
                        </form>
                    )}
                    
                    <p className={styles.switch}>
                        {isRegister ? "Already Have An Account ?" : "Don't have an Account ?"}
                        <button
                            type="button"
                            onClick={() => {
                                setIsRegister(!isRegister);
                                setError("");
                            }}
                        > 
                            {isRegister ? " Log In" : " Sign up"}
                        </button>
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
