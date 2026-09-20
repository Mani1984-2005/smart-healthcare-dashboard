import { create } from "zustand";
import {
  fetchMedicines,
  createMedicine as createMedicineApi,
  updateMedicine as updateMedicineApi,
  deleteMedicine as deleteMedicineApi,
  fetchPrescriptions,
  createPrescription as createPrescriptionApi,
  updatePrescription as updatePrescriptionApi,
  deletePrescription as deletePrescriptionApi,
} from "../services/pharmacyService.js";

export type MedicineRecord = {
  id: string;
  name: string;
  category: string;
  form: string;
  strength: string;
  manufacturer: string;
  stockQuantity: number;
  reorderLevel: number;
  unitPrice: number;
  expiryDate: string;
  requiresPrescription: boolean;
};

export type PrescriptionStatus = "Active" | "Completed" | "Cancelled";

export type PrescriptionRecord = {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  prescriptionDate: string;
  status: PrescriptionStatus;
  notes: string;
};

type PharmacyFilters = {
  category: string;
  stockLevel: string;
};

type PharmacyStore = {
  medicines: MedicineRecord[];
  prescriptions: PrescriptionRecord[];
  searchTerm: string;
  filters: PharmacyFilters;
  loading: boolean;
  error: string | null;
  loadMedicines: () => Promise<void>;
  loadPrescriptions: () => Promise<void>;
  addMedicine: (payload: Omit<MedicineRecord, "id">) => Promise<void>;
  updateMedicine: (id: string, payload: Partial<Omit<MedicineRecord, "id">>) => Promise<void>;
  deleteMedicine: (id: string) => Promise<void>;
  addPrescription: (payload: Omit<PrescriptionRecord, "id">) => Promise<void>;
  updatePrescription: (id: string, payload: Partial<Omit<PrescriptionRecord, "id">>) => Promise<void>;
  deletePrescription: (id: string) => Promise<void>;
  search: (term: string) => void;
  filter: (filters: Partial<PharmacyFilters>) => void;
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${prefix}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

const mockMedicines: MedicineRecord[] = [
  { id: "MED-1001", name: "Amoxicillin", category: "Antibiotic", form: "Capsule", strength: "500mg", manufacturer: "Cipla", stockQuantity: 18, reorderLevel: 50, unitPrice: 8, expiryDate: "2027-03-15", requiresPrescription: true },
  { id: "MED-1002", name: "Insulin Glargine", category: "Antidiabetic", form: "Injection pen", strength: "100 IU/mL", manufacturer: "Sanofi", stockQuantity: 22, reorderLevel: 30, unitPrice: 650, expiryDate: "2026-11-01", requiresPrescription: true },
  { id: "MED-1003", name: "Metformin", category: "Antidiabetic", form: "Tablet", strength: "500mg", manufacturer: "Sun Pharma", stockQuantity: 140, reorderLevel: 60, unitPrice: 2, expiryDate: "2027-06-20", requiresPrescription: true },
  { id: "MED-1004", name: "Paracetamol", category: "Analgesic", form: "Tablet", strength: "650mg", manufacturer: "GSK", stockQuantity: 310, reorderLevel: 100, unitPrice: 1.5, expiryDate: "2028-01-10", requiresPrescription: false },
  { id: "MED-1005", name: "Atorvastatin", category: "Statin", form: "Tablet", strength: "20mg", manufacturer: "Dr. Reddy's", stockQuantity: 45, reorderLevel: 40, unitPrice: 6, expiryDate: "2027-09-05", requiresPrescription: true },
  { id: "MED-1006", name: "Salbutamol Inhaler", category: "Bronchodilator", form: "Inhaler", strength: "100mcg", manufacturer: "Cipla", stockQuantity: 12, reorderLevel: 25, unitPrice: 180, expiryDate: "2026-12-01", requiresPrescription: true },
];

const mockPrescriptions: PrescriptionRecord[] = [
  { id: "RX-1001", patientId: "P-1001", patientName: "Amrita Singh", doctorName: "Dr. Kavita Sharma", medicineName: "Atorvastatin", dosage: "20mg", frequency: "Once daily, night", duration: "30 days", prescriptionDate: "2026-08-02", status: "Active", notes: "" },
  { id: "RX-1002", patientId: "P-1002", patientName: "Rahul Mehra", doctorName: "Dr. Arvind Nair", medicineName: "Metformin", dosage: "500mg", frequency: "Twice daily, after meals", duration: "60 days", prescriptionDate: "2026-07-21", status: "Active", notes: "" },
  { id: "RX-1003", patientId: "P-1002", patientName: "Rahul Mehra", doctorName: "Dr. Arvind Nair", medicineName: "Insulin Glargine", dosage: "10 units", frequency: "Once daily, night", duration: "30 days", prescriptionDate: "2026-07-21", status: "Active", notes: "Injection technique reviewed with patient." },
  { id: "RX-1004", patientId: "P-1003", patientName: "Priya Desai", doctorName: "Dr. Imran Khan", medicineName: "Salbutamol Inhaler", dosage: "2 puffs", frequency: "As needed", duration: "90 days", prescriptionDate: "2026-08-07", status: "Active", notes: "" },
];

export function generatePharmacyInsights(medicines: MedicineRecord[]) {
  const insights: { id: string; tone: "info" | "warning" | "critical"; title: string; message: string }[] = [];

  const belowReorder = medicines.filter((m) => m.stockQuantity <= m.reorderLevel);
  if (belowReorder.length > 0) {
    insights.push({
      id: "low-stock",
      tone: "critical",
      title: "Medicines below reorder level",
      message: `${belowReorder.map((m) => m.name).join(", ")} ${belowReorder.length > 1 ? "are" : "is"} at or below the reorder threshold — restock soon.`,
    });
  }

  const soonExpiring = medicines.filter((m) => {
    const daysLeft = (new Date(m.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 180;
  });
  if (soonExpiring.length > 0) {
    insights.push({
      id: "expiring",
      tone: "warning",
      title: "Stock nearing expiry",
      message: `${soonExpiring.map((m) => m.name).join(", ")} ${soonExpiring.length > 1 ? "expire" : "expires"} within 6 months.`,
    });
  }

  if (insights.length === 0) {
    insights.push({ id: "clear", tone: "info", title: "Inventory looks healthy", message: "No medicines are currently below their reorder level or nearing expiry." });
  }

  return insights;
}

export const usePharmacyStore = create<PharmacyStore>((set) => ({
  medicines: mockMedicines,
  prescriptions: mockPrescriptions,
  searchTerm: "",
  filters: { category: "All", stockLevel: "All" },
  loading: false,
  error: null,
  async loadMedicines() {
    set({ loading: true, error: null });
    try {
      const data = await fetchMedicines();
      if (Array.isArray(data) && data.length > 0) {
        set({ medicines: data, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unable to load medicines", loading: false });
    }
  },
  async loadPrescriptions() {
    set({ loading: true, error: null });
    try {
      const data = await fetchPrescriptions();
      if (Array.isArray(data) && data.length > 0) {
        set({ prescriptions: data, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unable to load prescriptions", loading: false });
    }
  },
  async addMedicine(payload) {
    set({ loading: true, error: null });
    const optimistic = { ...payload, id: createId("MED") };
    try {
      const saved = await createMedicineApi(payload);
      set((state) => ({ medicines: [saved, ...state.medicines], loading: false }));
    } catch (error) {
      set((state) => ({
        medicines: [optimistic, ...state.medicines],
        loading: false,
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async updateMedicine(id, payload) {
    set({ loading: true, error: null });
    try {
      const saved = await updateMedicineApi(id, payload);
      set((state) => ({ medicines: state.medicines.map((m) => (m.id === id ? saved : m)), loading: false }));
    } catch (error) {
      set((state) => ({
        medicines: state.medicines.map((m) => (m.id === id ? { ...m, ...payload } : m)),
        loading: false,
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async deleteMedicine(id) {
    set({ loading: true, error: null });
    try {
      await deleteMedicineApi(id);
      set((state) => ({ medicines: state.medicines.filter((m) => m.id !== id), loading: false }));
    } catch (error) {
      set((state) => ({
        medicines: state.medicines.filter((m) => m.id !== id),
        loading: false,
        error: error instanceof Error ? `Removed locally only — ${error.message}` : "Removed locally only — could not reach the server",
      }));
    }
  },
  async addPrescription(payload) {
    set({ loading: true, error: null });
    const optimistic = { ...payload, id: createId("RX") };
    try {
      const saved = await createPrescriptionApi(payload);
      set((state) => ({ prescriptions: [saved, ...state.prescriptions], loading: false }));
    } catch (error) {
      set((state) => ({
        prescriptions: [optimistic, ...state.prescriptions],
        loading: false,
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async updatePrescription(id, payload) {
    set({ loading: true, error: null });
    try {
      const saved = await updatePrescriptionApi(id, payload);
      set((state) => ({ prescriptions: state.prescriptions.map((p) => (p.id === id ? saved : p)), loading: false }));
    } catch (error) {
      set((state) => ({
        prescriptions: state.prescriptions.map((p) => (p.id === id ? { ...p, ...payload } : p)),
        loading: false,
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async deletePrescription(id) {
    set({ loading: true, error: null });
    try {
      await deletePrescriptionApi(id);
      set((state) => ({ prescriptions: state.prescriptions.filter((p) => p.id !== id), loading: false }));
    } catch (error) {
      set((state) => ({
        prescriptions: state.prescriptions.filter((p) => p.id !== id),
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
