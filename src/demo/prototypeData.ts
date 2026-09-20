/**
 * DEMO_MODE / PROTOTYPE data for MediCare Pro frontend pages.
 * ---------------------------------------------------------------------------
 * These datasets power Clinical, Notifications, Analytics, Documents,
 * Attendance, Audit, Payments fallback, and Patient360 enhancements when
 * live APIs are unavailable in this workspace.
 *
 * Toggle: set VITE_USE_LIVE_API=true to opt out of demo fallbacks.
 * DEMO_MODE is the default for prototype builds.
 * ---------------------------------------------------------------------------
 */

export type EncounterStatus = "DRAFT" | "IN_PROGRESS" | "SIGNED_OFF";

export type ClinicalEncounter = {
  id: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  appointmentId: string;
  status: EncounterStatus;
  diagnosis: string;
  treatmentPlan: string;
  prescriptions: string[];
  followUpDate: string | null;
  signedOffAt: string | null;
  locked: boolean;
  chiefComplaint?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type DemoNotification = {
  id: string;
  title: string;
  body: string;
  channel: "SMS" | "Email" | "In-app";
  read: boolean;
  createdAt: string;
  priority: "low" | "normal" | "high" | "critical";
};

export type AnalyticsSummary = {
  queueWait: {
    averageMinutes: number;
    medianMinutes: number;
    p95Minutes: number;
    byHour: { hour: string; waitMinutes: number; patients: number }[];
  };
  appointments: {
    completionRate: number;
    noShowRate: number;
    cancellationRate: number;
    daily: { date: string; scheduled: number; completed: number; cancelled: number; noShow: number }[];
  };
  dailyVolumes: { date: string; encounters: number; labOrders: number; prescriptions: number; invoices: number }[];
};

export type DemoDocument = {
  id: string;
  patientId: string;
  patientName: string;
  type: string;
  date: string;
  status: "Ready" | "Generating" | "Archived" | "Failed";
};

export type AttendanceRecord = {
  id: string;
  staffName: string;
  role: string;
  checkIn: string | null;
  checkOut: string | null;
  status: "Present" | "Late" | "Absent" | "On Leave" | "Checked Out";
  date: string;
};

export type AuditEvent = {
  id: string;
  actor: string;
  action: string;
  entity: string;
  timestamp: string;
  detail: string;
};

export type OperationalMetrics = {
  bedOccupancyPercent: number;
  activeEncounters: number;
  pendingLabResults: number;
  openInvoices: number;
  avgConsultMinutes: number;
  staffOnDuty: number;
};

/** DEMO_MODE gate — always true unless live API is explicitly enabled. */
export function isDemoMode(): boolean {
  try {
    return import.meta.env.VITE_USE_LIVE_API !== "true";
  } catch {
    return true;
  }
}

export type DemoPatient = {
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
  status: "Active" | "Inactive" | "Discharged" | "Under Observation" | "Critical";
};

export const demoPatients: DemoPatient[] = [
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

// ---------------------------------------------------------------------------
// Clinical encounters (DEMO)
// ---------------------------------------------------------------------------

export const clinicalEncounters: ClinicalEncounter[] = [
  {
    id: "ENC-2001",
    patientId: "P-1001",
    patientName: "Amrita Singh",
    doctorName: "Dr. Kavita Sharma",
    appointmentId: "APT-4401",
    status: "IN_PROGRESS",
    chiefComplaint: "Chest discomfort on exertion, 3 days",
    diagnosis: "Stable angina — rule out ACS",
    treatmentPlan: "ECG review, lipid optimization, lifestyle counseling. Cardiology follow-up in 1 week.",
    prescriptions: ["Atorvastatin 20mg HS", "Aspirin 75mg OD", "GTN spray PRN"],
    followUpDate: "2026-09-27",
    signedOffAt: null,
    locked: false,
    notes: "Patient hemodynamically stable. Troponin pending from morning draw.",
    createdAt: "2026-09-20T08:15:00+05:30",
    updatedAt: "2026-09-20T09:40:00+05:30",
  },
  {
    id: "ENC-2002",
    patientId: "P-1002",
    patientName: "Rahul Mehra",
    doctorName: "Dr. Arvind Nair",
    appointmentId: "APT-4402",
    status: "SIGNED_OFF",
    chiefComplaint: "Diabetes follow-up and medication review",
    diagnosis: "Type 2 diabetes mellitus — controlled",
    treatmentPlan: "Continue Metformin and basal insulin. Reinforce SMBG education. Dietitian referral.",
    prescriptions: ["Metformin 500mg BD", "Insulin Glargine 10 units HS"],
    followUpDate: "2026-10-20",
    signedOffAt: "2026-09-18T11:22:00+05:30",
    locked: true,
    notes: "HbA1c 6.8%. No hypoglycemia episodes reported.",
    createdAt: "2026-09-18T10:05:00+05:30",
    updatedAt: "2026-09-18T11:22:00+05:30",
  },
  {
    id: "ENC-2003",
    patientId: "P-1003",
    patientName: "Priya Desai",
    doctorName: "Dr. Imran Khan",
    appointmentId: "APT-4403",
    status: "DRAFT",
    chiefComplaint: "Wheeze and nocturnal cough",
    diagnosis: "",
    treatmentPlan: "",
    prescriptions: [],
    followUpDate: null,
    signedOffAt: null,
    locked: false,
    notes: "Spirometry ordered. Awaiting peak-flow diary.",
    createdAt: "2026-09-20T07:50:00+05:30",
    updatedAt: "2026-09-20T07:50:00+05:30",
  },
  {
    id: "ENC-2004",
    patientId: "P-1004",
    patientName: "Vikram Patel",
    doctorName: "Dr. Kavita Sharma",
    appointmentId: "APT-4404",
    status: "IN_PROGRESS",
    chiefComplaint: "Palpitations and elevated BP reading at home",
    diagnosis: "Hypertension — newly diagnosed, stage 2",
    treatmentPlan: "Start ACE inhibitor, ambulatory BP monitoring, renal panel in 48 hours.",
    prescriptions: ["Telmisartan 40mg OD"],
    followUpDate: "2026-09-25",
    signedOffAt: null,
    locked: false,
    notes: "Critical observation flag — cardiac care-team review requested.",
    createdAt: "2026-09-20T09:10:00+05:30",
    updatedAt: "2026-09-20T09:55:00+05:30",
  },
  {
    id: "ENC-2005",
    patientId: "P-1001",
    patientName: "Amrita Singh",
    doctorName: "Dr. Kavita Sharma",
    appointmentId: "APT-4388",
    status: "SIGNED_OFF",
    chiefComplaint: "Routine cardiology review",
    diagnosis: "Ischaemic heart disease — stable",
    treatmentPlan: "Continue dual antiplatelet as prescribed. Exercise ECG deferred.",
    prescriptions: ["Atorvastatin 20mg HS", "Aspirin 75mg OD"],
    followUpDate: "2026-09-20",
    signedOffAt: "2026-08-02T16:05:00+05:30",
    locked: true,
    notes: "Prior encounter — linked to current visit.",
    createdAt: "2026-08-02T14:30:00+05:30",
    updatedAt: "2026-08-02T16:05:00+05:30",
  },
];

// ---------------------------------------------------------------------------
// Notifications (DEMO)
// ---------------------------------------------------------------------------

export const notifications: DemoNotification[] = [
  {
    id: "NTF-101",
    title: "Critical patient observation",
    body: "P-1004 Vikram Patel requires cardiac care-team review within the hour.",
    channel: "In-app",
    read: false,
    createdAt: "2026-09-20T09:58:00+05:30",
    priority: "critical",
  },
  {
    id: "NTF-102",
    title: "Lab results ready",
    body: "Lipid profile for Amrita Singh (P-1001) is available for clinical review.",
    channel: "Email",
    read: false,
    createdAt: "2026-09-20T08:42:00+05:30",
    priority: "high",
  },
  {
    id: "NTF-103",
    title: "Appointment reminder sent",
    body: "SMS reminder delivered to Rahul Mehra for tomorrow’s endocrinology visit.",
    channel: "SMS",
    read: true,
    createdAt: "2026-09-19T18:00:00+05:30",
    priority: "normal",
  },
  {
    id: "NTF-104",
    title: "Pharmacy low-stock alert",
    body: "Insulin Glargine pens are at reorder threshold — pharmacy notified.",
    channel: "In-app",
    read: false,
    createdAt: "2026-09-19T14:20:00+05:30",
    priority: "high",
  },
  {
    id: "NTF-105",
    title: "Invoice overdue",
    body: "Invoice INV-9082 for Priya Desai is 7 days past due.",
    channel: "Email",
    read: true,
    createdAt: "2026-09-18T11:05:00+05:30",
    priority: "normal",
  },
  {
    id: "NTF-106",
    title: "Queue wait threshold",
    body: "Cardiology queue average wait exceeded 25 minutes this morning.",
    channel: "In-app",
    read: false,
    createdAt: "2026-09-20T10:05:00+05:30",
    priority: "low",
  },
];

// ---------------------------------------------------------------------------
// Analytics summary (DEMO)
// ---------------------------------------------------------------------------

export const analyticsSummary: AnalyticsSummary = {
  queueWait: {
    averageMinutes: 18,
    medianMinutes: 15,
    p95Minutes: 42,
    byHour: [
      { hour: "08:00", waitMinutes: 12, patients: 8 },
      { hour: "09:00", waitMinutes: 18, patients: 14 },
      { hour: "10:00", waitMinutes: 26, patients: 18 },
      { hour: "11:00", waitMinutes: 22, patients: 16 },
      { hour: "12:00", waitMinutes: 14, patients: 9 },
      { hour: "14:00", waitMinutes: 16, patients: 12 },
      { hour: "15:00", waitMinutes: 19, patients: 13 },
      { hour: "16:00", waitMinutes: 11, patients: 7 },
    ],
  },
  appointments: {
    completionRate: 86,
    noShowRate: 6,
    cancellationRate: 8,
    daily: [
      { date: "2026-09-14", scheduled: 52, completed: 44, cancelled: 5, noShow: 3 },
      { date: "2026-09-15", scheduled: 58, completed: 50, cancelled: 4, noShow: 4 },
      { date: "2026-09-16", scheduled: 61, completed: 53, cancelled: 5, noShow: 3 },
      { date: "2026-09-17", scheduled: 55, completed: 48, cancelled: 4, noShow: 3 },
      { date: "2026-09-18", scheduled: 49, completed: 42, cancelled: 4, noShow: 3 },
      { date: "2026-09-19", scheduled: 36, completed: 31, cancelled: 3, noShow: 2 },
      { date: "2026-09-20", scheduled: 56, completed: 41, cancelled: 4, noShow: 2 },
    ],
  },
  dailyVolumes: [
    { date: "2026-09-14", encounters: 48, labOrders: 22, prescriptions: 35, invoices: 28 },
    { date: "2026-09-15", encounters: 52, labOrders: 25, prescriptions: 38, invoices: 31 },
    { date: "2026-09-16", encounters: 55, labOrders: 28, prescriptions: 40, invoices: 33 },
    { date: "2026-09-17", encounters: 50, labOrders: 24, prescriptions: 36, invoices: 29 },
    { date: "2026-09-18", encounters: 46, labOrders: 21, prescriptions: 34, invoices: 27 },
    { date: "2026-09-19", encounters: 32, labOrders: 14, prescriptions: 22, invoices: 18 },
    { date: "2026-09-20", encounters: 44, labOrders: 19, prescriptions: 30, invoices: 24 },
  ],
};

// ---------------------------------------------------------------------------
// Documents (DEMO)
// ---------------------------------------------------------------------------

export const documents: DemoDocument[] = [
  { id: "DOC-501", patientId: "P-1001", patientName: "Amrita Singh", type: "Patient summary", date: "2026-09-20", status: "Ready" },
  { id: "DOC-502", patientId: "P-1001", patientName: "Amrita Singh", type: "Laboratory report", date: "2026-09-15", status: "Ready" },
  { id: "DOC-503", patientId: "P-1002", patientName: "Rahul Mehra", type: "Prescription", date: "2026-09-18", status: "Ready" },
  { id: "DOC-504", patientId: "P-1002", patientName: "Rahul Mehra", type: "Discharge summary", date: "2026-07-21", status: "Archived" },
  { id: "DOC-505", patientId: "P-1003", patientName: "Priya Desai", type: "Billing invoice", date: "2026-09-12", status: "Ready" },
  { id: "DOC-506", patientId: "P-1004", patientName: "Vikram Patel", type: "Medical record", date: "2026-09-20", status: "Generating" },
  { id: "DOC-507", patientId: "P-1003", patientName: "Priya Desai", type: "Admission form", date: "2026-08-07", status: "Failed" },
];

// ---------------------------------------------------------------------------
// Attendance (DEMO)
// ---------------------------------------------------------------------------

export const attendance: AttendanceRecord[] = [
  { id: "ATT-01", staffName: "Dr. Kavita Sharma", role: "DOCTOR", checkIn: "08:02", checkOut: null, status: "Present", date: "2026-09-20" },
  { id: "ATT-02", staffName: "Dr. Arvind Nair", role: "DOCTOR", checkIn: "08:18", checkOut: null, status: "Late", date: "2026-09-20" },
  { id: "ATT-03", staffName: "Nurse Meera Iyer", role: "NURSE", checkIn: "07:45", checkOut: null, status: "Present", date: "2026-09-20" },
  { id: "ATT-04", staffName: "Ravi Menon", role: "RECEPTIONIST", checkIn: "07:50", checkOut: "16:05", status: "Checked Out", date: "2026-09-19" },
  { id: "ATT-05", staffName: "Lab Tech. Sneha Rao", role: "LAB_TECHNICIAN", checkIn: "08:00", checkOut: null, status: "Present", date: "2026-09-20" },
  { id: "ATT-06", staffName: "Pharmacist Anil Gupta", role: "PHARMACIST", checkIn: null, checkOut: null, status: "On Leave", date: "2026-09-20" },
  { id: "ATT-07", staffName: "Billing Officer Kavya Das", role: "BILLING", checkIn: null, checkOut: null, status: "Absent", date: "2026-09-20" },
];

// ---------------------------------------------------------------------------
// Audit events (DEMO)
// ---------------------------------------------------------------------------

export const auditEvents: AuditEvent[] = [
  { id: "AUD-9001", actor: "Dr. Kavita Sharma", action: "ENCOUNTER_UPDATE", entity: "ENC-2001", timestamp: "2026-09-20T09:40:00+05:30", detail: "Updated diagnosis and treatment plan" },
  { id: "AUD-9002", actor: "Dr. Arvind Nair", action: "ENCOUNTER_SIGN_OFF", entity: "ENC-2002", timestamp: "2026-09-18T11:22:00+05:30", detail: "Clinical note locked after sign-off" },
  { id: "AUD-9003", actor: "Nurse Meera Iyer", action: "QUEUE_CHECK_IN", entity: "APT-4401", timestamp: "2026-09-20T08:12:00+05:30", detail: "Patient Amrita Singh checked into cardiology queue" },
  { id: "AUD-9004", actor: "Admin User", action: "ROLE_ASSIGN", entity: "USER-882", timestamp: "2026-09-19T16:44:00+05:30", detail: "Assigned BILLING role to Kavya Das" },
  { id: "AUD-9005", actor: "System", action: "PAYMENT_CONFIRM", entity: "PAY-7712", timestamp: "2026-09-19T13:10:00+05:30", detail: "Razorpay confirmation for INV-9078 (₹2,450)" },
  { id: "AUD-9006", actor: "Lab Tech. Sneha Rao", action: "LAB_RESULT_POST", entity: "LAB-1002", timestamp: "2026-09-15T17:05:00+05:30", detail: "Lipid profile results posted for P-1001" },
  { id: "AUD-9007", actor: "Reception Desk", action: "APPOINTMENT_BOOK", entity: "APT-4404", timestamp: "2026-09-20T07:30:00+05:30", detail: "Booked cardiology slot for Vikram Patel" },
];

// ---------------------------------------------------------------------------
// Operational metrics (DEMO)
// ---------------------------------------------------------------------------

export const operationalMetrics: OperationalMetrics = {
  bedOccupancyPercent: 72,
  activeEncounters: 2,
  pendingLabResults: 5,
  openInvoices: 11,
  avgConsultMinutes: 18,
  staffOnDuty: 38,
};

// ---------------------------------------------------------------------------
// Demo payment invoices (fallback when Payment API unavailable)
// ---------------------------------------------------------------------------

export type DemoInvoice = {
  id: string;
  invoiceNumber: string;
  patientName: string;
  amount: number;
  status: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
  billingDate: string;
  method?: string;
};

export const demoInvoices: DemoInvoice[] = [
  { id: "INV-D1", invoiceNumber: "INV-9082", patientName: "Priya Desai", amount: 3200, status: "OVERDUE", billingDate: "2026-09-12" },
  { id: "INV-D2", invoiceNumber: "INV-9088", patientName: "Amrita Singh", amount: 1850, status: "UNPAID", billingDate: "2026-09-19" },
  { id: "INV-D3", invoiceNumber: "INV-9078", patientName: "Rahul Mehra", amount: 2450, status: "PAID", billingDate: "2026-09-18", method: "UPI" },
  { id: "INV-D4", invoiceNumber: "INV-9091", patientName: "Vikram Patel", amount: 4100, status: "PARTIALLY_PAID", billingDate: "2026-09-20" },
  { id: "INV-D5", invoiceNumber: "INV-9065", patientName: "Amrita Singh", amount: 980, status: "PAID", billingDate: "2026-09-15", method: "CARD" },
];

export const demoPaymentSummary = {
  todaysRevenue: 6550,
  successfulPayments: 2,
  pendingPayments: 2,
  failedPayments: 0,
  totalRefunded: 0,
  outstandingAmount: 9150,
};

export const demoTransactions = [
  { id: "TXN-D1", patientName: "Rahul Mehra", invoiceNumber: "INV-9078", amount: 2450, status: "SUCCESS" as const, method: "UPI", createdAt: "2026-09-19T13:10:00+05:30" },
  { id: "TXN-D2", patientName: "Amrita Singh", invoiceNumber: "INV-9065", amount: 980, status: "SUCCESS" as const, method: "CARD", createdAt: "2026-09-15T11:22:00+05:30" },
  { id: "TXN-D3", patientName: "Vikram Patel", invoiceNumber: "INV-9091", amount: 1500, status: "PENDING" as const, method: "UPI", createdAt: "2026-09-20T09:30:00+05:30" },
];

/** Helpers for Patient360 / clinical lookups */
export function encountersForPatient(patientId: string): ClinicalEncounter[] {
  return clinicalEncounters.filter((e) => e.patientId === patientId);
}

export function documentsForPatient(patientId: string): DemoDocument[] {
  return documents.filter((d) => d.patientId === patientId);
}

export function getEncounterById(id: string): ClinicalEncounter | undefined {
  return clinicalEncounters.find((e) => e.id === id);
}
