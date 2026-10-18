import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

export default function Navbar({
  page,
  setPage,
  darkMode,
  setDarkMode,
  user,
  onLogout,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { lang, setLang, languages } = useLanguage();

  const role = user?.role || "Admin";

  const roleLinks = {
    Patient: [
      "Home",
      "Dashboard",
      "Doctors",
      "Patient Relations",
    ],
    Receptionist: [
      "Home",
      "Dashboard",
      "Patients",
      "Doctors",
      "Billing",
      "Patient Relations",
    ],
    Doctor: [
      "Home",
      "Dashboard",
      "Patients",
      "Laboratory",
      "Patient Relations",
    ],
    Admin: [
      "Home",
      "Dashboard",
      "Patients",
      "Doctors",
      "Pharmacy",
      "Billing",
      "Laboratory",
      "Staff",
      "Patient Relations",
    ],
    Hospital: [
      "Home",
      "Dashboard",
      "Patients",
      "Doctors",
      "Pharmacy",
      "Billing",
      "Laboratory",
      "Staff",
      "Patient Relations",
    ],
  };
  const navLinks = roleLinks[role] || roleLinks.Admin;

  const handleNavigate = (item) => {
    setPage(item);
    setMenuOpen(false);
  };

  return (
    <nav
      className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 shadow-sm ${
        darkMode
          ? "bg-slate-950/90 border-slate-800/80 text-white"
          : "bg-white/95 border-slate-200/80 text-slate-900"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
        {/* Brand Logo & Title */}
        <div
          className="flex items-center gap-3.5 cursor-pointer group"
          onClick={() => handleNavigate("Home")}
        >
          <div className="p-2 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 shadow-md group-hover:scale-105 transition-transform">
            <svg className="w-7 h-7 text-white" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 12V36M12 24H36" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
            </svg>
          </div>

          <div>
            <div className="font-black text-xl tracking-tight leading-tight">
              MediCare Pro
            </div>
            <div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 tracking-wider uppercase">
              Smart Hospital Platform
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links & Controls */}
        <div className="hidden lg:flex items-center gap-2">
          {navLinks.map((item) => (
            <button
              key={item}
              onClick={() => handleNavigate(item)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                page === item
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30 scale-105"
                  : darkMode
                  ? "text-slate-300 hover:bg-slate-900 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item}
            </button>
          ))}

          <div className="h-6 w-[1px] bg-slate-300 dark:bg-slate-800 mx-2" />

          {/* Language Selector */}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all outline-none ${
              darkMode
                ? "bg-slate-900 border-slate-700 text-white hover:border-cyan-500"
                : "bg-slate-100 border-slate-300 text-slate-800 hover:border-cyan-600"
            }`}
            aria-label="Select language"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code} className={darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>
                {l.native}
              </option>
            ))}
          </select>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              darkMode
                ? "bg-slate-900 text-yellow-400 border border-slate-700 hover:bg-slate-800"
                : "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200"
            }`}
            aria-label="Toggle theme"
          >
            {darkMode ? "☀ Light" : "🌙 Dark"}
          </button>

          {/* User Profile Badge */}
          <div
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 border ${
              darkMode
                ? "bg-slate-900/80 border-slate-800 text-cyan-300"
                : "bg-slate-100 border-slate-200 text-cyan-800"
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{user?.name || "Mani"} ({role})</span>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold shadow-md shadow-red-600/20 transition-all"
          >
            Logout
          </button>
        </div>

        {/* Mobile Header Controls */}
        <div className="lg:hidden flex items-center gap-2">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
              darkMode
                ? "bg-slate-900 border-slate-700 text-white"
                : "bg-slate-100 border-slate-300 text-slate-800"
            }`}
            aria-label="Select language"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code} className={darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"}>
                {l.native}
              </option>
            ))}
          </select>

          <button
            onClick={() => setDarkMode((prev) => !prev)}
            className={`p-2 rounded-xl text-xs font-bold ${
              darkMode
                ? "bg-slate-900 text-yellow-400 border border-slate-700"
                : "bg-slate-100 text-slate-700 border border-slate-300"
            }`}
            aria-label="Toggle theme"
          >
            {darkMode ? "☀" : "🌙"}
          </button>

          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className={`p-2.5 rounded-xl border ${
              darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-100 border-slate-300 text-slate-900"
            }`}
            aria-label="Toggle mobile menu"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {menuOpen && (
        <div
          className={`lg:hidden px-6 py-5 border-t flex flex-col gap-3 ${
            darkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="text-xs font-bold text-cyan-500 uppercase tracking-wider mb-1">
            Navigation Menu ({role})
          </div>
          {navLinks.map((item) => (
            <button
              key={item}
              onClick={() => handleNavigate(item)}
              className={`px-4 py-3 rounded-xl text-sm font-bold text-left transition-all ${
                page === item
                  ? "bg-cyan-600 text-white shadow"
                  : darkMode
                  ? "text-slate-300 hover:bg-slate-900"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item}
            </button>
          ))}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-xs font-bold">
              {user?.name || "Mani"} ({role})
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}