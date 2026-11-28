// SETTINGS PAGE — Premium cinematic settings and profile
// =======================================================
// Redesigned user settings and profile management with
// glassmorphism, security options, and theme customization.

import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../context/AuthContext";
import { tokens } from "../design-system/tokens";
import { motion } from "framer-motion";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { auth } from "../firebase";

export default function SettingsPage() {
  const { theme, setDarkMode, colorMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Profile data from auth context or localStorage
  const profile = {
    name: user?.name || "Authenticated user",
    email: user?.email || "Email unavailable",
    role: user?.role || "Role resolved by backend",
  };

  const handlePasswordToggle = () => setShowPassword(!showPassword);
  const handleNewPasswordToggle = () => setShowNewPassword(!showNewPassword);

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setIsSaving(true);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser?.email) {
        throw new Error("This account cannot be reauthenticated with a password.");
      }
      if (!password) {
        throw new Error("Current password is required.");
      }
      const credential = EmailAuthProvider.credential(firebaseUser.email, password);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);
      setSuccess("Password updated successfully");
      setTimeout(() => {
        setIsSaving(false);
        setError("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowNewPassword(false);
      }, 2000);
    } catch (err) {
      setError("Failed to update password");
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    setSuccess("Logged out successfully");
    setTimeout(() => setSuccess(""), 2000);
  };

  return (
    <main className={`min-h-screen ${colorMode === "dark" ? "bg-dark-background text-dark-text" : "bg-background text-text"} transition-colors duration-500`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Profile header */}
        <div className="bg-{tokens.colors.dark.card} border border-{tokens.colors.dark.borderLight} rounded-2xl p-6 mb-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-2xl {tokens.colors.dark.background} flex items-center justify-center text-{tokens.colors.accent.primary} font-bold text-2xl shrink-0">
              {profile.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-{tokens.colors.dark.textPrimary}">{profile.name}</h2>
              <p className="text-sm text-{tokens.colors.dark.textMuted}">{profile.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              className={`px-3 py-1.5 rounded-xl border border-{tokens.colors.dark.borderLight} bg-{tokens.colors.dark.background} text-{tokens.colors.dark.textPrimary} text-sm transition-colors`}
              onClick={toggleTheme}
            >
              {colorMode === "dark" ? "Light mode" : "Dark mode"}
            </motion.button>
          </div>
        </div>

        {/* Security section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            whileHover={{ y: -2, scale: 1.02 }}
            className="p-6 rounded-2xl bg-{tokens.colors.dark.card} border border-{tokens.colors.dark.borderLight} transition-all duration-300"
          >
            <h3 className="text-semibold text-{tokens.colors.dark.textPrimary} mb-3">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-small text-{tokens.colors.dark.textMuted} mb-2`}>Current Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter current password"
                    className={`w-full px-4 py-3 rounded-2xl border border-{tokens.colors.dark.borderLight} bg-{tokens.colors.dark.background} text-{tokens.colors.dark.textPrimary} focus:outline-none focus:ring-2 focus-ring-{tokens.colors.accent.primary}/20 focus:border-{tokens.colors.accent.primary} transition-colors`}
                    aria-label="Current password"
                  />
                  <button
                    onClick={handlePasswordToggle}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-{tokens.colors.dark.textMuted} hover:text-{tokens.colors.accent.primary} transition-colors text-sm`}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div>
                <label className={`block text-small text-{tokens.colors.dark.textMuted} mb-2`}>New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className={`w-full px-4 py-3 rounded-2xl border border-{tokens.colors.dark.borderLight} bg-{tokens.colors.dark.background} text-{tokens.colors.dark.textPrimary} focus:outline-none focus:ring-2 focus-ring-{tokens.colors.accent.primary}/20 focus:border-{tokens.colors.accent.primary} transition-colors`}
                    aria-label="New password"
                  />
                  <button
                    onClick={handleNewPasswordToggle}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-{tokens.colors.dark.textMuted} hover:text-{tokens.colors.accent.primary} transition-colors text-sm`}
                    aria-label="Toggle password visibility"
                  >
                    {showNewPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div>
                <label className={`block text-small text-{tokens.colors.dark.textMuted} mb-2`}>Confirm New Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className={`w-full px-4 py-3 rounded-2xl border border-{tokens.colors.dark.borderLight} bg-{tokens.colors.dark.background} text-{tokens.colors.dark.textPrimary} focus:outline-none focus:ring-2 focus-ring-{tokens.colors.accent.primary}/20 focus:border-{tokens.colors.accent.primary} transition-colors`}
                    aria-label="Confirm password"
                  />
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={isSaving}
                className={`w-full bg-{tokens.colors.accent.primary} text-white font-bold py-3 px-6 rounded-2xl transition-transform duration-200 {tokens.colors.dark.shadow} ${isSaving ? "opacity-70 cursor-not-allowed" : ""}`}
                onClick={handlePasswordChange}
              >
                {isSaving ? "Updating..." : "Save Password Changes"}
              </motion.button>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2, scale: 1.02 }}
            className="p-6 rounded-2xl bg-{tokens.colors.dark.card} border border-{tokens.colors.dark.borderLight} transition-all duration-300"
          >
            <h3 className="text-semibold text-{tokens.colors.dark.textPrimary} mb-3">Account Security</h3>
            <p className="text-small text-{tokens.colors.dark.textMuted} mb-2">Your account is protected with enterprise-grade security.</p>
            <ul className="space-y-3 text-small text-{tokens.colors.dark.textMuted}">
              <li>Session identity: verified by Firebase</li>
              <li>Backend authorization: shown only after identity resolution</li>
              <li>Account security details: provider-managed</li>
            </ul>
          </motion.div>

          <motion.div
            whileHover={{ y: -2, scale: 1.02 }}
            className="p-6 rounded-2xl bg-{tokens.colors.dark.card} border border-{tokens.colors.dark.borderLight} transition-all duration-300"
          >
            <h3 className="text-semibold text-{tokens.colors.dark.textPrimary} mb-3">Subscription</h3>
            <p className="text-small text-{tokens.colors.dark.textMuted} mb-2">MediCare Pro Enterprise</p>
            <p className="text-small text-{tokens.colors.dark.textMuted} mb-4">Valid until: —</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              className={`w-full text-left text-{tokens.colors.accent.primary} underline transition-colors text-sm`}
              aria-label="Upgrade subscription"
            >
              Manage Plan
            </motion.button>
          </motion.div>
        </div>

        {/* Activity log */}
        <div className="bg-{tokens.colors.dark.card} border border-{tokens.colors.dark.borderLight} rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-{tokens.colors.dark.textPrimary} mb-4">Activity Log</h2>
          <div className="space-y-3 text-small text-{tokens.colors.dark.textMuted}">
            <div>
              <span className="font-medium text-{tokens.colors.dark.textPrimary}">Just now</span>
              <span>Profile updated</span>
            </div>
            <div>
              <span className="font-medium text-{tokens.colors.dark.textPrimary}">2 hours ago</span>
              <span>Password change requested</span>
            </div>
            <div>
              <span className="font-medium text-{tokens.colors.dark.textPrimary}">Yesterday</span>
              <span>Login from new device</span>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}