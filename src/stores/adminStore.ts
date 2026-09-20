import { create } from "zustand";
import { ROLES } from "../app/roles.js";
import {
  fetchHospitalProfile,
  updateHospitalProfile as updateHospitalProfileApi,
  fetchDepartments,
  createDepartment as createDepartmentApi,
  updateDepartment as updateDepartmentApi,
  deleteDepartment as deleteDepartmentApi,
  fetchServiceCharges,
  createServiceCharge as createServiceChargeApi,
  updateServiceCharge as updateServiceChargeApi,
  deleteServiceCharge as deleteServiceChargeApi,
  fetchStaff,
  createStaff as createStaffApi,
  updateStaff as updateStaffApi,
  deleteStaff as deleteStaffApi,
} from "../services/adminService.js";

export type HospitalProfile = {
  name: string;
  registrationNo: string;
  address: string;
  emergencyPhone: string;
  tagline: string;
};

export type DepartmentRecord = {
  id: string;
  name: string;
  headDoctor: string;
  description: string;
};

export type ServiceCharge = {
  id: string;
  category: string;
  description: string;
  defaultRate: number;
};

export type StaffStatus = "Active" | "Inactive";

export type StaffRecord = {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  status: StaffStatus;
};

type AdminStore = {
  hospitalProfile: HospitalProfile;
  departments: DepartmentRecord[];
  serviceCharges: ServiceCharge[];
  staff: StaffRecord[];
  loading: boolean;
  error: string | null;
  loadAdminData: () => Promise<void>;
  updateHospitalProfile: (payload: Partial<HospitalProfile>) => Promise<void>;
  addDepartment: (payload: Omit<DepartmentRecord, "id">) => Promise<void>;
  updateDepartment: (id: string, payload: Partial<Omit<DepartmentRecord, "id">>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
  addServiceCharge: (payload: Omit<ServiceCharge, "id">) => Promise<void>;
  updateServiceCharge: (id: string, payload: Partial<Omit<ServiceCharge, "id">>) => Promise<void>;
  deleteServiceCharge: (id: string) => Promise<void>;
  addStaff: (payload: Omit<StaffRecord, "id">) => Promise<void>;
  updateStaff: (id: string, payload: Partial<Omit<StaffRecord, "id">>) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
};

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${prefix}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

const mockDepartments: DepartmentRecord[] = [
  { id: "DEPT-1", name: "Cardiology", headDoctor: "Dr. Kavita Sharma", description: "Interventional and diagnostic cardiac care." },
  { id: "DEPT-2", name: "Endocrinology", headDoctor: "Dr. Arvind Nair", description: "Diabetes and metabolic disorder management." },
  { id: "DEPT-3", name: "Emergency", headDoctor: "Dr. Meera Iyer", description: "24/7 trauma and emergency response." },
  { id: "DEPT-4", name: "Orthopedics", headDoctor: "Dr. Rohan Verma", description: "Joint replacement and sports injury care." },
  { id: "DEPT-5", name: "Pediatrics", headDoctor: "Dr. Sneha Reddy", description: "General pediatric and newborn care." },
  { id: "DEPT-6", name: "Pulmonology", headDoctor: "Dr. Imran Khan", description: "Respiratory and sleep medicine." },
];

const mockServiceCharges: ServiceCharge[] = [
  { id: "SVC-1", category: "Consultation", description: "Standard outpatient consultation", defaultRate: 1000 },
  { id: "SVC-2", category: "Laboratory", description: "Standard lab test panel", defaultRate: 800 },
  { id: "SVC-3", category: "Pharmacy", description: "Dispensing fee", defaultRate: 50 },
  { id: "SVC-4", category: "Procedure", description: "Minor procedure base rate", defaultRate: 3500 },
  { id: "SVC-5", category: "Room", description: "General ward, per night", defaultRate: 2500 },
  { id: "SVC-6", category: "ICU", description: "ICU bed, per night", defaultRate: 8000 },
  { id: "SVC-7", category: "Emergency", description: "Emergency admission fee", defaultRate: 5000 },
  { id: "SVC-8", category: "Surgery", description: "Surgery base rate (varies by procedure)", defaultRate: 25000 },
];

const mockStaff: StaffRecord[] = [
  { id: "STF-1", name: "Dr. Kavita Sharma", role: ROLES.DOCTOR, department: "Cardiology", email: "kavita.sharma@medicarepro.example", status: "Active" },
  { id: "STF-2", name: "Dr. Arvind Nair", role: ROLES.DOCTOR, department: "Endocrinology", email: "arvind.nair@medicarepro.example", status: "Active" },
  { id: "STF-3", name: "Anjali Rao", role: ROLES.NURSE, department: "ICU", email: "anjali.rao@medicarepro.example", status: "Active" },
  { id: "STF-4", name: "Vikram Joshi", role: ROLES.RECEPTIONIST, department: "Front Desk", email: "vikram.joshi@medicarepro.example", status: "Active" },
  { id: "STF-5", name: "Neha Kulkarni", role: ROLES.LAB_TECHNICIAN, department: "Laboratory", email: "neha.kulkarni@medicarepro.example", status: "Active" },
  { id: "STF-6", name: "Suresh Pillai", role: ROLES.PHARMACIST, department: "Pharmacy", email: "suresh.pillai@medicarepro.example", status: "Active" },
  { id: "STF-7", name: "Divya Menon", role: ROLES.BILLING, department: "Billing", email: "divya.menon@medicarepro.example", status: "Inactive" },
];

const mockHospitalProfile: HospitalProfile = {
  name: "MediCare Pro Hospital",
  registrationNo: "MCP-HOSP-0042",
  address: "1 Wellness Avenue, Bengaluru, Karnataka",
  emergencyPhone: "+91 1800 200 1000",
  tagline: "Enterprise care, coordinated.",
};

export const useAdminStore = create<AdminStore>((set) => ({
  hospitalProfile: mockHospitalProfile,
  departments: mockDepartments,
  serviceCharges: mockServiceCharges,
  staff: mockStaff,
  loading: false,
  error: null,

  async loadAdminData() {
    set({ loading: true, error: null });
    try {
      const [profile, departments, serviceCharges, staff] = await Promise.all([
        fetchHospitalProfile(),
        fetchDepartments(),
        fetchServiceCharges(),
        fetchStaff(),
      ]);
      set({
        hospitalProfile: profile ?? mockHospitalProfile,
        departments: Array.isArray(departments) && departments.length > 0 ? departments : mockDepartments,
        serviceCharges: Array.isArray(serviceCharges) && serviceCharges.length > 0 ? serviceCharges : mockServiceCharges,
        staff: Array.isArray(staff) && staff.length > 0 ? staff : mockStaff,
        loading: false,
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unable to load admin data", loading: false });
    }
  },

  async updateHospitalProfile(payload) {
    set((state) => ({ hospitalProfile: { ...state.hospitalProfile, ...payload }, error: null }));
    try {
      const saved = await updateHospitalProfileApi(payload);
      set({ hospitalProfile: saved });
    } catch (error) {
      set({ error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server" });
    }
  },

  async addDepartment(payload) {
    const optimistic = { ...payload, id: createId("DEPT") };
    try {
      const saved = await createDepartmentApi(payload);
      set((state) => ({ departments: [saved, ...state.departments], error: null }));
    } catch (error) {
      set((state) => ({
        departments: [optimistic, ...state.departments],
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async updateDepartment(id, payload) {
    try {
      const saved = await updateDepartmentApi(id, payload);
      set((state) => ({ departments: state.departments.map((d) => (d.id === id ? saved : d)), error: null }));
    } catch (error) {
      set((state) => ({
        departments: state.departments.map((d) => (d.id === id ? { ...d, ...payload } : d)),
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async deleteDepartment(id) {
    try {
      await deleteDepartmentApi(id);
      set((state) => ({ departments: state.departments.filter((d) => d.id !== id), error: null }));
    } catch (error) {
      set((state) => ({
        departments: state.departments.filter((d) => d.id !== id),
        error: error instanceof Error ? `Removed locally only — ${error.message}` : "Removed locally only — could not reach the server",
      }));
    }
  },

  async addServiceCharge(payload) {
    const optimistic = { ...payload, id: createId("SVC") };
    try {
      const saved = await createServiceChargeApi(payload);
      set((state) => ({ serviceCharges: [saved, ...state.serviceCharges], error: null }));
    } catch (error) {
      set((state) => ({
        serviceCharges: [optimistic, ...state.serviceCharges],
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async updateServiceCharge(id, payload) {
    try {
      const saved = await updateServiceChargeApi(id, payload);
      set((state) => ({ serviceCharges: state.serviceCharges.map((s) => (s.id === id ? saved : s)), error: null }));
    } catch (error) {
      set((state) => ({
        serviceCharges: state.serviceCharges.map((s) => (s.id === id ? { ...s, ...payload } : s)),
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async deleteServiceCharge(id) {
    try {
      await deleteServiceChargeApi(id);
      set((state) => ({ serviceCharges: state.serviceCharges.filter((s) => s.id !== id), error: null }));
    } catch (error) {
      set((state) => ({
        serviceCharges: state.serviceCharges.filter((s) => s.id !== id),
        error: error instanceof Error ? `Removed locally only — ${error.message}` : "Removed locally only — could not reach the server",
      }));
    }
  },

  async addStaff(payload) {
    const optimistic = { ...payload, id: createId("STF") };
    try {
      const saved = await createStaffApi(payload);
      set((state) => ({ staff: [saved, ...state.staff], error: null }));
    } catch (error) {
      set((state) => ({
        staff: [optimistic, ...state.staff],
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async updateStaff(id, payload) {
    try {
      const saved = await updateStaffApi(id, payload);
      set((state) => ({ staff: state.staff.map((s) => (s.id === id ? saved : s)), error: null }));
    } catch (error) {
      set((state) => ({
        staff: state.staff.map((s) => (s.id === id ? { ...s, ...payload } : s)),
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async deleteStaff(id) {
    try {
      await deleteStaffApi(id);
      set((state) => ({ staff: state.staff.filter((s) => s.id !== id), error: null }));
    } catch (error) {
      set((state) => ({
        staff: state.staff.filter((s) => s.id !== id),
        error: error instanceof Error ? `Removed locally only — ${error.message}` : "Removed locally only — could not reach the server",
      }));
    }
  },
}));
