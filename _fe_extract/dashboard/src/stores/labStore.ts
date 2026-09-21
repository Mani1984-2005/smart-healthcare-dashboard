import { create } from "zustand";
import { fetchLaboratoryTests, createLaboratoryTest as createTestApi, updateLaboratoryTest as updateTestApi, deleteLaboratoryTest as deleteTestApi } from "../services/laboratoryService.js";

export type LabTestStatus = "Ordered" | "Sample Collected" | "In Progress" | "Completed" | "Cancelled";

export type LabTestRecord = {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  testName: string;
  category: string;
  orderDate: string;
  resultDate: string | null;
  status: LabTestStatus;
  result: string;
  referenceRange: string;
  notes: string;
};

type LabFilters = {
  status: string;
  category: string;
};

type LabStore = {
  tests: LabTestRecord[];
  searchTerm: string;
  filters: LabFilters;
  loading: boolean;
  error: string | null;
  loadTests: () => Promise<void>;
  addTest: (payload: Omit<LabTestRecord, "id">) => Promise<void>;
  updateTest: (id: string, payload: Partial<Omit<LabTestRecord, "id">>) => Promise<void>;
  deleteTest: (id: string) => Promise<void>;
  search: (term: string) => void;
  filter: (filters: Partial<LabFilters>) => void;
};

function createTestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `LAB-${Math.floor(Math.random() * 9000 + 1000)}`;
}

const today = new Date();
const daysAgo = (n: number) => new Date(today.getTime() - n * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const mockTests: LabTestRecord[] = [
  {
    id: "LAB-1001", patientId: "P-1001", patientName: "Amrita Singh", doctorName: "Dr. Kavita Sharma",
    testName: "ECG", category: "Cardiology", orderDate: daysAgo(6), resultDate: daysAgo(6),
    status: "Completed", result: "Normal sinus rhythm", referenceRange: "N/A", notes: "",
  },
  {
    id: "LAB-1002", patientId: "P-1001", patientName: "Amrita Singh", doctorName: "Dr. Kavita Sharma",
    testName: "Lipid profile", category: "Biochemistry", orderDate: daysAgo(6), resultDate: daysAgo(5),
    status: "Completed", result: "LDL 138 mg/dL, HDL 42 mg/dL", referenceRange: "LDL <100, HDL >40", notes: "Borderline LDL — dietary counseling advised.",
  },
  {
    id: "LAB-1003", patientId: "P-1002", patientName: "Rahul Mehra", doctorName: "Dr. Arvind Nair",
    testName: "HbA1c", category: "Biochemistry", orderDate: daysAgo(18), resultDate: daysAgo(17),
    status: "Completed", result: "7.8%", referenceRange: "4.0–5.6% (non-diabetic)", notes: "Elevated — medication adjustment discussed.",
  },
  {
    id: "LAB-1004", patientId: "P-1003", patientName: "Priya Desai", doctorName: "Dr. Imran Khan",
    testName: "Spirometry", category: "Pulmonology", orderDate: daysAgo(1), resultDate: null,
    status: "In Progress", result: "", referenceRange: "", notes: "",
  },
  {
    id: "LAB-1005", patientId: "P-1004", patientName: "Sanjay Kapoor", doctorName: "Dr. Meera Iyer",
    testName: "Complete blood count", category: "Hematology", orderDate: daysAgo(3), resultDate: null,
    status: "Sample Collected", result: "", referenceRange: "", notes: "Urgent — emergency admission.",
  },
];

export const useLabStore = create<LabStore>((set) => ({
  tests: mockTests,
  searchTerm: "",
  filters: { status: "All", category: "All" },
  loading: false,
  error: null,
  async loadTests() {
    set({ loading: true, error: null });
    try {
      const data = await fetchLaboratoryTests();
      if (Array.isArray(data) && data.length > 0) {
        set({ tests: data, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unable to load lab tests", loading: false });
    }
  },
  async addTest(payload) {
    set({ loading: true, error: null });
    const optimistic = { ...payload, id: createTestId() };
    try {
      const saved = await createTestApi(payload);
      set((state) => ({ tests: [saved, ...state.tests], loading: false }));
    } catch (error) {
      set((state) => ({
        tests: [optimistic, ...state.tests],
        loading: false,
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async updateTest(id, payload) {
    set({ loading: true, error: null });
    try {
      const saved = await updateTestApi(id, payload);
      set((state) => ({ tests: state.tests.map((t) => (t.id === id ? saved : t)), loading: false }));
    } catch (error) {
      set((state) => ({
        tests: state.tests.map((t) => (t.id === id ? { ...t, ...payload } : t)),
        loading: false,
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async deleteTest(id) {
    set({ loading: true, error: null });
    try {
      await deleteTestApi(id);
      set((state) => ({ tests: state.tests.filter((t) => t.id !== id), loading: false }));
    } catch (error) {
      set((state) => ({
        tests: state.tests.filter((t) => t.id !== id),
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
