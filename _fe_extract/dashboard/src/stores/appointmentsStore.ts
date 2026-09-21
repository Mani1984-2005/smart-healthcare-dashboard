import { create } from "zustand";
import { fetchAppointments, createAppointment as createAppointmentApi, updateAppointment as updateAppointmentApi, deleteAppointment as deleteAppointmentApi } from "../services/appointmentService.js";

export type AppointmentStatus = "Scheduled" | "Checked In" | "Completed" | "Cancelled" | "No-show";
export type AppointmentType = "Consultation" | "Follow-up" | "Lab review" | "Procedure" | "Emergency";

export type AppointmentRecord = {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  type: AppointmentType;
  status: AppointmentStatus;
  notes: string;
};

type AppointmentFilters = {
  status: string;
  date: string;
};

type AppointmentsStore = {
  appointments: AppointmentRecord[];
  searchTerm: string;
  filters: AppointmentFilters;
  loading: boolean;
  error: string | null;
  loadAppointments: () => Promise<void>;
  addAppointment: (payload: Omit<AppointmentRecord, "id">) => Promise<void>;
  updateAppointment: (id: string, payload: Partial<Omit<AppointmentRecord, "id">>) => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  search: (term: string) => void;
  filter: (filters: Partial<AppointmentFilters>) => void;
};

function createAppointmentId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `A-${Math.floor(Math.random() * 9000 + 1000)}`;
}

const today = new Date();
const dateStr = (n: number) => new Date(today.getTime() + n * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const mockAppointments: AppointmentRecord[] = [
  {
    id: "A-1001", patientId: "P-1001", patientName: "Amrita Singh", doctorId: "D-1001", doctorName: "Dr. Kavita Sharma",
    department: "Cardiology", date: dateStr(0), time: "09:00", type: "Follow-up", status: "Checked In", notes: "Post-angiography review.",
  },
  {
    id: "A-1002", patientId: "P-1002", patientName: "Rahul Mehra", doctorId: "D-1002", doctorName: "Dr. Arvind Nair",
    department: "Endocrinology", date: dateStr(0), time: "10:30", type: "Consultation", status: "Scheduled", notes: "",
  },
  {
    id: "A-1003", patientId: "P-1003", patientName: "Priya Desai", doctorId: "D-1006", doctorName: "Dr. Imran Khan",
    department: "Pulmonology", date: dateStr(0), time: "11:15", type: "Lab review", status: "Scheduled", notes: "Discuss spirometry results.",
  },
  {
    id: "A-1004", patientId: "P-1004", patientName: "Sanjay Kapoor", doctorId: "D-1003", doctorName: "Dr. Meera Iyer",
    department: "Emergency", date: dateStr(-1), time: "22:40", type: "Emergency", status: "Completed", notes: "Admitted to ICU.",
  },
  {
    id: "A-1005", patientId: "P-1001", patientName: "Amrita Singh", doctorId: "D-1001", doctorName: "Dr. Kavita Sharma",
    department: "Cardiology", date: dateStr(3), time: "09:30", type: "Consultation", status: "Scheduled", notes: "",
  },
  {
    id: "A-1006", patientId: "P-1002", patientName: "Rahul Mehra", doctorId: "D-1002", doctorName: "Dr. Arvind Nair",
    department: "Endocrinology", date: dateStr(-3), time: "10:00", type: "Follow-up", status: "No-show", notes: "",
  },
];

export const useAppointmentsStore = create<AppointmentsStore>((set) => ({
  appointments: mockAppointments,
  searchTerm: "",
  filters: { status: "All", date: "All" },
  loading: false,
  error: null,
  async loadAppointments() {
    set({ loading: true, error: null });
    try {
      const data = await fetchAppointments();
      if (Array.isArray(data) && data.length > 0) {
        set({ appointments: data, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unable to load appointments", loading: false });
    }
  },
  async addAppointment(payload) {
    set({ loading: true, error: null });
    const optimistic = { ...payload, id: createAppointmentId() };
    try {
      const saved = await createAppointmentApi(payload);
      set((state) => ({ appointments: [saved, ...state.appointments], loading: false }));
    } catch (error) {
      set((state) => ({
        appointments: [optimistic, ...state.appointments],
        loading: false,
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async updateAppointment(id, payload) {
    set({ loading: true, error: null });
    try {
      const saved = await updateAppointmentApi(id, payload);
      set((state) => ({ appointments: state.appointments.map((a) => (a.id === id ? saved : a)), loading: false }));
    } catch (error) {
      set((state) => ({
        appointments: state.appointments.map((a) => (a.id === id ? { ...a, ...payload } : a)),
        loading: false,
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async cancelAppointment(id) {
    set({ loading: true, error: null });
    try {
      const saved = await updateAppointmentApi(id, { status: "Cancelled" });
      set((state) => ({ appointments: state.appointments.map((a) => (a.id === id ? saved : a)), loading: false }));
    } catch (error) {
      set((state) => ({
        appointments: state.appointments.map((a) => (a.id === id ? { ...a, status: "Cancelled" } : a)),
        loading: false,
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async deleteAppointment(id) {
    set({ loading: true, error: null });
    try {
      await deleteAppointmentApi(id);
      set((state) => ({ appointments: state.appointments.filter((a) => a.id !== id), loading: false }));
    } catch (error) {
      set((state) => ({
        appointments: state.appointments.filter((a) => a.id !== id),
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
