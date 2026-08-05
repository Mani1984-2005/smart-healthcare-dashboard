import { useMemo, useState } from "react";
import { useAuthStore } from "../store/authStore.js";
import { useUiStore } from "../store/uiStore.js";
import SearchInput from "../components/common/SearchInput.jsx";
import Button from "../components/common/Button.jsx";

export default function Navbar({ onMenuToggle }) {
  const { user, logout } = useAuthStore();
  const [query, setQuery] = useState("");
  const { isDarkMode, toggleDarkMode } = useUiStore();

  const initials = useMemo(() => {
    if (!user?.name) return "HP";
    return user.name
      .split(" ")
      .map((segment) => segment[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user]);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex h-20 max-w-[1600px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <div className="hidden md:block">
            <p className="text-[0.625rem] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">MediCare Pro</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Enterprise Healthcare Portal</p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-2 sm:px-6">
          <SearchInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search patients, doctors, reports..."
            className="max-w-2xl"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>
          <button
            type="button"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            aria-label="Notifications"
          >
            <span>🔔</span>
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1.5 text-[0.65rem] font-semibold text-white">3</span>
          </button>
          <div className="hidden items-center gap-3 rounded-3xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 sm:flex">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-sm">{initials}</div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.name || "Hospital Partner"}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.role || "Guest"}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={logout} className="hidden sm:inline-flex">
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
