import { PatientRecord } from "../../stores/patientStore.ts";
import { InvoiceRecord } from "../../stores/billingStore.ts";

export type ReportCategory = "Patient" | "Doctor" | "Financial" | "Operations";

export type ReportDefinition = {
  id: string;
  category: ReportCategory;
  title: string;
  description: string;
  keywords: string[];
};

export type ReportRow = Record<string, string | number>;

export type ReportResult = {
  definition: ReportDefinition;
  generatedAt: string;
  summary: { label: string; value: string }[];
  chart?: { type: "bar" | "line" | "area"; data: Record<string, string | number>[]; dataKeys: string[]; xKey: string };
  table: { columns: string[]; rows: ReportRow[] };
  insights: string[];
};

export const reportCatalog: ReportDefinition[] = [
  { id: "patient-registration", category: "Patient", title: "Patient registration trend", description: "New registrations and active caseload.", keywords: ["registration", "new patients", "patients registered", "signups"] },
  { id: "patient-status-mix", category: "Patient", title: "Patient status breakdown", description: "Active, critical, discharged, and observation counts.", keywords: ["status", "critical", "discharge", "observation", "patient mix"] },
  { id: "doctor-performance", category: "Doctor", title: "Doctor performance & patient load", description: "Consultations and revenue generated per doctor.", keywords: ["doctor", "physician", "consultation load", "performance"] },
  { id: "financial-revenue", category: "Financial", title: "Monthly hospital performance report", description: "Revenue collected, outstanding balance, and invoice mix.", keywords: ["monthly hospital performance", "revenue", "financial", "collections", "billing summary"] },
  { id: "financial-insurance", category: "Financial", title: "Insurance & claims report", description: "Claims outstanding by provider and status.", keywords: ["insurance", "claims", "unpaid", "emergency bills", "unpaid emergency"] },
  { id: "ops-bed-occupancy", category: "Operations", title: "Bed & ICU occupancy", description: "Ward and ICU occupancy against capacity.", keywords: ["bed occupancy", "icu occupancy", "capacity", "ward"] },
  { id: "ops-lab-pharmacy", category: "Operations", title: "Laboratory & pharmacy performance", description: "Turnaround times and stock levels.", keywords: ["lab performance", "pharmacy usage", "stock", "turnaround", "medicine"] },
];

const departments = ["Cardiology", "Endocrinology", "Emergency", "Pulmonology", "Pediatrics", "Orthopedics"];
export const wardCapacity = [
  { ward: "General Ward", capacity: 120, occupied: 96 },
  { ward: "ICU", capacity: 24, occupied: 19 },
  { ward: "Maternity", capacity: 30, occupied: 14 },
  { ward: "Pediatric", capacity: 25, occupied: 11 },
];
const labMetrics = [
  { test: "CBC panel", avgTurnaroundHrs: 3.2, pending: 8 },
  { test: "Thyroid panel", avgTurnaroundHrs: 6.5, pending: 4 },
  { test: "Lipid profile", avgTurnaroundHrs: 4.1, pending: 6 },
  { test: "HbA1c", avgTurnaroundHrs: 5.0, pending: 2 },
];
const pharmacyStock = [
  { medicine: "Amoxicillin 500mg", unitsRemaining: 18, daysUntilStockout: 4 },
  { medicine: "Insulin pen", unitsRemaining: 22, daysUntilStockout: 6 },
  { medicine: "Metformin 500mg", unitsRemaining: 140, daysUntilStockout: 28 },
  { medicine: "Paracetamol 650mg", unitsRemaining: 310, daysUntilStockout: 45 },
];

function monthLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { month: "short" });
}

