import { create } from "zustand";

const storageKey = "medicare_pro_user";

function loadUser() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || "null");
  } catch {
    return null;
  }
}

function persistUser(user) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(user));
}

export const useAuthStore = create((set) => ({
  user: loadUser(),
  isAuthenticated: Boolean(loadUser()),
  login(user) {
    persistUser(user);
    set({ user, isAuthenticated: true });
  },
  logout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
    set({ user: null, isAuthenticated: false });
  },
}));
