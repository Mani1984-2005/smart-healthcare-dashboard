import { create } from "zustand";
import { fetchAppointments, createAppointment, updateAppointment, deleteAppointment } from "../services/appointmentService.js";

export const useAppointmentStore = create((set) => ({
  appointments: [],
  loading: false,
  error: null,
  async loadAppointments() {
    set({ loading: true, error: null });
    try {
      const data = await fetchAppointments();
      set({ appointments: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  async addAppointment(payload) {
    set({ loading: true, error: null });
    try {
      const appointment = await createAppointment(payload);
      set((state) => ({ appointments: [appointment, ...state.appointments], loading: false }));
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  async updateAppointment(id, payload) {
    set({ loading: true, error: null });
    try {
      const appointment = await updateAppointment(id, payload);
      set((state) => ({
        appointments: state.appointments.map((item) => (item.id === id ? appointment : item)),
        loading: false,
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  async removeAppointment(id) {
    set({ loading: true, error: null });
    try {
      await deleteAppointment(id);
      set((state) => ({ appointments: state.appointments.filter((item) => item.id !== id), loading: false }));
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
}));
