// src/utils/patientHelpers.js
// ─── Centralised patient helpers shared across PatientsPage and PatientProfileModal ───

// ─── DOB / Age ────────────────────────────────────────────────────────────────
/**
 * Calculate age in years from a date-of-birth string (YYYY-MM-DD).
 * Falls back to the raw `age` field on legacy records that pre-date DOB support.
 */
export const calculateAge = (dob, fallbackAge) => {
  if (dob) {
    const birth = new Date(dob);
    if (!isNaN(birth)) {
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      return age;
    }
  }
  // Legacy: stored plain age number / string
  const parsed = parseInt(fallbackAge, 10);
  return isNaN(parsed) ? null : parsed;
};

/** Returns a display string like "32 yrs (DOB: 15 Mar 1992)" */
export const ageDisplay = (dob, fallbackAge) => {
  const age = calculateAge(dob, fallbackAge);
  if (age === null) return "Not Recorded";
  if (dob) {
    const birth = new Date(dob);
    const formatted = birth.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    return `${age} yrs (DOB: ${formatted})`;
  }
  return `${age} yrs`;
};

// ─── BMI ──────────────────────────────────────────────────────────────────────
export const calculateBMI = (height, weight) => {
  const h = parseFloat(height);
  const w = parseFloat(weight);
  if (!h || !w || h <= 0) return null;
  return (w / ((h / 100) * (h / 100))).toFixed(1);
};

export const getBMICategory = (bmi) => {
  if (!bmi) return "";
  const b = parseFloat(bmi);
  if (b < 18.5) return "Underweight";
  if (b < 25)   return "Normal";
  if (b < 30)   return "Overweight";
  return "Obese";
};

// ─── Risk & Alerts ────────────────────────────────────────────────────────────
export const getRiskLevel = (patient) => {
  const chronic   = (patient.chronicDiseases || "").toLowerCase();
  const allergies = (patient.allergies      || "").toLowerCase();
  const age       = calculateAge(patient.dob, patient.age);
  if (chronic.includes("cancer") || chronic.includes("icu") || patient.status === "Critical" || patient.priority === "Critical") return "Critical";
  if (chronic.includes("diabetes") || chronic.includes("heart") || chronic.includes("hypertension") || allergies.includes("penicillin")) return "High";
  if (chronic || allergies) return "Medium";
  return "Low";
};

export const getClinicalAlerts = (patient) => {
  const alerts    = [];
  const chronic   = (patient.chronicDiseases || "").toLowerCase();
  const allergies = (patient.allergies       || "").toLowerCase();
  const age       = calculateAge(patient.dob, patient.age);
  if (chronic.includes("diabetes"))                                       alerts.push({ label: "Diabetic",     color: "bg-orange-500" });
  if (chronic.includes("hypertension") || chronic.includes("bp"))        alerts.push({ label: "Hypertension", color: "bg-red-500"    });
  if (allergies)                                                           alerts.push({ label: "Drug Allergy", color: "bg-pink-600"   });
  if ((patient.pregnancyStatus || "").toLowerCase() === "pregnant")       alerts.push({ label: "Pregnancy",    color: "bg-purple-500" });
  if (chronic.includes("fall") || (age !== null && age > 70))             alerts.push({ label: "Fall Risk",    color: "bg-yellow-600" });
  if (patient.status === "Critical" || patient.priority === "Critical")   alerts.push({ label: "Critical",     color: "bg-red-700"    });
  return alerts;
};

// ─── Status / Priority badges ─────────────────────────────────────────────────
export const statusColor = (status) => {
  switch (status) {
    case "Waiting":         return "bg-green-500";
    case "In Consultation": return "bg-blue-500";
    case "Lab Test":        return "bg-yellow-500";
    case "Billing":         return "bg-purple-500";
    case "Completed":       return "bg-gray-500";
    case "Critical":        return "bg-red-600";
    default:                return "bg-slate-400";
  }
};

