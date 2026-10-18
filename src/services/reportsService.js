// src/services/reportsService.js

const STORAGE_KEY = "medicare_reports";
const REPORT_META_KEY = "medicare_report_meta";

// ─── LocalStorage Helpers ─────────────────────────────────────────────────────

const read = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const readObj = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const write = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`[reportsService] Failed to write ${key}:`, e);
  }
};

const generateId = (prefix = "RPT") =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

const now = () => new Date().toISOString();

// ─── Report Types ─────────────────────────────────────────────────────────────

export const REPORT_TYPES = {
  LAB_SUMMARY: "lab_summary",
  PATIENT_HISTORY: "patient_history",
  FINANCIAL: "financial",
  APPOINTMENT: "appointment",
  INVENTORY: "inventory",
  CUSTOM: "custom",
};

export const REPORT_FORMAT = {
  JSON: "json",
  CSV: "csv",
  PDF: "pdf",
};

export const REPORT_STATUS = {
  DRAFT: "draft",
  GENERATED: "generated",
  EXPORTED: "exported",
  ARCHIVED: "archived",
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const getAllReports = (filters = {}) => {
  let reports = read(STORAGE_KEY);

  if (filters.type) {
    reports = reports.filter((r) => r.type === filters.type);
  }
  if (filters.status) {
    reports = reports.filter((r) => r.status === filters.status);
  }
  if (filters.createdBy) {
    reports = reports.filter((r) => r.createdBy === filters.createdBy);
  }
  if (filters.dateFrom) {
    reports = reports.filter((r) => r.createdAt >= filters.dateFrom);
  }
  if (filters.dateTo) {
    reports = reports.filter((r) => r.createdAt <= filters.dateTo);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    reports = reports.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
  }

  reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { data: reports, total: reports.length, success: true };
};

export const getReportById = (id) => {
  const reports = read(STORAGE_KEY);
  const report = reports.find((r) => r.id === id);
  if (!report) throw new Error(`Report "${id}" not found`);
  return { data: report, success: true };
};

export const createReport = (reportData) => {
  const reports = read(STORAGE_KEY);
  const newReport = {
    id: generateId("RPT"),
    status: REPORT_STATUS.DRAFT,
    format: REPORT_FORMAT.JSON,
    createdAt: now(),
    updatedAt: now(),
    ...reportData,
  };
  reports.push(newReport);
  write(STORAGE_KEY, reports);
  _incrementMeta(newReport.type);
  return { data: newReport, success: true };
};

export const updateReport = (id, updates) => {
  const reports = read(STORAGE_KEY);
  const index = reports.findIndex((r) => r.id === id);
  if (index === -1) throw new Error(`Report "${id}" not found`);

  reports[index] = { ...reports[index], ...updates, updatedAt: now() };
  write(STORAGE_KEY, reports);
  return { data: reports[index], success: true };
};

export const deleteReport = (id) => {
  const reports = read(STORAGE_KEY);
  const filtered = reports.filter((r) => r.id !== id);
  if (filtered.length === reports.length)
    throw new Error(`Report "${id}" not found`);
  write(STORAGE_KEY, filtered);
  return { success: true };
};

export const markReportExported = (id, format = REPORT_FORMAT.PDF) =>
  updateReport(id, { status: REPORT_STATUS.EXPORTED, exportedAt: now(), format });

export const archiveReport = (id) =>
  updateReport(id, { status: REPORT_STATUS.ARCHIVED });

// ─── Generation ───────────────────────────────────────────────────────────────

/**
 * Generate a report from a data payload and persist it.
 * In a backend-connected scenario, this would POST to /api/v1/reports/generate.
 *
 * @param {string} type  - REPORT_TYPES value
 * @param {object} payload - Raw data to embed in the report
 * @param {object} meta  - { title, description, createdBy, format }
 */
export const generateReport = (type, payload, meta = {}) => {
  const report = {
    type,
    status: REPORT_STATUS.GENERATED,
    title: meta.title || `${type} Report`,
    description: meta.description || "",
    createdBy: meta.createdBy || null,
    format: meta.format || REPORT_FORMAT.JSON,
    payload,
    generatedAt: now(),
  };
  return createReport(report);
};

// ─── Export Helpers ───────────────────────────────────────────────────────────

/**
 * Convert a report payload to CSV string (flat objects only).
 * @param {object[]} rows
 * @returns {string}
 */
export const payloadToCSV = (rows = []) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          const str = String(val).replace(/"/g, '""');
          return /[,"\n]/.test(str) ? `"${str}"` : str;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
};

/**
 * Trigger a browser download for a report.
 * @param {string} content - File content
 * @param {string} filename
 * @param {string} mimeType
 */
export const downloadReportFile = (content, filename, mimeType = "text/plain") => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Meta / Analytics ─────────────────────────────────────────────────────────

const _incrementMeta = (type) => {
  const meta = readObj(REPORT_META_KEY);
  meta[type] = (meta[type] || 0) + 1;
  write(REPORT_META_KEY, meta);
};

export const getReportStats = () => {
  const reports = read(STORAGE_KEY);
  const meta = readObj(REPORT_META_KEY);

  return {
    data: {
      total: reports.length,
      byStatus: {
        draft: reports.filter((r) => r.status === REPORT_STATUS.DRAFT).length,
        generated: reports.filter((r) => r.status === REPORT_STATUS.GENERATED).length,
        exported: reports.filter((r) => r.status === REPORT_STATUS.EXPORTED).length,
        archived: reports.filter((r) => r.status === REPORT_STATUS.ARCHIVED).length,
      },
      byType: meta,
    },
    success: true,
  };
};