export function generateReport(id: string, patients: PatientRecord[], invoices: InvoiceRecord[]): ReportResult {
  const definition = reportCatalog.find((report) => report.id === id) || reportCatalog[0];
  const generatedAt = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  switch (definition.id) {
    case "patient-registration": {
      const byMonth: Record<string, number> = {};
      patients.forEach((patient) => {
        const key = monthLabel(patient.registrationDate);
        byMonth[key] = (byMonth[key] || 0) + 1;
      });
      const chartData = Object.entries(byMonth).map(([month, count]) => ({ month, registrations: count }));
      return {
        definition,
        generatedAt,
        summary: [
          { label: "Total patients", value: String(patients.length) },
          { label: "Active", value: String(patients.filter((p) => p.status === "Active").length) },
          { label: "Critical", value: String(patients.filter((p) => p.status === "Critical").length) },
        ],
        chart: { type: "bar", data: chartData, dataKeys: ["registrations"], xKey: "month" },
        table: {
          columns: ["Patient ID", "Name", "Registered", "Status"],
          rows: patients.map((p) => ({ "Patient ID": p.id, Name: p.fullName, Registered: p.registrationDate, Status: p.status })),
        },
        insights: [
          patients.length > 0
            ? `${patients.filter((p) => p.status === "Critical").length} of ${patients.length} registered patients are currently marked critical.`
            : "No patient records available yet.",
        ],
      };
    }

    case "patient-status-mix": {
      const statuses = ["Active", "Critical", "Under Observation", "Discharged", "Inactive"];
      const chartData = statuses.map((status) => ({ status, count: patients.filter((p) => p.status === status).length }));
      return {
        definition,
        generatedAt,
        summary: statuses.map((status) => ({ label: status, value: String(patients.filter((p) => p.status === status).length) })),
        chart: { type: "bar", data: chartData, dataKeys: ["count"], xKey: "status" },
        table: { columns: ["Status", "Patients"], rows: chartData.map((row) => ({ Status: row.status, Patients: row.count })) },
        insights: ["Distribution reflects current patient registry snapshot."],
      };
    }

    case "doctor-performance": {
      const byDoctor: Record<string, { revenue: number; invoices: number; department: string }> = {};
      invoices.forEach((invoice) => {
        const key = invoice.doctorName || "Unassigned";
        if (!byDoctor[key]) byDoctor[key] = { revenue: 0, invoices: 0, department: invoice.department };
        byDoctor[key].revenue += invoice.grandTotal;
        byDoctor[key].invoices += 1;
      });
      const rows = Object.entries(byDoctor).map(([doctor, stats]) => ({ Doctor: doctor, Department: stats.department, Invoices: stats.invoices, "Revenue (₹)": stats.revenue }));
      return {
        definition,
        generatedAt,
        summary: [
          { label: "Doctors billing", value: String(Object.keys(byDoctor).length) },
          { label: "Total invoices", value: String(invoices.length) },
        ],
        chart: { type: "bar", data: rows.map((r) => ({ doctor: r.Doctor, revenue: r["Revenue (₹)"] })), dataKeys: ["revenue"], xKey: "doctor" },
        table: { columns: ["Doctor", "Department", "Invoices", "Revenue (₹)"], rows },
        insights: rows.length > 0 ? [`${rows.sort((a, b) => Number(b["Revenue (₹)"]) - Number(a["Revenue (₹)"]))[0].Doctor} generated the highest billed revenue in the current dataset.`] : ["No billing data linked to doctors yet."],
      };
    }

    case "financial-revenue": {
      const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
      const outstanding = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
      const byMonth: Record<string, number> = {};
      invoices.forEach((invoice) => {
        const key = monthLabel(invoice.billingDate);
        byMonth[key] = (byMonth[key] || 0) + invoice.grandTotal;
      });
      const chartData = Object.entries(byMonth).map(([month, revenue]) => ({ month, revenue }));
      return {
        definition,
        generatedAt,
        summary: [
          { label: "Revenue collected", value: `₹${totalRevenue.toLocaleString("en-IN")}` },
          { label: "Outstanding", value: `₹${outstanding.toLocaleString("en-IN")}` },
          { label: "Invoices", value: String(invoices.length) },
        ],
        chart: { type: "line", data: chartData, dataKeys: ["revenue"], xKey: "month" },
        table: { columns: ["Invoice", "Patient", "Status", "Grand total (₹)"], rows: invoices.map((inv) => ({ Invoice: inv.invoiceNumber, Patient: inv.patientName, Status: inv.status, "Grand total (₹)": inv.grandTotal })) },
        insights: [`${invoices.filter((i) => i.status === "Overdue").length} invoices are overdue, representing ₹${invoices.filter((i) => i.status === "Overdue").reduce((s, i) => s + i.balanceDue, 0).toLocaleString("en-IN")} at risk.`],
      };
    }

    case "financial-insurance": {
      const byProvider: Record<string, { count: number; coverage: number }> = {};
      invoices.filter((inv) => inv.insuranceCoverage > 0).forEach((invoice) => {
        const key = invoice.insuranceProvider || "Unspecified";
        if (!byProvider[key]) byProvider[key] = { count: 0, coverage: 0 };
        byProvider[key].count += 1;
        byProvider[key].coverage += invoice.insuranceCoverage;
      });
      const rows = Object.entries(byProvider).map(([provider, stats]) => ({ Provider: provider, Claims: stats.count, "Coverage (₹)": stats.coverage }));
      return {
        definition,
        generatedAt,
        summary: [{ label: "Providers", value: String(rows.length) }, { label: "Total claims", value: String(rows.reduce((s, r) => s + Number(r.Claims), 0)) }],
        chart: rows.length > 0 ? { type: "bar", data: rows.map((r) => ({ provider: r.Provider, coverage: r["Coverage (₹)"] })), dataKeys: ["coverage"], xKey: "provider" } : undefined,
        table: { columns: ["Provider", "Claims", "Coverage (₹)"], rows },
        insights: [invoices.filter((i) => i.status === "Unpaid" && i.department === "Emergency").length > 0 ? `${invoices.filter((i) => i.status === "Unpaid" && i.department === "Emergency").length} unpaid emergency bills found.` : "No unpaid emergency bills currently outstanding."],
      };
    }

    case "ops-bed-occupancy": {
      const rows = wardCapacity.map((w) => ({ Ward: w.ward, Capacity: w.capacity, Occupied: w.occupied, "Occupancy %": Math.round((w.occupied / w.capacity) * 100) }));
      return {
        definition,
        generatedAt,
        summary: rows.map((r) => ({ label: r.Ward, value: `${r["Occupancy %"]}%` })),
        chart: { type: "bar", data: wardCapacity.map((w) => ({ ward: w.ward, occupancy: Math.round((w.occupied / w.capacity) * 100) })), dataKeys: ["occupancy"], xKey: "ward" },
        table: { columns: ["Ward", "Capacity", "Occupied", "Occupancy %"], rows },
        insights: [`${rows.find((r) => r.Ward === "ICU")?.["Occupancy %"]}% ICU occupancy — ${(rows.find((r) => r.Ward === "ICU")?.["Occupancy %"] as number) >= 75 ? "approaching capacity, monitor closely." : "within normal range."}`],
      };
    }

    case "ops-lab-pharmacy": {
      return {
        definition,
        generatedAt,
        summary: [
          { label: "Lab tests pending", value: String(labMetrics.reduce((s, m) => s + m.pending, 0)) },
          { label: "Medicines near stockout", value: String(pharmacyStock.filter((m) => m.daysUntilStockout <= 7).length) },
        ],
        chart: { type: "bar", data: labMetrics.map((m) => ({ test: m.test, pending: m.pending })), dataKeys: ["pending"], xKey: "test" },
        table: {
          columns: ["Item", "Type", "Detail"],
          rows: [
            ...labMetrics.map((m) => ({ Item: m.test, Type: "Lab", Detail: `${m.avgTurnaroundHrs} hrs avg · ${m.pending} pending` })),
            ...pharmacyStock.map((m) => ({ Item: m.medicine, Type: "Pharmacy", Detail: `${m.unitsRemaining} units · stockout in ${m.daysUntilStockout}d` })),
          ],
        },
        insights: pharmacyStock.filter((m) => m.daysUntilStockout <= 7).map((m) => `${m.medicine} may run out in ${m.daysUntilStockout} days at current usage.`),
      };
    }

    default:
      return { definition, generatedAt, summary: [], table: { columns: [], rows: [] }, insights: [] };
  }
}

export function matchReportFromQuery(query: string): ReportDefinition | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  let best: { report: ReportDefinition; score: number } | null = null;
  for (const report of reportCatalog) {
    let score = 0;
    for (const keyword of report.keywords) {
      if (normalized.includes(keyword)) score += keyword.split(" ").length;
    }
    if (normalized.includes(report.title.toLowerCase())) score += 3;
    if (score > 0 && (!best || score > best.score)) best = { report, score };
  }
  return best?.report || null;
}

export function reportToCsv(result: ReportResult): string {
  const header = result.table.columns.join(",");
  const rows = result.table.rows.map((row) => result.table.columns.map((col) => `"${String(row[col] ?? "").replace(/"/g, '""')}"`).join(","));
  return [header, ...rows].join("\n");
}

export function departmentList(): string[] {
  return departments;
}
