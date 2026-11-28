// FORGOT PASSWORD PAGE — Premium cinematic password recovery
// =============================================================
// Redesigned password recovery screen with email-based
// reset flow and glassmorphism design.

import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { tokens } from "../design-system/tokens";
import { motion } from "framer-motion";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

export default function ForgotPasswordPage() {
  const { theme, colorMode } = useTheme();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-computed class names for dark mode
  const emailLabelClass = colorMode === "dark"
    ? "block text-small font-medium text-slate-300 mb-2"
    : "block text-small font-medium text-slate-700 mb-2";

  const inputClass = colorMode === "dark"
    ? "w-full px-4 py-3 bg-slate-900 border-b-2 border-slate-800 text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
    : "w-full px-4 py-3 bg-slate-100 border-b-2 border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary-500 transition-colors";

  const placeholderClass = colorMode === "dark"
    ? "placeholder-slate-400"
    : "placeholder-slate-400";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      console.error("Password reset error:", err);
      setError(err?.message || "Could not send the password reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`min-h-screen flex items-center justify-center ${colorMode === "dark" ? "bg-slate-950" : "bg-slate-100"} overflow-x-hidden`}>
      <div className="w-full max-w-md p-8">
        {sent ? (
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary-600 mx-auto flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 7v6l4 2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4">Reset Instructions Sent</h2>
            <p className="text-base text-slate-300">If an account with that email exists, we've sent a password reset link.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <h1 className={colorMode === "dark" ? "text-3xl font-black mb-6 text-white" : "text-3xl font-black mb-6 text-slate-900"}>Password Recovery</h1>
            <p className={colorMode === "dark" ? "text-sm text-slate-300" : "text-sm text-slate-500"}>
              Enter your email address and we'll send you a link to reset your password.
            </p>
            <div className={colorMode === "dark" ? "group border-b-2 border-slate-700/30 transition-colors duration-200" : "group border-b-2 border-slate-300/30 transition-colors duration-200"}>
              <label className={emailLabelClass}>Email Address</label>
              <div className="relative">
                <svg className={`absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 ${colorMode === "dark" ? "text-slate-400" : "text-slate-500"}`} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm3 4h8c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2v-4h2v4zm5 8c2.21 0 4-1.79 4-4s-1.79-4-4-4a4.01 4.01 0 0 0-4 4c0 2.21 1.79 4 4 4z" />
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@medicarepro.com"
                  required
                  className={inputClass}
                  aria-label="Email address"
                />
              </div>
            </div>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`w-full bg-primary-600 text-white font-bold py-3 px-6 rounded-2xl transition-transform duration-200 ${colorMode === "dark" ? "shadow-primary-glow" : "shadow-primary"}`}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </motion.button>
            <p className={colorMode === "dark" ? "text-small text-slate-400 mt-3" : "text-small text-slate-500 mt-3"}>
              By clicking, you agree to our terms and privacy policy.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}