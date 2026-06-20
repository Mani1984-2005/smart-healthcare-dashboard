import { useState } from "react";

export default function Navbar({
  page,
  setPage,
  darkMode,
  setDarkMode,
  user,
  onLogout,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const role = user?.role || "Admin";

  const roleLinks = {
    Patient: ["Home", "Dashboard", "Patients", "Doctors", "Contact"],
   Admin: [
  "Home",
  "Dashboard",
  "Patients",
  "Doctors",
  "Medicines",
  "Pharmacy",
  "Staff",
  "Complaints",
  "Contact", "Billing", "Laboratory", "Reports"
],
   Hospital: [
  "Home",
  "Dashboard",
  "Patients",
  "Doctors",
  "Medicines",
  "Pharmacy",
  "Staff",
  "Complaints",
"Contact", "Billing", "Laboratory", "Reports"
],
    Receptionist: ["Home", "Dashboard", "Patients", "Doctors", "Contact"],
  };

  const navLinks = roleLinks[role] || roleLinks.Admin;

  const handleNavigate = (item) => {
    setPage(item);
    setMenuOpen(false);
  };

  return (
    <nav
      className={`sticky top-0 z-40 shadow-lg border-b ${
        darkMode
          ? "bg-slate-950 border-slate-800"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => handleNavigate("Home")}
        >
          <div className="text-2xl">🏥</div>

          <div>
            <div
              className={`font-bold text-lg leading-tight ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              MediCare Pro
            </div>
            <div className="text-xs text-cyan-500 leading-tight">
              Smart Hospital Management
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2">
          {navLinks.map((item) => (
            <button
              key={item}
              onClick={() => handleNavigate(item)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                page === item
                  ? "bg-cyan-600 text-white shadow"
                  : darkMode
                  ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item}
            </button>
          ))}

          <button
            onClick={() => setDarkMode((prev) => !prev)}
            className={`ml-2 px-3 py-2 rounded-lg transition-all ${
              darkMode
                ? "bg-slate-800 text-yellow-300 hover:bg-slate-700"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {darkMode ? "☀ Light" : "🌙 Dark"}
          </button>

          <div
            className={`ml-2 px-3 py-2 rounded-lg text-sm ${
              darkMode
                ? "bg-slate-800 text-slate-200"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {user?.name || "Mani"} ({role})
          </div>

          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-all"
          >
            Logout
          </button>
        </div>

        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={() => setDarkMode((prev) => !prev)}
            className={`p-2 rounded-lg ${
              darkMode
                ? "bg-slate-800 text-yellow-300"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {darkMode ? "☀" : "🌙"}
          </button>

          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className={`p-2 rounded-lg ${
              darkMode ? "text-white" : "text-slate-900"
            }`}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className={`lg:hidden px-4 pb-4 flex flex-col gap-2 ${
            darkMode ? "bg-slate-950" : "bg-white"
          }`}
        >
          {navLinks.map((item) => (
            <button
              key={item}
              onClick={() => handleNavigate(item)}
              className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-all ${
                page === item
                  ? "bg-cyan-600 text-white"
                  : darkMode
                  ? "text-slate-300 hover:bg-slate-800"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item}
            </button>
          ))}

          <div
            className={`px-3 py-2 rounded-lg text-sm ${
              darkMode
                ? "bg-slate-800 text-slate-200"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {user?.name || "Mani"} ({role})
          </div>

          <button
            onClick={onLogout}
            className="px-3 py-2 rounded-lg text-sm font-medium text-left bg-red-600 text-white"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}