export const riskColor = (level) => {
  switch (level) {
    case "Critical": return "bg-red-700 text-white";
    case "High":     return "bg-orange-500 text-white";
    case "Medium":   return "bg-yellow-500 text-white";
    default:         return "bg-green-600 text-white";
  }
};

/** Priority badge: Normal / Moderate / High / Critical */
export const PRIORITY_OPTIONS = [
  { value: "Normal",   label: "🟢 Normal",   ring: "ring-green-500",  bg: "bg-green-500",  text: "text-white" },
  { value: "Moderate", label: "🟡 Moderate", ring: "ring-yellow-400", bg: "bg-yellow-400", text: "text-slate-900" },
  { value: "High",     label: "🟠 High",     ring: "ring-orange-500", bg: "bg-orange-500", text: "text-white" },
  { value: "Critical", label: "🔴 Critical", ring: "ring-red-600",    bg: "bg-red-600",    text: "text-white" },
];

export const getPriorityConfig = (priority) =>
  PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[0];

// ─── Visit Counter ────────────────────────────────────────────────────────────
/** Returns the count of Consultation entries in a patient's timeline */
export const getVisitCount = (timeline) => {
  if (!Array.isArray(timeline)) return 0;
  return timeline.filter((t) => t.type === "Consultation").length;
};

export const visitCountLabel = (timeline) => {
  const n = getVisitCount(timeline);
  return n === 0 ? "No visits" : `Visit #${n}`;
};

// ─── Lab / Billing helpers ────────────────────────────────────────────────────
export const getPatientLabReports = (patientId, patientName) => {
  try {
    const all = JSON.parse(localStorage.getItem("lab_tests") || "[]");
    return all.filter((l) => l.patientId === patientId || l.patientName === patientName);
  } catch { return []; }
};

export const getLatestVisit = (timeline) => {
  if (!timeline || timeline.length === 0) return null;
  const consultations = timeline.filter((t) => t.type === "Consultation");
  return consultations.length === 0 ? null : consultations[consultations.length - 1];
};

export const getOutstandingBalance = (patientId) => {
  try {
    const bills = JSON.parse(localStorage.getItem("billing") || "[]");
    return bills.filter((b) => b.patientId === patientId).reduce((acc, b) => acc + (parseFloat(b.pending) || 0), 0);
  } catch { return 0; }
};

// ─── Duplicate Detection ──────────────────────────────────────────────────────
/**
 * Returns the first patient that matches on:
 *  1. Phone number (exact)
 *  2. Aadhaar number (exact, if provided)
 *  3. Name + DOB (case-insensitive name, exact DOB)
 *
 * `excludeId` is the ID to skip when editing an existing record.
 */
export const findDuplicate = (patients, form, excludeId = null) => {
  for (const p of patients) {
    if (p.id === excludeId) continue;

    // Phone match
    if (form.phone && p.phone && form.phone.trim() === p.phone.trim()) return p;

    // Aadhaar match (only if both sides have a value)
    if (
      form.govIdType === "Aadhaar" && form.govIdNumber && form.govIdNumber.length >= 4 &&
      p.govIdType === "Aadhaar" && p.govIdNumber &&
      form.govIdNumber.trim() === p.govIdNumber.trim()
    ) return p;

    // Name + DOB match
    if (
      form.name && form.dob &&
      p.name && p.dob &&
      form.name.trim().toLowerCase() === p.name.trim().toLowerCase() &&
      form.dob === p.dob
    ) return p;
  }
  return null;
};

// ─── QR payload ───────────────────────────────────────────────────────────────
/** Builds the text content encoded into a patient's QR code */
export const buildQRPayload = (patient) => {
  return [
    `MEDICARE_PRO`,
    `ID:${patient.id}`,
    `NAME:${patient.name}`,
    `DOB:${patient.dob || ""}`,
    `BLOOD:${patient.bloodGroup || ""}`,
    `PHONE:${patient.phone || ""}`,
  ].join("|");
};

// ─── Hospital sync ────────────────────────────────────────────────────────────
export const dispatchPatientsUpdate = () =>
  window.dispatchEvent(new Event("patientsUpdated"));