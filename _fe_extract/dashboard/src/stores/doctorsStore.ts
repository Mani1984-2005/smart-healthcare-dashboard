import { create } from "zustand";
import { fetchDoctors, createDoctor as createDoctorApi, updateDoctor as updateDoctorApi, deleteDoctor as deleteDoctorApi } from "../services/doctorService.js";

export type DoctorStatus = "Available" | "With Patient" | "On Leave" | "Off Duty";

export type DoctorRecord = {
  id: string;
  name: string;
  specialty: string;
  department: string;
  phone: string;
  email: string;
  qualifications: string;
  experienceYears: number;
  consultationFee: number;
  availability: string;
  status: DoctorStatus;
};

type DoctorFilters = {
  department: string;
  status: string;
};

type DoctorsStore = {
  doctors: DoctorRecord[];
  searchTerm: string;
  filters: DoctorFilters;
  loading: boolean;
  error: string | null;
  loadDoctors: () => Promise<void>;
  addDoctor: (payload: Omit<DoctorRecord, "id">) => Promise<void>;
  updateDoctor: (id: string, payload: Partial<Omit<DoctorRecord, "id">>) => Promise<void>;
  deleteDoctor: (id: string) => Promise<void>;
  search: (term: string) => void;
  filter: (filters: Partial<DoctorFilters>) => void;
};

function createDoctorId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `D-${Math.floor(Math.random() * 9000 + 1000)}`;
}

const mockDoctors: DoctorRecord[] = [
  {
    id: "D-1001", name: "Dr. Kavita Sharma", specialty: "Interventional Cardiology", department: "Cardiology",
    phone: "+91 98450 11122", email: "kavita.sharma@medicarepro.example", qualifications: "MD, DM Cardiology",
    experienceYears: 14, consultationFee: 1200, availability: "Mon–Sat, 9 AM–5 PM", status: "Available",
  },
  {
    id: "D-1002", name: "Dr. Arvind Nair", specialty: "Diabetes & Metabolic Disorders", department: "Endocrinology",
    phone: "+91 98450 22334", email: "arvind.nair@medicarepro.example", qualifications: "MD Internal Medicine, DM Endocrinology",
    experienceYears: 10, consultationFee: 900, availability: "Tue–Sun, 10 AM–6 PM", status: "With Patient",
  },
  {
    id: "D-1003", name: "Dr. Meera Iyer", specialty: "Emergency & Trauma Medicine", department: "Emergency",
    phone: "+91 98450 33445", email: "meera.iyer@medicarepro.example", qualifications: "MD Emergency Medicine",
    experienceYears: 8, consultationFee: 1500, availability: "24/7 (shift rotation)", status: "Available",
  },
  {
    id: "D-1004", name: "Dr. Rohan Verma", specialty: "Joint Replacement & Sports Injury", department: "Orthopedics",
    phone: "+91 98450 44556", email: "rohan.verma@medicarepro.example", qualifications: "MS Orthopedics",
    experienceYears: 12, consultationFee: 1000, availability: "Mon, Wed, Fri, 9 AM–1 PM", status: "On Leave",
  },
  {
    id: "D-1005", name: "Dr. Sneha Reddy", specialty: "General Pediatrics", department: "Pediatrics",
    phone: "+91 98450 55667", email: "sneha.reddy@medicarepro.example", qualifications: "MD Pediatrics",
    experienceYears: 9, consultationFee: 800, availability: "Mon–Sat, 10 AM–4 PM", status: "Available",
  },
  {
    id: "D-1006", name: "Dr. Imran Khan", specialty: "Pulmonology & Sleep Medicine", department: "Pulmonology",
    phone: "+91 98450 66778", email: "imran.khan@medicarepro.example", qualifications: "MD Pulmonology",
    experienceYears: 11, consultationFee: 1000, availability: "Tue–Sat, 9 AM–3 PM", status: "Off Duty",
  },
];

export const useDoctorsStore = create<DoctorsStore>((set) => ({
  doctors: mockDoctors,
  searchTerm: "",
  filters: { department: "All", status: "All" },
  loading: false,
  error: null,
  async loadDoctors() {
    set({ loading: true, error: null });
    try {
      const data = await fetchDoctors();
      if (Array.isArray(data) && data.length > 0) {
        set({ doctors: data, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unable to load doctors", loading: false });
    }
  },
  async addDoctor(payload) {
    set({ loading: true, error: null });
    const optimistic = { ...payload, id: createDoctorId() };
    try {
      const saved = await createDoctorApi(payload);
      set((state) => ({ doctors: [saved, ...state.doctors], loading: false }));
    } catch (error) {
      set((state) => ({
        doctors: [optimistic, ...state.doctors],
        loading: false,
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async updateDoctor(id, payload) {
    set({ loading: true, error: null });
    try {
      const saved = await updateDoctorApi(id, payload);
      set((state) => ({ doctors: state.doctors.map((d) => (d.id === id ? saved : d)), loading: false }));
    } catch (error) {
      set((state) => ({
        doctors: state.doctors.map((d) => (d.id === id ? { ...d, ...payload } : d)),
        loading: false,
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async deleteDoctor(id) {
    set({ loading: true, error: null });
    try {
      await deleteDoctorApi(id);
      set((state) => ({ doctors: state.doctors.filter((d) => d.id !== id), loading: false }));
    } catch (error) {
      set((state) => ({
        doctors: state.doctors.filter((d) => d.id !== id),
        loading: false,
        error: error instanceof Error ? `Removed locally only — ${error.message}` : "Removed locally only — could not reach the server",
      }));
    }
  },
  search(term) {
    set({ searchTerm: term });
  },
  filter(filters) {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },
}));
