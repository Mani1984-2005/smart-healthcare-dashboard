import { create } from "zustand";

export const useUiStore = create((set) => ({
  isSidebarCollapsed: false,
  isDarkMode: false,
  setSidebarCollapsed(value) {
    set({ isSidebarCollapsed: value });
  },
  toggleDarkMode() {
    set((state) => ({ isDarkMode: !state.isDarkMode }));
  },
}));
