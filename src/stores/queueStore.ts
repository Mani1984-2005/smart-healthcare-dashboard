import { create } from "zustand";
import axios from "axios";

interface QueueItem {
  id: string;
  patientId: string;
  appointmentId: string;
  doctorId: string;
  status: string;
  patient?: any;
  appointment?: any;
}

interface QueueState {
  queues: QueueItem[];
  isLoading: boolean;
  error: string | null;
  fetchQueue: () => Promise<void>;
  checkIn: (data: { patientId: string, appointmentId: string, doctorId: string }) => Promise<void>;
  updateStatus: (id: string, status: string) => Promise<void>;
}

const api = axios.create({ baseURL: "/api" });

export const useQueueStore = create<QueueState>((set) => ({
  queues: [],
  isLoading: false,
  error: null,
  fetchQueue: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get("/queue");
      set({ queues: response.data, isLoading: false });
    } catch (error: any) {
      const message = error?.message || "Failed to load queue";
      set({ error: message, isLoading: false });
      throw new Error(message, { cause: error });
    }
  },
  checkIn: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post("/queue/checkin", data);
      set((state) => ({ queues: [...state.queues, response.data], isLoading: false }));
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || "Failed to check in patient";
      set({ error: message, isLoading: false });
      throw new Error(message, { cause: error });
    }
  },
  updateStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      await api.put(`/queue/${id}/status`, { status });
      set((state) => ({
        queues: state.queues.map(q => q.id === id ? { ...q, status } : q),
        isLoading: false
      }));
    } catch (error: any) {
      const message = error?.message || "Failed to update queue status";
      set({ error: message, isLoading: false });
      throw new Error(message, { cause: error });
    }
  }
}));
