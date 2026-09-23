import { create } from "zustand";
import { useAppointmentStore } from "../stores/appointmentStore.ts";
import { usePatientStore } from "../stores/patientStore.ts";

const storageKey = "medicare_pro_user";
const patientSessionKeys = [
  "medicare_selected_patient",
  "medicare_selected_appointment",
  "medicare_selected_encounter",
  "medicare_active_patient_context",
];

function normalizeUser(user) {
  if (!user || typeof user !== "object") return null;

  const normalized = { ...user };
  const patientId = normalized.patientId !== undefined && normalized.patientId !== null
    ? Number(normalized.patientId)
    : null;

  if (normalized.role === "PATIENT") {
    const canonicalId = patientId && Number.isFinite(patientId) ? String(patientId) : normalized.id ? String(normalized.id) : null;
    normalized.id = canonicalId ?? normalized.id ?? null;
    if (canonicalId) {
      normalized.patientId = Number(canonicalId);
    }
  }

  return normalized;
}

function loadUser() {
  if (typeof window === "undefined") return null;
  try {
    return normalizeUser(JSON.parse(window.localStorage.getItem(storageKey) || "null"));
  } catch {
    return null;
  }
}

function persistUser(user) {
  if (typeof window === "undefined") return;
  const normalized = normalizeUser(user);
  if (!normalized) {
    window.localStorage.removeItem(storageKey);
    return;
  }
  window.localStorage.setItem(storageKey, JSON.stringify(normalized));
}

function clearPatientSessionState() {
  if (typeof window === "undefined") return;
  patientSessionKeys.forEach((key) => window.localStorage.removeItem(key));
}

export const useAuthStore = create((set) => ({
  user: loadUser(),
  isAuthenticated: Boolean(loadUser()),
  login(user) {
    const normalized = normalizeUser(user);
    persistUser(normalized);
    if (typeof window !== "undefined" && normalized?.token) {
      window.localStorage.setItem("medicare_auth_token", normalized.token);
    }
    set({ user: normalized, isAuthenticated: true });
  },
  logout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
      window.localStorage.removeItem("medicare_auth_token");
      clearPatientSessionState();
    }
    usePatientStore.getState().clearSelectedPatient();
    useAppointmentStore.getState().clearAppointments();
    set({ user: null, isAuthenticated: false });
  },
}));
