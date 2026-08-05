import { create } from "zustand";
import { fetchPatients } from "../services/patientService.js";

export const usePatientStore = create((set) => ({
  patients: [],
  loading: false,
  error: null,
  async loadPatients() {
    set({ loading: true, error: null });
    try {
      const data = await fetchPatients();
      set({ patients: data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
}));
