// NAVBAR — Premium cinematic navbar for MediCare Pro
// ==================================================
// A fixed-top navbar with glassmorphism, subtle animations,
// and role-aware actions. Works in tandem with AppShell sidebar.
//
// Features:
// - Glassmorphism with backdrop blur
// - Animated toggle for mobile
// - User menu with profile dropdown
// - Dark mode toggle
// - Role badge display
// - Smooth hover micro-interactions

import { useEffect, useState } from "react";
import { Menu, X, Moon, Sun, User, LogOut, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { shadows } from "../../design-system/tokens";

const NAV_HEIGHT = "64px";

export default function Navbar({ onDarkModeToggle, onLogout, darkMode: controlledDarkMode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(
    controlledDarkMode ?? (localStorage.getItem("theme") !== "light")
  );

  useEffect(() => {
    if (typeof controlledDarkMode === "boolean") setDarkMode(controlledDarkMode);
  }, [controlledDarkMode]);

  const toggleDarkMode = () => {
    const newDark = !darkMode;
    setDarkMode(newDark);
    localStorage.setItem("theme", newDark ? "dark" : "light");
    onDarkModeToggle?.(newDark);
  };

  const handleLogout = async () => {
    try {
      setProfileOpen(false);
      await onLogout?.();
    } catch (err) {
      console.warn("Logout error:", err);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 h-[${NAV_HEIGHT}] flex items-center justify-between px-6 md:px-8 ${darkMode ? "bg-slate-950/80 border-slate-800/50" : "bg-white/90 border-slate-200/50"} backdrop-blur-xl border-b transition-colors duration-300`}
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl ${darkMode ? "bg-primary-600" : "bg-primary-500"} flex items-center justify-center`}
            style={{ boxShadow: shadows.glow }}
          >
            <svg
              className="w-6 h-6 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 7v6l4 2" />
            </svg>
          </div>
          <span className={`text-xl font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>
            MediCare Pro
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleDarkMode}
            className={`rounded-lg p-2 ${darkMode ? "bg-white/10 hover:bg-white/15 transition-colors" : "bg-slate-200 hover:bg-slate-300 transition-colors"} ${!loading ? "hover:shadow-sm" : ""}`}
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Moon className="w-5 h-5 text-slate-400" />
            ) : (
              <Sun className="w-5 h-5 text-slate-600" />
            )}
          </button>

          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className={`rounded-lg p-2 ${darkMode ? "bg-white/10 hover:bg-white/15 transition-colors" : "bg-slate-200 hover:bg-slate-300 transition-colors"} ${!loading ? "hover:shadow-sm" : ""}`}
            aria-label="Search"
          >
            <Search className="w-5 h-5 text-slate-500" />
          </button>

          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setProfileOpen(false);
              }}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              className={`rounded-full w-10 h-10 ${darkMode ? "bg-slate-800" : "bg-slate-100"} flex items-center justify-center ${!loading ? "hover:bg-slate-200 hover:text-slate-700 transition-colors" : ""} ${searchOpen ? "hidden" : ""}`}
              aria-label="Profile"
            >
              {user?.photo ? (
                <img src={user.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <span className="text-sm font-semibold">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              )}
            </button>

            {profileOpen && (
              <div
                className={`absolute right-0 top-full mt-2 w-64 rounded-md shadow-xl border p-4 flex flex-col gap-3 z-50 ${darkMode ? "bg-slate-900 border-slate-700/30" : "bg-white border-slate-200/30"}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full ${darkMode ? "bg-primary-500" : "bg-primary-600"} flex items-center justify-center text-sm font-medium ${darkMode ? "text-white" : "text-white"}`}
                  >
                    {user?.name?.charAt(0) || "U"}
                  </div>
                  <div className="min-w-0">
                    <span className={`block text-sm font-medium ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                      {user?.name || "User"}
                    </span>
                    <p className={`text-xs truncate ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                      {user?.email || ""}
                    </p>
                  </div>
                </div>

                <div className={`flex flex-col gap-2 pt-3 border-t ${darkMode ? "border-slate-700/20" : "border-slate-200/20"}`}>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate("/settings");
                    }}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm ${darkMode ? "text-slate-400 hover:bg-slate-800/30" : "text-slate-500 hover:bg-slate-100/50"} transition-colors`}
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm ${darkMode ? "text-slate-400 hover:bg-slate-800/30" : "text-slate-500 hover:bg-slate-100/50"} transition-colors text-red-500`}
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className={`fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-xl ${searchOpen ? "pt-20" : ""}`}
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close mobile menu"
        />
      )}

      {/* Mobile menu (hamburger → cross) - shown only on mobile */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className={`md:hidden rounded-lg p-2 ${darkMode ? "bg-slate-800" : "bg-slate-100"} hover:bg-slate-200 hover:text-slate-700 transition-colors`}
        aria-label="Open menu"
      >
        {mobileMenuOpen ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <Menu className="w-5 h-5 text-slate-600" />
        )}
      </button>
    </nav>
  );
}

// ============================================================
// EXPORT HOOK FOR DARK MODE SYNC
// ============================================================
export const useNavbarDarkMode = () => {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") !== "light");

  const toggle = () => {
    const newDark = !darkMode;
    setDarkMode(newDark);
    localStorage.setItem("theme", newDark ? "dark" : "light");
    return newDark;
  };

  return { darkMode, setDarkMode, toggle };
};