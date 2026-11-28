// LOGIN PAGE — Premium cinematic authentication experience
// =========================================================
// A glassmorphism-powered login screen with beautiful healthcare
// inspired background, email/password fields, and role selection.
// Preserves existing Firebase authentication and role-based access.

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/usetoast.jsx";
import { useTheme } from "../hooks/useTheme";
import { tokens, transitions } from "../design-system/tokens";
import { motion } from "framer-motion";

// Pre-computed class names for dark mode
const darkModeClasses = {
  bg: tokens.colors.dark.background,
  textPrimary: tokens.colors.dark.textPrimary,
  textSecondary: tokens.colors.dark.textSecondary,
  border: tokens.colors.dark.borderLight,
  card: tokens.colors.dark.card,
};

const lightModeClasses = {
  bg: tokens.colors.light.background,
  textPrimary: tokens.colors.light.textPrimary,
  textSecondary: tokens.colors.light.textSecondary,
  border: tokens.colors.light.borderLight,
  card: tokens.colors.light.card,
};

export default function LoginPage() {
  const { user, loading, logout } = useAuth();
  const { setDarkMode, theme, toggleTheme } = useTheme();
  const { addToast, removeToast } = useToast();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [accountMessage, setAccountMessage] = useState("");

  // Remember me state
  const [rememberMe, setRememberMe] = useState(() => {
    const saved = localStorage.getItem("rememberMe");
    return saved === "true";
  });

  // Form validation
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      addToast("Validation error", "Please enter a valid email address", "error");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      addToast("Validation error", "Password must be at least 6 characters", "error");
      return;
    }

    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setError("");
      addToast("Login successful", "Welcome to MediCare Pro", "success");
    } catch (err) {
      console.error("Login error:", err);
      setError("Authentication failed. Please try again.");
      addToast("Login failed", err.message || "Authentication failed. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      addToast("Login successful", `${result.user.displayName || "User"} logged in`, "success");
    } catch (err) {
      const message = err.message || "Google sign-in failed";
      setError(message);
      addToast("Login failed", message, "error");
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center ${theme === "dark" ? "bg-slate-950" : "bg-slate-100"} overflow-x-hidden`}
    >
      {/* Theme toggle bar at top */}
      <div className="mb-8 w-full max-w-2xl flex items-center justify-between px-6">
        <button
          onClick={toggleTheme}
          className={`rounded-lg p-2 ${theme === "dark" ? "bg-slate-800" : "bg-slate-100"} hover:bg-slate-200 hover:text-slate-700 transition-colors flex items-center gap-2`}
          aria-label="Toggle dark mode"
        >
          {theme === "dark"
            ? <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 7v6l4 2" />
              </svg>
            : <svg className="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
              </svg>}
        </button>
      </div>

      {/* Login card */}
      <div
        className={`w-full max-w-md p-8 rounded-3xl shadow-2xl ${theme === "dark" ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"} text-center`}
      >
        {/* Logo/brand section */}
        <div className="text-center mb-10">
          <div className={theme === "dark" ? "w-14 h-14 rounded-2xl bg-primary-600 mx-auto mb-4 flex items-center justify-center" : "w-14 h-14 rounded-2xl bg-primary-500 mx-auto mb-4 flex items-center justify-center"} >
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 7v6l4 2" />
            </svg>
          </div>
          <h1 className={`text-3xl font-black mb-2 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>MediCare Pro</h1>
          <p className={`mt-2 text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>Smart Healthcare Management System</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-left text-sm text-red-700"
            >
              {error}
            </div>
          )}
          {/* Email field */}
          <div className={`border-b-2 border-{theme === "dark" ? "slate-700/30" : "slate-300/30"} transition-colors duration-200`}>
            <label
              className={`block text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"} mb-2`}
              htmlFor="email"
            >
              Email Address
            </label>
            <div className="relative">
              <svg
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm3 4h8c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2v-7h2v7zm10-3h-2v-2h2zm-5 7h-2v-4h2z" />
              </svg>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@medicarepro.com"
                required
                className={theme === "dark"
                  ? "w-full px-4 py-3 bg-slate-900 border-b-2 border-slate-800 text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
                  : "w-full px-4 py-3 bg-slate-100 border-b-2 border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary-500 transition-colors"}
                aria-label="Email address"
              />
            </div>
          </div>

          {/* Password field */}
          <div className={`border-b-2 border-{theme === "dark" ? "slate-700/30" : "slate-300/30"} transition-colors duration-200`}>
            <label
              className={`block text-sm font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-700"} mb-2`}
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <svg
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M1 21h4l2.68-4.32a2 2 0 0 1 1.95-1.84H23a2 2 0 0 1 2 1.84l-2.68 4.32H31l-1-5a2 2 0 0 0-2-2H11a2 2 0 0 0-2 2h5a2 2 0 0 1 2 1.84l2.68-4.32H5zm34-17l-1-5a2 2 0 0 0-2-2H13a2 2 0 0 0-2 2l1 5zm-7 8c2.21 0 4-1.79 4-4v-2c0-2.21-1.79-4-4-4s-4 1.79-4 4v2c0 2.21 1.79 4 4 4zm-8.12-6.88a2 2 0 1 1-2.73 1.45H5.68a2 2 0 0 1-1.95-3.57l2.1-3.41a4 4 0 0 1 5.46 0l2.1 3.41a2 2 0 1 1-2.73 1.45z" />
              </svg>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={theme === "dark"
                  ? "w-full px-4 py-3 bg-slate-900 border-b-2 border-slate-800 text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
                  : "w-full px-4 py-3 bg-slate-100 border-b-2 border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary-500 transition-colors"}
                aria-label="Password"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-500 transition-colors text-sm`}
                aria-label="Toggle password visibility"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Remember me / Forgot password */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className={theme === "dark"
                  ? "rounded border-slate-700 text-primary-600 focus:ring-primary-500"
                  : "rounded border-slate-300 text-slate-700 focus:ring-slate-100/50"}
              />
              <span className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
                Remember me
              </span>
            </div>
            <a
              href="/forgot-password"
              className={theme === "dark"
                ? "text-sm text-slate-400 hover:text-primary-400 transition-colors underline"
                : "text-slate-600 hover:text-primary-600 transition-colors underline"}
            >
              Forgot password?
            </a>
          </div>

          {/* Sign in button */}
          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`w-full bg-primary-600 text-white font-bold py-3 px-6 rounded-2xl ${theme === "dark" ? "shadow-primary-glow" : "shadow-primary"} transition-transform duration-200 ${submitting ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <span className="loading spinner inline-block animate-spin w-4 h-4 mr-2"></span>
                <span>Signing in...</span>
              </div>
            ) : (
              "Sign in"
            )}
          </motion.button>

          {/* Divider */}
          <div className={`my-6 flex items-center gap-4 ${theme === "dark" ? "text-slate-400" : "text-slate-500"} text-xs uppercase`} role="separator">
            <span className={`w-px h-6 bg-${theme === "dark" ? "slate-700" : "slate-300"}`} />
            <span>Or continue with</span>
            <span className={`w-px h-6 bg-${theme === "dark" ? "slate-700" : "slate-300"}`} />
          </div>

          {/* Google sign-in button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`w-full border-2 border-{theme === "dark" ? "primary-500/30" : "primary-200"} text-{theme === "dark" ? "primary-400" : "primary-600"} font-medium py-3 px-6 rounded-2xl transition-all duration-200 flex items-center justify-center gap-3`}
            onClick={handleGoogleLogin}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M22.54 5.41a1.96 1.96 0 0 0-1.43-1.43H15.72a4 4 0 0 0-2.83 2.84L3.39 16.03a4 4 0 0 0-2.83 2.84l1.39 1.39C3.5 21.81 7.81 24 12 24s8.5-2.19 8.5-5.41c0-1.43-.26-2.82-.73-4.21l1.36-1.36a19.79 19.79 0 0 0 .17-2.03 19.5 19.5 0 0 0-2.03-.17z" />
              <path d="M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15z" />
              <path d="M2 12a10 10 0 1 1 20 0 10 10 0 0 1-20 0z" />
            </svg>
            Continue with Google
          </motion.button>

          {/* Divider */}
          <div className={`my-6 flex items-center gap-4 ${theme === "dark" ? "text-slate-400" : "text-slate-500"} text-xs uppercase`} role="separator">
            <span className={`w-px h-6 bg-${theme === "dark" ? "slate-700" : "slate-300"}`} />
            <span>Or sign in with email</span>
            <span className={`w-px h-6 bg-${theme === "dark" ? "slate-700" : "slate-300"}`} />
          </div>

          {/* Divider */}
          <div className={`my-4 flex items-center gap-4 ${theme === "dark" ? "border-t border-slate-700/30" : "border-t border-slate-200/50"}`} role="separator">
            <span />
            <span className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Don't have an account?
            </span>
            <span />
          </div>

          {/* Sign up link */}
          {accountMessage && (
            <div role="status" className="text-sm text-slate-500">
              {accountMessage}
            </div>
          )}
          <button
            type="button"
            className={`text-center text-sm ${theme === "dark" ? "text-slate-400 hover:text-primary-400" : "text-slate-600 hover:text-primary-600"} cursor-pointer`}
            onClick={() => setAccountMessage("Account creation is managed by your hospital administrator.")}
          >
            Create account
          </button>
        </form>
      </div>
    </div>
  );
}