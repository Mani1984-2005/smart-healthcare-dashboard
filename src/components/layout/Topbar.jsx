// FILE PATH: src/components/layout/Topbar.jsx
// CREATE this new file.
//
// Top header bar — sits above page content, to the right of the Sidebar.
// Holds: mobile menu trigger, page title slot, global search (optional),
// notifications icon, and a user/profile menu placeholder.
//
// No business logic — purely structural. If you don't have a real
// auth/profile system yet, the profile menu below is just a static
// display with a "Log out" action that can be wired up later.
//
// USAGE: rendered automatically inside AppShell.jsx — you shouldn't need
// to import this directly in pages.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Bell, ChevronDown, LogOut, Settings as SettingsIcon, User, Sun, Moon, ArrowLeft, Home } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function Topbar({ onOpenMobileSidebar, pageTitle, darkMode, setDarkMode, user, onLogout }) {
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const { lang, setLang, languages } = useLanguage();

  const handleBack = () => {
    try {
      if (window.history.length > 2) {
        navigate(-1);
      } else {
        navigate('/dashboard');
      }
    } catch {
      navigate('/dashboard');
    }
  };

  const handleHome = () => {
    navigate('/dashboard');
  };

  return (
    <header className="sticky top-0 z-35 h-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-neutral-200/70 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 gap-4 shadow-sm">
      {/* Left: mobile menu + back + home + page title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden w-11 h-11 inline-flex items-center justify-center rounded-2xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-slate-800"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>

        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs sm:text-sm transition-all shadow-sm"
          title="Go Back"
          aria-label="Go Back"
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">Back</span>
        </button>

        <button
          onClick={handleHome}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs sm:text-sm transition-all shadow-sm"
          title="Home Dashboard"
          aria-label="Home Dashboard"
        >
          <Home size={18} />
          <span className="hidden sm:inline">Home</span>
        </button>

        {pageTitle && (
          <h1 className="text-xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight truncate ml-2">{pageTitle}</h1>
        )}
      </div>

      {/* Right: language, theme, notifications + profile */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Language selector */}
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-800 dark:text-white border border-neutral-200 dark:border-slate-700 cursor-pointer outline-none transition-all shadow-sm"
          aria-label="Select language"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code} className="bg-white dark:bg-slate-900 text-neutral-900 dark:text-white">
              {l.native}
            </option>
          ))}
        </select>



        {/* Notifications */}
        <button
          className="relative w-11 h-11 inline-flex items-center justify-center rounded-2xl bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 text-neutral-700 dark:text-neutral-300 transition-all shadow-sm"
          aria-label="Notifications"
        >
          <Bell size={22} />
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-cyan-600 ring-2 ring-white dark:ring-slate-900" />
        </button>

        {/* User profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-3 pl-2.5 pr-4 py-2 rounded-2xl bg-neutral-100 dark:bg-slate-800 hover:bg-neutral-200 dark:hover:bg-slate-700 transition-all border border-neutral-200/60 dark:border-slate-700 shadow-sm"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              <User size={20} />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-extrabold text-neutral-900 dark:text-white truncate max-w-[120px]">{user?.name || "User"}</p>
              <p className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 capitalize">{user?.role || "Staff"}</p>
            </div>
            <ChevronDown size={14} className="text-neutral-400" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-slate-800 py-2.5 z-20 animate-fade-in">
                <div className="px-4 py-2.5 border-b border-neutral-100 dark:border-slate-800 mb-1.5">
                  <p className="text-sm font-extrabold text-neutral-900 dark:text-white truncate">{user?.name || "User"}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{user?.email || "user@medicare.pro"}</p>
                </div>
                <button 
                  onClick={() => { setProfileOpen(false); window.location.href = '/settings'; }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <SettingsIcon size={18} />
                  Settings & Profile
                </button>
                <div className="h-px bg-neutral-100 dark:bg-slate-800 my-1" />
                <button 
                  onClick={() => { setProfileOpen(false); onLogout?.(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <LogOut size={18} />
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}