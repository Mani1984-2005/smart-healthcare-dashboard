import { Bell, Menu, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../store/authStore.js";
import { useUiStore } from "../store/uiStore.js";
import { Avatar, Button, IconButton, SearchField } from "../components/ui";

export default function Navbar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { user, logout } = useAuthStore();
  const [query, setQuery] = useState("");
  const { isDarkMode, toggleDarkMode } = useUiStore();
  return <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"><div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8"><IconButton label="Open navigation" onClick={onMenuToggle} className="lg:hidden"><Menu className="h-5 w-5" /></IconButton><div className="hidden min-w-0 lg:block"><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Enterprise Healthcare Portal</p><p className="text-xs text-slate-500 dark:text-slate-400">Operational workspace</p></div><div className="flex flex-1 justify-center px-1 sm:px-4"><SearchField value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patients, doctors, reports…" className="max-w-2xl" /></div><div className="flex items-center gap-2"><IconButton label={isDarkMode ? "Use light theme" : "Use dark theme"} onClick={toggleDarkMode}>{isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</IconButton><IconButton label="Notifications" className="relative"><Bell className="h-4 w-4" /><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-600" /></IconButton><div className="hidden items-center gap-2 pl-1 sm:flex"><Avatar name={user?.name || "Hospital Partner"} size="sm" /><div className="hidden xl:block"><p className="max-w-36 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.name || "Hospital Partner"}</p><p className="text-xs text-slate-500 dark:text-slate-400">{user?.role || "Guest"}</p></div><Button variant="ghost" onClick={logout} className="hidden xl:inline-flex">Sign out</Button></div></div></div></header>;
}
