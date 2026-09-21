import { create } from "zustand";

export const useNotificationStore = create((set) => ({
  notifications: [],
  addNotification(notification) {
    set((state) => ({ notifications: [...state.notifications, notification] }));
  },
  removeNotification(id) {
    set((state) => ({ notifications: state.notifications.filter((item) => item.id !== id) }));
  },
  clearNotifications() {
    set({ notifications: [] });
  },
}));
