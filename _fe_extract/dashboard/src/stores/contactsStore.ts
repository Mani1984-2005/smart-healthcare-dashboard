import { create } from "zustand";
import {
  fetchContacts,
  createContact as createContactApi,
  updateContact as updateContactApi,
  deleteContact as deleteContactApi,
  markContactContacted,
} from "../services/contactService.js";

export type ContactCategory = "Emergency" | "Hospital" | "Patient";
export type EmergencyPriority = "Critical" | "High" | "Normal";

export type ContactRecord = {
  id: string;
  name: string;
  category: ContactCategory;
  subType: string;
  phone: string;
  email: string;
  address: string;
  department: string;
  availability: string;
  emergencyPriority: EmergencyPriority;
  location: string;
  notes: string;
  lastContacted: string | null;
};

type ContactFilters = {
  category: "All" | ContactCategory;
  priority: "All" | EmergencyPriority;
};

type ContactsStore = {
  contacts: ContactRecord[];
  searchTerm: string;
  filters: ContactFilters;
  loading: boolean;
  error: string | null;
  loadContacts: () => Promise<void>;
  addContact: (payload: Omit<ContactRecord, "id" | "lastContacted">) => Promise<void>;
  updateContact: (id: string, payload: Partial<Omit<ContactRecord, "id">>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  markContacted: (id: string) => Promise<void>;
  search: (term: string) => void;
  filter: (filters: Partial<ContactFilters>) => void;
};

function createContactId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `C-${Math.floor(Math.random() * 9000 + 1000)}`;
}

