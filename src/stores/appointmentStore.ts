import { create } from "zustand";
import api from "../services/api.js";

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  timeSlot: string;
  status: string;
  reason?: string;
  notes?: string;
  patient?: any;
  doctor?: any;
}

interface AppointmentState {
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
  fetchAppointments: () => Promise<void>;
  bookAppointment: (data: any) => Promise<void>;
  updateStatus: (id: string, status: string) => Promise<void>;
}

export const useAppointmentStore = create<AppointmentState>((set) => ({
  appointments: [],
  isLoading: false,
  error: null,
  fetchAppointments: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get("/appointments");
      set({ appointments: response.data, isLoading: false });
    } catch (error: any) {
      const message = error?.message || "Failed to load appointments";
      set({ error: message, isLoading: false });
      throw new Error(message, { cause: error });
    }
  },
  bookAppointment: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post("/appointments", data);
      set((state) => ({ appointments: [...state.appointments, response.data], isLoading: false }));
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || "Failed to book appointment";
      set({ error: message, isLoading: false });
      throw new Error(message, { cause: error });
    }
  },
  updateStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/appointments/${id}/status`, { status });
      set((state) => ({
        appointments: state.appointments.map(a => a.id === id ? { ...a, status } : a),
        isLoading: false
      }));
    } catch (error: any) {
      const message = error?.message || "Failed to update appointment status";
      set({ error: message, isLoading: false });
      throw new Error(message, { cause: error });
    }
  }
}));
