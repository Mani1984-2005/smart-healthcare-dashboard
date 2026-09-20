import { create } from "zustand";
import { demoPatients } from "../demo/prototypeData.ts";
import { isBackendUnavailableError, withDemoFallback } from "../services/demoAware";
import { createPatient, deletePatient as deletePatientService, fetchPatientById, fetchPatients, updatePatient as updatePatientService } from "../services/patientService.js";

export type PatientStatus = "Active" | "Inactive" | "Discharged" | "Under Observation" | "Critical";

export type PatientRecord = {
  id: string;
  fullName: string;
  age: number;
  gender: "Female" | "Male" | "Other";
  phone: string;
  email: string;
  bloodGroup: string;
  address: string;
  medicalHistory: string[];
  registrationDate: string;
  status: PatientStatus;
};

type PatientFilters = {
  status: string;
  gender: string;
};

type PatientStore = {
  patients: PatientRecord[];
  selectedPatient: PatientRecord | null;
  searchTerm: string;
  filters: PatientFilters;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  demoMode: boolean;
  demoMessage: string | null;
  loadPatients: () => Promise<void>;
  setSelectedPatient: (id: string) => Promise<void>;
  clearSelectedPatient: () => void;
  addPatient: (payload: Omit<PatientRecord, "id" | "registrationDate">) => Promise<void>;
  updatePatient: (id: string, payload: Partial<Omit<PatientRecord, "id" | "registrationDate">>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  searchPatients: (query: string) => void;
  filterPatients: (filters: Partial<PatientFilters>) => void;
  setPage: (page: number) => void;
  clearError: () => void;
};

export const usePatientStore = create<PatientStore>((set, get) => ({
  patients: [],
  selectedPatient: null,
  searchTerm: "",
  filters: { status: "All", gender: "All" },
  page: 1,
  pageSize: 8,
  loading: false,
  error: null,
  demoMode: false,
  demoMessage: null,
  async loadPatients() {
    set({ loading: true, error: null, demoMode: false, demoMessage: null });
    try {
      const { data, usedDemo } = await withDemoFallback(fetchPatients, () => demoPatients);
      set({
        patients: data,
        loading: false,
        demoMode: usedDemo,
        demoMessage: usedDemo ? "Demo mode — backend unavailable" : null,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Unable to load patients",
        loading: false,
        demoMode: false,
        demoMessage: null,
      });
    }
  },
  async setSelectedPatient(id) {
    const state = get();
    const existing = state.patients.find((patient) => patient.id === id);
    if (existing) {
      set({ selectedPatient: existing, error: null, demoMode: state.demoMode, demoMessage: state.demoMessage });
      return;
    }

    set({ loading: true, error: null });
    try {
      const { data, usedDemo } = await withDemoFallback(
        () => fetchPatientById(id),
        () => demoPatients.find((patient) => patient.id === id) ?? null,
      );
      if (!data) {
        set({ selectedPatient: null, loading: false, error: "Patient not found", demoMode: usedDemo, demoMessage: usedDemo ? "Demo mode — backend unavailable" : null });
        return;
      }
      set({ selectedPatient: data, loading: false, demoMode: usedDemo, demoMessage: usedDemo ? "Demo mode — backend unavailable" : null, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Patient not found", loading: false, demoMode: false, demoMessage: null });
    }
  },
  clearSelectedPatient() {
    set({ selectedPatient: null });
  },
  async addPatient(payload) {
    set({ loading: true, error: null });
    try {
      const patient = await createPatient(payload);
      set((state) => ({ patients: [patient, ...state.patients], loading: false }));
    } catch (error) {
      const unavailable = isBackendUnavailableError(error);
      set({
        error: unavailable ? "This action requires the live backend." : error instanceof Error ? error.message : "Failed to add patient",
        loading: false,
      });
    }
  },
  async updatePatient(id, payload) {
    set({ loading: true, error: null });
    try {
      const updatedPatient = await updatePatientService(id, payload);
      set((state) => ({
        patients: state.patients.map((patient) => (patient.id === id ? updatedPatient : patient)),
        selectedPatient: state.selectedPatient?.id === id ? updatedPatient : state.selectedPatient,
        loading: false,
      }));
    } catch (error) {
      const unavailable = isBackendUnavailableError(error);
      set({
        error: unavailable ? "This action requires the live backend." : error instanceof Error ? error.message : "Failed to update patient",
        loading: false,
      });
    }
  },
  async deletePatient(id) {
    set({ loading: true, error: null });
    try {
      await deletePatientService(id);
      set((state) => ({
        patients: state.patients.filter((patient) => patient.id !== id),
        selectedPatient: state.selectedPatient?.id === id ? null : state.selectedPatient,
        loading: false,
      }));
    } catch (error) {
      const unavailable = isBackendUnavailableError(error);
      set({
        error: unavailable ? "This action requires the live backend." : error instanceof Error ? error.message : "Failed to delete patient",
        loading: false,
      });
    }
  },
  searchPatients(query) {
    set({ searchTerm: query, page: 1 });
  },
  filterPatients(filters) {
    set((state) => ({ filters: { ...state.filters, ...filters }, page: 1 }));
  },
  setPage(page) {
    set({ page });
  },
  clearError() {
    set({ error: null });
  },
}));
