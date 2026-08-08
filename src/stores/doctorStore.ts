import { create } from "zustand";
import axios from "axios";

interface Doctor {
  id: string;
  name: string;
  department: string;
  specialization: string;
  phone?: string;
  email?: string;
  isAvailable: boolean;
}

interface DoctorState {
  doctors: Doctor[];
  isLoading: boolean;
  error: string | null;
  fetchDoctors: () => Promise<void>;
  addDoctor: (doctor: Omit<Doctor, "id" | "isAvailable">) => Promise<void>;
}

const api = axios.create({ baseURL: "/api" });

export const useDoctorStore = create<DoctorState>((set) => ({
  doctors: [],
  isLoading: false,
  error: null,
  fetchDoctors: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get("/doctors");
      set({ doctors: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },
  addDoctor: async (doctor) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post("/doctors", doctor);
      set((state) => ({ doctors: [...state.doctors, response.data], isLoading: false }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  }
}));
