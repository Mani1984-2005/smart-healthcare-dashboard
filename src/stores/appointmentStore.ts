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
  bookAppointment: (data: any) => Promise<Appointment>;
  updateStatus: (id: string, status: string) => Promise<void>;
  clearAppointments: () => void;
}

export const useAppointmentStore = create<AppointmentState>((set) => ({
  appointments: [],
  isLoading: false,
  error: null,
  fetchAppointments: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get("/appointments");
      const appointments = Array.isArray(response?.data?.data) ? response.data.data : Array.isArray(response.data) ? response.data : [];
      set({ appointments, isLoading: false });
    } catch (error: any) {
      const message = error?.message || "Failed to load appointments";
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },
  bookAppointment: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post("/appointments", data);
      const appointment = response?.data?.data ?? response?.data;
      set((state) => ({ appointments: [...state.appointments.filter((item) => item.id !== appointment.id), appointment], isLoading: false }));
      return appointment;
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || "Failed to book appointment";
      set({ error: message, isLoading: false });
      throw new Error(message);
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
      throw new Error(message);
    }
  },
  clearAppointments: () => {
    set({ appointments: [], error: null, isLoading: false });
  },
}));
