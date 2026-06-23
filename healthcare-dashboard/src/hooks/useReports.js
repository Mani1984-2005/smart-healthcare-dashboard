// src/hooks/useReports.js

import { useState, useEffect, useCallback } from "react";
import {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  generateReport,
  markReportExported,
  archiveReport,
  getReportStats,
  downloadReportFile,
  payloadToCSV,
  REPORT_FORMAT,
} from "../services/reportsService";

// ─── Reports List Hook ────────────────────────────────────────────────────────

export const useReports = (initialFilters = {}) => {
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);

  const fetchReports = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const res = getAllReports(filters);
      setReports(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const addReport = useCallback(
    (reportData) => {
      try {
        const res = createReport(reportData);
        fetchReports();
        return res.data;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [fetchReports]
  );

  const editReport = useCallback(
    (id, updates) => {
      try {
        const res = updateReport(id, updates);
        fetchReports();
        return res.data;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [fetchReports]
  );

  const removeReport = useCallback(
    (id) => {
      try {
        deleteReport(id);
        fetchReports();
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [fetchReports]
  );

  const archive = useCallback(
    (id) => {
      try {
        const res = archiveReport(id);
        fetchReports();
        return res.data;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [fetchReports]
  );

  return {
    reports,
    total,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchReports,
    addReport,
    editReport,
    removeReport,
    archive,
  };
};

// ─── Single Report Hook ───────────────────────────────────────────────────────

export const useReport = (id) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReport = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = getReportById(id);
      setReport(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return { report, loading, error, refetch: fetchReport };
};

// ─── Report Generator Hook ────────────────────────────────────────────────────

export const useReportGenerator = () => {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [error, setError] = useState(null);

  const generate = useCallback((type, payload, meta = {}) => {
    setGenerating(true);
    setError(null);
    setGenerated(null);
    try {
      const res = generateReport(type, payload, meta);
      setGenerated(res.data);
      return res.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setGenerated(null);
    setError(null);
  }, []);

  return { generate, generating, generated, error, reset };
};

// ─── Report Export Hook ───────────────────────────────────────────────────────

export const useReportExport = () => {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const exportReport = useCallback(async (report, format = REPORT_FORMAT.JSON) => {
    setExporting(true);
    setError(null);
    try {
      const filename = `${report.title?.replace(/\s+/g, "_") || report.id}`;
      const rows = Array.isArray(report.payload)
        ? report.payload
        : [report.payload];

      if (format === REPORT_FORMAT.CSV) {
        const csv = payloadToCSV(rows);
        downloadReportFile(csv, `${filename}.csv`, "text/csv");
      } else {
        const json = JSON.stringify(report.payload, null, 2);
        downloadReportFile(json, `${filename}.json`, "application/json");
      }

      markReportExported(report.id, format);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setExporting(false);
    }
  }, []);

  return { exportReport, exporting, error };
};

// ─── Report Stats Hook ────────────────────────────────────────────────────────

export const useReportStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const res = getReportStats();
      setStats(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
};