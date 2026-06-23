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
import { Menu, Bell, ChevronDown, LogOut, Settings as SettingsIcon, User } from "lucide-react";

export default function Topbar({ onOpenMobileSidebar, pageTitle }) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur border-b border-neutral-200/70 flex items-center justify-between px-4 md:px-6 gap-4">
      {/* Left: mobile menu + page title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden w-9 h-9 inline-flex items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        {pageTitle && (
          <h1 className="text-h2 text-neutral-800 truncate">{pageTitle}</h1>
        )}
      </div>

      {/* Right: notifications + profile */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          className="relative w-9 h-9 inline-flex items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-500" />
        </button>

        <div className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-md hover:bg-neutral-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-small font-semibold">
              <User size={16} />
            </div>
            <ChevronDown size={14} className="text-neutral-400 hidden sm:block" />
          </button>

          {profileOpen && (
            <>
              {/* Click-outside catcher */}
              <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lift border border-neutral-100 py-1.5 z-20 animate-fade-in">
                <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-small text-neutral-600 hover:bg-neutral-50 transition-colors">
                  <SettingsIcon size={15} />
                  Settings
                </button>
                <div className="h-px bg-neutral-100 my-1" />
                <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-small text-error-500 hover:bg-error-50 transition-colors">
                  <LogOut size={15} />
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