const today = new Date();
const daysAgo = (n: number) => new Date(today.getTime() - n * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const mockContacts: ContactRecord[] = [
  {
    id: "C-1001", name: "Apollo Ambulance Dispatch", category: "Emergency", subType: "Ambulance",
    phone: "+91 1066", email: "dispatch@apolloambulance.example", address: "24x7 Central Dispatch",
    department: "", availability: "24/7", emergencyPriority: "Critical", location: "City-wide",
    notes: "Primary ambulance service for critical transfers.", lastContacted: daysAgo(1),
  },
  {
    id: "C-1002", name: "Red Cross Blood Bank", category: "Emergency", subType: "Blood Bank",
    phone: "+91 80 4567 1200", email: "bloodbank@redcross.example", address: "Sector 12, City Hospital Road",
    department: "", availability: "24/7", emergencyPriority: "Critical", location: "3.2 km away",
    notes: "O-negative and AB-negative stock frequently low — confirm before dispatch.", lastContacted: daysAgo(9),
  },
  {
    id: "C-1003", name: "City Police Control Room", category: "Emergency", subType: "Police",
    phone: "100", email: "", address: "Central Police Station",
    department: "", availability: "24/7", emergencyPriority: "High", location: "City-wide", notes: "", lastContacted: null,
  },
  {
    id: "C-1004", name: "Fire & Rescue Services", category: "Emergency", subType: "Fire Department",
    phone: "101", email: "", address: "Fire Station 4",
    department: "", availability: "24/7", emergencyPriority: "High", location: "City-wide", notes: "", lastContacted: null,
  },
  {
    id: "C-1005", name: "St. Mary's Multispecialty Hospital", category: "Emergency", subType: "Nearby Hospital",
    phone: "+91 80 2233 4455", email: "referrals@stmarys.example", address: "MG Road",
    department: "", availability: "24/7", emergencyPriority: "Normal", location: "6.1 km away",
    notes: "Referral partner for cardiac and trauma overflow.", lastContacted: daysAgo(20),
  },
  {
    id: "C-1006", name: "Dr. Kavita Sharma", category: "Hospital", subType: "Doctor",
    phone: "+91 98450 11122", email: "kavita.sharma@medicarepro.example", address: "",
    department: "Cardiology", availability: "Mon–Sat, 9 AM–5 PM", emergencyPriority: "Normal", location: "Block A, 3rd Floor",
    notes: "", lastContacted: daysAgo(2),
  },
  {
    id: "C-1007", name: "Dr. Arvind Nair", category: "Hospital", subType: "Doctor",
    phone: "+91 98450 22334", email: "arvind.nair@medicarepro.example", address: "",
    department: "Endocrinology", availability: "Tue–Sun, 10 AM–6 PM", emergencyPriority: "Normal", location: "Block B, 2nd Floor",
    notes: "", lastContacted: daysAgo(15),
  },
  {
    id: "C-1008", name: "Nurse Station — ICU", category: "Hospital", subType: "Nurse",
    phone: "+91 98450 99887", email: "icu.nursing@medicarepro.example", address: "",
    department: "ICU", availability: "24/7 (shift rotation)", emergencyPriority: "High", location: "Block C, ICU Wing",
    notes: "", lastContacted: daysAgo(0),
  },
  {
    id: "C-1009", name: "Hospital Administration Office", category: "Hospital", subType: "Administration",
    phone: "+91 80 4000 1000", email: "admin@medicarepro.example", address: "",
    department: "Administration", availability: "Mon–Fri, 9 AM–5 PM", emergencyPriority: "Normal", location: "Block A, Ground Floor",
    notes: "", lastContacted: daysAgo(30),
  },
  {
    id: "C-1010", name: "Rohan Singh (son)", category: "Patient", subType: "Family Contact",
    phone: "+91 98877 66500", email: "rohan.singh@example.com", address: "Whitefield, Bengaluru",
    department: "", availability: "Evenings", emergencyPriority: "High", location: "",
    notes: "Next of kin for Amrita Singh (P-1001). Primary decision-maker.", lastContacted: daysAgo(6),
  },
  {
    id: "C-1011", name: "Star Health Insurance — Claims Desk", category: "Patient", subType: "Insurance Contact",
    phone: "+91 1800 425 2255", email: "claims@starhealth.example", address: "",
    department: "", availability: "Mon–Sat, 9 AM–7 PM", emergencyPriority: "Normal", location: "",
    notes: "Handles pre-authorization for cardiology admissions.", lastContacted: daysAgo(3),
  },
];

export function generateCommunicationInsights(contacts: ContactRecord[]) {
  const insights: { id: string; tone: "info" | "warning" | "critical"; title: string; message: string }[] = [];

  const criticalUncontacted = contacts.filter((c) => c.emergencyPriority === "Critical" && (!c.lastContacted || c.lastContacted < daysAgo(7)));
  if (criticalUncontacted.length > 0) {
    insights.push({
      id: "critical-stale",
      tone: "warning",
      title: "Critical contacts not recently verified",
      message: `${criticalUncontacted.length} critical-priority contact${criticalUncontacted.length > 1 ? "s haven't" : " hasn't"} been contacted in over a week — worth confirming they're still reachable.`,
    });
  }

  const emergencyContacts = contacts.filter((c) => c.category === "Emergency").sort((a, b) => {
    const order = { Critical: 0, High: 1, Normal: 2 };
    return order[a.emergencyPriority] - order[b.emergencyPriority];
  });
  if (emergencyContacts.length > 0) {
    insights.push({
      id: "top-emergency",
      tone: "info",
      title: "Fastest emergency contacts",
      message: `For urgent escalation, start with ${emergencyContacts.slice(0, 2).map((c) => c.name).join(" and ")}.`,
    });
  }

  const missingPhone = contacts.filter((c) => !c.phone);
  if (missingPhone.length > 0) {
    insights.push({
      id: "missing-phone",
      tone: "critical",
      title: "Contacts missing a phone number",
      message: `${missingPhone.length} contact${missingPhone.length > 1 ? "s have" : " has"} no phone number on file.`,
    });
  }

  if (insights.length === 0) {
    insights.push({ id: "clear", tone: "info", title: "Directory looks healthy", message: "All contacts have current details and no critical follow-ups are overdue." });
  }

  return insights;
}

export const useContactsStore = create<ContactsStore>((set) => ({
  contacts: mockContacts,
  searchTerm: "",
  filters: { category: "All", priority: "All" },
  loading: false,
  error: null,
  async loadContacts() {
    set({ loading: true, error: null });
    try {
      const data = await fetchContacts();
      if (Array.isArray(data) && data.length > 0) {
        set({ contacts: data, loading: false });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unable to load contacts", loading: false });
    }
  },
  async addContact(payload) {
    set({ loading: true, error: null });
    const optimistic = { ...payload, id: createContactId(), lastContacted: null };
    try {
      const saved = await createContactApi(payload);
      set((state) => ({ contacts: [saved, ...state.contacts], loading: false }));
    } catch (error) {
      set((state) => ({
        contacts: [optimistic, ...state.contacts],
        loading: false,
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async updateContact(id, payload) {
    set({ loading: true, error: null });
    try {
      const saved = await updateContactApi(id, payload);
      set((state) => ({ contacts: state.contacts.map((c) => (c.id === id ? saved : c)), loading: false }));
    } catch (error) {
      set((state) => ({
        contacts: state.contacts.map((c) => (c.id === id ? { ...c, ...payload } : c)),
        loading: false,
        error: error instanceof Error ? `Saved locally only — ${error.message}` : "Saved locally only — could not reach the server",
      }));
    }
  },
  async deleteContact(id) {
    set({ loading: true, error: null });
    try {
      await deleteContactApi(id);
      set((state) => ({ contacts: state.contacts.filter((c) => c.id !== id), loading: false }));
    } catch (error) {
      set((state) => ({
        contacts: state.contacts.filter((c) => c.id !== id),
        loading: false,
        error: error instanceof Error ? `Removed locally only — ${error.message}` : "Removed locally only — could not reach the server",
      }));
    }
  },
  async markContacted(id) {
    const todayStr = new Date().toISOString().split("T")[0];
    try {
      const saved = await markContactContacted(id);
      set((state) => ({ contacts: state.contacts.map((c) => (c.id === id ? saved : c)) }));
    } catch {
      set((state) => ({ contacts: state.contacts.map((c) => (c.id === id ? { ...c, lastContacted: todayStr } : c)) }));
    }
  },
  search(term) {
    set({ searchTerm: term });
  },
  filter(filters) {
    set((state) => ({ filters: { ...state.filters, ...filters } }));
  },
}));
