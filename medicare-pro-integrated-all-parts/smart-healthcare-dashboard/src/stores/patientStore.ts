import { create } from "zustand";
import { fetchPatients, fetchPatientById } from "../services/patientService.js";

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

const mockPatients: PatientRecord[] = [
  {
    id: "P-1001",
    fullName: "Amrita Singh",
    age: 34,
    gender: "Female",
    phone: "+91 98877 66554",
    email: "amrita.singh@example.com",
    bloodGroup: "A+",
    address: "78 Medical Plaza, Sector 9, Mumbai",
    medicalHistory: ["Hypertension", "Seasonal allergies"],
    registrationDate: "2025-08-12",
    status: "Active",
  },
  {
    id: "P-1002",
    fullName: "Rahul Mehra",
    age: 47,
    gender: "Male",
    phone: "+91 99876 55443",
    email: "rahul.mehra@example.com",
    bloodGroup: "B+",
    address: "12 Sunrise Avenue, Delhi",
    medicalHistory: ["Type 2 diabetes", "High cholesterol"],
    registrationDate: "2025-07-05",
    status: "Under Observation",
  },
  {
    id: "P-1003",
    fullName: "Priya Desai",
    age: 29,
    gender: "Female",
    phone: "+91 98765 43210",
    email: "priya.desai@example.com",
    bloodGroup: "O-",
    address: "56 Green Park, Bengaluru",
    medicalHistory: ["Asthma"],
    registrationDate: "2025-09-02",
    status: "Active",
  },
  {
    id: "P-1004",
    fullName: "Sanjay Kapoor",
    age: 62,
    gender: "Male",
    phone: "+91 91234 56789",
    email: "sanjay.kapoor@example.com",
    bloodGroup: "AB+",
    address: "101 Horizon Tower, Chennai",
    medicalHistory: ["Coronary artery disease", "Prior bypass surgery"],
    registrationDate: "2025-05-22",
    status: "Critical",
  },
];

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `P-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export const usePatientStore = create<PatientStore>((set, get) => ({
  patients: mockPatients,
  selectedPatient: null,
  searchTerm: "",
  filters: { status: "All", gender: "All" },
  page: 1,
  pageSize: 8,
  loading: false,
  error: null,
  async loadPatients() {
    set({ loading: true, error: null });
    try {
      const data = await fetchPatients();
      if (Array.isArray(data) && data.length > 0) {
        set({ patients: data, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unable to load patients", loading: false });
    }
  },
  async setSelectedPatient(id) {
    const state = get();
    const existing = state.patients.find((patient) => patient.id === id);
    if (existing) {
      set({ selectedPatient: existing });
      return;
    }

    set({ loading: true, error: null });
    try {
      const patient = await fetchPatientById(id);
      set({ selectedPatient: patient, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Patient not found", loading: false });
    }
  },
  clearSelectedPatient() {
    set({ selectedPatient: null });
  },
  async addPatient(payload) {
    set({ loading: true, error: null });
    try {
      const patient = {
        id: createId(),
        registrationDate: new Date().toISOString().split("T")[0],
        ...payload,
      };
      set((state) => ({ patients: [patient, ...state.patients], loading: false }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to add patient", loading: false });
    }
  },
  async updatePatient(id, payload) {
    set({ loading: true, error: null });
    try {
      set((state) => ({
        patients: state.patients.map((patient) =>
          patient.id === id ? { ...patient, ...payload } : patient
        ),
        selectedPatient:
          state.selectedPatient?.id === id ? { ...state.selectedPatient, ...payload } : state.selectedPatient,
        loading: false,
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to update patient", loading: false });
    }
  },
  async deletePatient(id) {
    set({ loading: true, error: null });
    try {
      set((state) => ({ patients: state.patients.filter((patient) => patient.id !== id), loading: false }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to delete patient", loading: false });
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
