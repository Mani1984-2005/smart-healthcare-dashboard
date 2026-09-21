import { create } from "zustand";
import type { P6User, Session } from "../api/types";

// Part 6 has its OWN session, separate from the main MediCare Pro login. The token lives in sessionStorage
// (cleared when the tab closes). The token is short-lived and revocable server-side; for production, prefer an
// httpOnly, SameSite cookie issued by the real identity provider.
const KEY = "part6_session";

function load(): Session | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return s?.token && Date.parse(s.expiresAt) > Date.now() ? s : null;
  } catch {
    return null;
  }
}

interface AuthState {
  token: string | null;
  user: P6User | null;
  expiresAt: string | null;
  setSession: (s: Session) => void;
  clear: () => void;
}

const initial = typeof window === "undefined" ? null : load();

export const usePart6Auth = create<AuthState>((set) => ({
  token: initial?.token ?? null,
  user: initial?.user ?? null,
  expiresAt: initial?.expiresAt ?? null,
  setSession(s) {
    window.sessionStorage.setItem(KEY, JSON.stringify(s));
    set({ token: s.token, user: s.user, expiresAt: s.expiresAt });
  },
  clear() {
    window.sessionStorage.removeItem(KEY);
    set({ token: null, user: null, expiresAt: null });
  },
}));
