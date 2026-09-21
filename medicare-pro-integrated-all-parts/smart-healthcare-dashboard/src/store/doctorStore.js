import { create } from "zustand";
import { fetchDoctors } from "../services/doctorService.js";

export const useDoctorStore = create((set) => ({
  doctors: [],
  loading: false,
  error: null,
  async loadDoctors() {
    set({ loading: true, error: null });
    try {
      const data = await fetchDoctors();
      set({ doctors: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
}));
