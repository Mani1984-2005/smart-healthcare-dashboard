// TOPBAR — Premium cinematic topbar for MediCare Pro
// ===================================================
// Fixed header sitting above page content, to the right of the Sidebar.
// Holds: mobile menu trigger, page title slot, and user profile menu.
//
// Features:
// - Glassmorphism with backdrop blur
// - Mobile sidebar toggle
// - Page title display
// - User profile dropdown
// - Smooth hover transitions

import { useState } from "react";
import { Menu, LogOut, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Topbar({ pageTitle, darkMode, onMenuToggle }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header
      className={`sticky top-0 z-30 h-16 ${darkMode ? "bg-slate-950/80 border-slate-800/50" : "bg-white/90 border-slate-200/50"} backdrop-blur-xl border-b flex items-center justify-between px-6 md:px-8 gap-4 transition-colors duration-300`}
    >
      {/* Left: mobile menu + page title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className={`md:hidden rounded-lg p-2 ${darkMode ? "bg-slate-800" : "bg-slate-100"} hover:bg-slate-200 hover:text-slate-700 transition-colors`}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-slate-500" />
        </button>

        {pageTitle && (
          <h1 className={`text-lg font-medium ${darkMode ? "text-slate-100" : "text-slate-900"} truncate`}>
            {pageTitle}
          </h1>
        )}
      </div>

      {/* Right: user profile */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setProfileOpen(false);
            }}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            className={`rounded-full w-10 h-10 ${darkMode ? "bg-slate-800" : "bg-slate-100"} flex items-center justify-center ${darkMode ? "text-slate-200" : "text-slate-800"} hover:bg-slate-200 hover:text-slate-700 transition-colors`}
            aria-label="Profile"
          >
            {user?.photo ? (
              <img src={user.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="text-sm font-semibold">{user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
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
                <span className={`text-sm font-medium ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                  {user?.name || "User"}
                </span>
              </div>
              <p className={darkMode ? "text-xs text-slate-400 truncate" : "text-xs text-slate-500 truncate"}>
                {user?.email || ""}
              </p>

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
                  onClick={async () => {
                    setProfileOpen(false);
                    await logout();
                  }}
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
    </header>
  );
}