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
    if (typeof window !== "undefined" && user.token) {
      window.localStorage.setItem("medicare_auth_token", user.token);
    }
    set({ user, isAuthenticated: true });
  },
  logout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem("medicare_auth_token");
    }
    set({ user: null, isAuthenticated: false });
  },
}));
