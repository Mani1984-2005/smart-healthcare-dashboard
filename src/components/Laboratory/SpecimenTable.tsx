import React, { useState, useMemo } from "react";
import { useLabStore, Specimen } from "../../stores/useLabStore";
import {
  SPECIMEN_STATUS,
  SPECIMEN_STATUS_LABELS,
  SPECIMEN_INTEGRITY,
  SPECIMEN_INTEGRITY_LABELS,
  SAMPLE_TYPES,
  SAMPLE_TYPE_LABELS,
  CONTAINER_LABELS,
} from "../../constants/labConstants";

export interface SpecimenTableProps {
  /** Optional custom list of specimens; falls back to useLabStore().specimens */
  specimens?: Specimen[];
  /** Optional callback when status is changed */
  onStatusChange?: (specimenId: string, newStatus: string) => void;
  /** Optional callback when specimen row or view is selected */
  onSelectSpecimen?: (specimen: Specimen) => void;
  /** Optional callback to open barcode label modal */
  onPrintLabel?: (specimen: Specimen) => void;
  /** Optional dark mode flag */
  darkMode?: boolean;
  /** Optional flag to hide built-in search/filter toolbar */
  hideFilters?: boolean;
  /** Initial or controlled status filter */
  filterStatus?: string;
  /** Initial or controlled search query */
  searchTerm?: string;
}

export function SpecimenTable({
  specimens: propSpecimens,
  onStatusChange,
  onSelectSpecimen,
  onPrintLabel,
  darkMode = false,
  hideFilters = false,
  filterStatus: propFilterStatus,
  searchTerm: propSearchTerm,
}: SpecimenTableProps) {
  // Integrate with useLabStore
  const store = useLabStore();
  const rawSpecimens = propSpecimens || store.specimens || [];

  // Local state for table interaction
  const [localSearch, setLocalSearch] = useState(propSearchTerm || "");
  const [localStatusFilter, setLocalStatusFilter] = useState(propFilterStatus || "All");
  const [sampleTypeFilter, setSampleTypeFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sortField, setSortField] = useState<"collectionTime" | "patientName" | "status" | "priority">("collectionTime");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail & Quick Actions modal
  const [activeModalSpecimen, setActiveModalSpecimen] = useState<Specimen | null>(null);
  const [modalMode, setModalMode] = useState<"details" | "advance" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);

  // Sync props if provided
  const effectiveSearch = propSearchTerm !== undefined ? propSearchTerm : localSearch;
  const effectiveStatusFilter = propFilterStatus !== undefined ? propFilterStatus : localStatusFilter;

  // Filtered & Sorted records
  const filteredSpecimens = useMemo(() => {
    return rawSpecimens.filter((spec) => {
      // Status filter
      if (effectiveStatusFilter !== "All" && spec.status !== effectiveStatusFilter) {
        return false;
      }
      // Sample type filter
      if (sampleTypeFilter !== "All" && spec.sampleType !== sampleTypeFilter) {
        return false;
      }
      // Priority filter
      if (priorityFilter !== "All" && spec.priority !== priorityFilter) {
        return false;
      }
      // Search query across Barcode, Patient, Test ID, Test Name
      if (effectiveSearch.trim()) {
        const query = effectiveSearch.toLowerCase().trim();
        const matchesBarcode = spec.barcode?.toLowerCase().includes(query);
        const matchesPatientName = spec.patientName?.toLowerCase().includes(query);
        const matchesPatientId = spec.patientId?.toLowerCase().includes(query);
        const matchesTestId = spec.testId?.toLowerCase().includes(query);
        const matchesTestName = spec.testName?.toLowerCase().includes(query);
        const matchesCollector = spec.collectedBy?.toLowerCase().includes(query);

        if (!matchesBarcode && !matchesPatientName && !matchesPatientId && !matchesTestId && !matchesTestName && !matchesCollector) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      let comp = 0;
      if (sortField === "collectionTime") {
        const dateA = new Date(a.collectionTime || 0).getTime();
        const dateB = new Date(b.collectionTime || 0).getTime();
        comp = dateA - dateB;
      } else if (sortField === "patientName") {
        comp = (a.patientName || "").localeCompare(b.patientName || "");
      } else if (sortField === "status") {
        comp = (a.status || "").localeCompare(b.status || "");
      } else if (sortField === "priority") {
        const pOrder: Record<string, number> = { Emergency: 3, STAT: 3, Urgent: 2, Routine: 1 };
        comp = (pOrder[a.priority] || 0) - (pOrder[b.priority] || 0);
      }
      return sortAsc ? comp : -comp;
    });
  }, [rawSpecimens, effectiveStatusFilter, sampleTypeFilter, priorityFilter, effectiveSearch, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(filteredSpecimens.length / pageSize) || 1;
  const paginatedSpecimens = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSpecimens.slice(start, start + pageSize);
  }, [filteredSpecimens, page, pageSize]);

  // Handlers
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleCopyBarcode = (barcode: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(barcode);
    }
    setCopiedBarcode(barcode);
    setTimeout(() => setCopiedBarcode(null), 2000);
  };

  const handleAdvanceStatus = (specimen: Specimen, targetStatus: string) => {
    store.updateSpecimenStatus(specimen.id, targetStatus, actionNotes || undefined);
    if (onStatusChange) {
      onStatusChange(specimen.id, targetStatus);
    }
    setModalMode(null);
    setActiveModalSpecimen(null);
    setActionNotes("");
  };

  const handleRejectSpecimen = (specimen: Specimen) => {
    if (!rejectReason.trim()) return;
    store.updateSpecimenStatus(specimen.id, SPECIMEN_STATUS.REJECTED, rejectReason.trim());
    if (onStatusChange) {
      onStatusChange(specimen.id, SPECIMEN_STATUS.REJECTED);
    }
    setModalMode(null);
    setActiveModalSpecimen(null);
    setRejectReason("");
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case SPECIMEN_STATUS.COLLECTED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            {SPECIMEN_STATUS_LABELS[status] || "Collected"}
          </span>
        );
      case SPECIMEN_STATUS.RECEIVED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {SPECIMEN_STATUS_LABELS[status] || "Received / Accessioned"}
          </span>
        );
      case SPECIMEN_STATUS.PROCESSING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-spin" />
            {SPECIMEN_STATUS_LABELS[status] || "Processing"}
          </span>
        );
      case SPECIMEN_STATUS.ANALYZED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLineline="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            {SPECIMEN_STATUS_LABELS[status] || "Analyzed"}
          </span>
        );
      case SPECIMEN_STATUS.REJECTED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLineline="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
            {SPECIMEN_STATUS_LABELS[status] || "Rejected"}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {status || "Unknown"}
          </span>
        );
    }
  };

  // Priority Badge Helper
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "Emergency":
      case "STAT":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            STAT
          </span>
        );
      case "Urgent":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            Urgent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
            Routine
          </span>
        );
    }
  };

  // Format Date & Time
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className={`w-full rounded-2xl border transition-all ${darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"} shadow-sm`}>
      {/* Header & Filter Controls */}
      {!hideFilters && (
        <div className={`p-4 md:p-5 border-b ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🧪</span>
                <h3 className="text-base font-bold tracking-tight">Specimen Repository & Test Tracking</h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${darkMode ? "bg-indigo-950 text-indigo-300 border border-indigo-800" : "bg-indigo-50 text-indigo-700 border border-indigo-200"}`}>
                  {filteredSpecimens.length} Records
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                Real-time tracking of specimen collection timestamps, statuses, and linked diagnostic orders
              </p>
            </div>

            {/* Live Search Input */}
            <div className="relative min-w-[280px] max-w-md">
              <svg
                className={`absolute left-3.5 top-2.5 w-4 h-4 ${darkMode ? "text-slate-500" : "text-slate-400"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search barcode, test ID, patient name..."
                value={effectiveSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  setPage(1);
                }}
                className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl border outline-none transition focus:ring-2 focus:ring-indigo-500/20 ${
                  darkMode
                    ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400 focus:border-indigo-500"
                    : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500"
                }`}
              />
              {effectiveSearch && (
                <button
                  onClick={() => {
                    setLocalSearch("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-3 border-t border-dashed border-slate-200/60 dark:border-slate-800">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Status:</span>
              <select
                value={effectiveStatusFilter}
                onChange={(e) => {
                  setLocalStatusFilter(e.target.value);
                  setPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium outline-none transition ${
                  darkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-700"
                }`}
              >
                <option value="All">All Statuses</option>
                <option value={SPECIMEN_STATUS.COLLECTED}>Collected (Awaiting Intake)</option>
                <option value={SPECIMEN_STATUS.RECEIVED}>Received (Accessioned)</option>
                <option value={SPECIMEN_STATUS.PROCESSING}>In Processing / Analysis</option>
                <option value={SPECIMEN_STATUS.ANALYZED}>Analyzed (Completed)</option>
                <option value={SPECIMEN_STATUS.REJECTED}>Rejected (Failed QC)</option>
              </select>
            </div>

            {/* Sample Type Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Sample Type:</span>
              <select
                value={sampleTypeFilter}
                onChange={(e) => {
                  setSampleTypeFilter(e.target.value);
                  setPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium outline-none transition ${
                  darkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-700"
                }`}
              >
                <option value="All">All Types</option>
                {Object.entries(SAMPLE_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium outline-none transition ${
                  darkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-700"
                }`}
              >
                <option value="All">All Priorities</option>
                <option value="Routine">Routine</option>
                <option value="Urgent">Urgent</option>
                <option value="Emergency">STAT / Emergency</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {(effectiveStatusFilter !== "All" || sampleTypeFilter !== "All" || priorityFilter !== "All" || effectiveSearch) && (
              <button
                onClick={() => {
                  setLocalSearch("");
                  setLocalStatusFilter("All");
                  setSampleTypeFilter("All");
                  setPriorityFilter("All");
                  setPage(1);
                }}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition ml-auto"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Specimen Table Data */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className={`border-b ${darkMode ? "border-slate-800 bg-slate-800/40 text-slate-300" : "border-slate-200 bg-slate-50/70 text-slate-600"}`}>
              <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Barcode / Sample ID</th>
              <th
                className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] cursor-pointer select-none hover:text-indigo-600 transition"
                onClick={() => handleSort("patientName")}
              >
                <div className="flex items-center gap-1">
                  <span>Patient</span>
                  {sortField === "patientName" && <span>{sortAsc ? "▲" : "▼"}</span>}
                </div>
              </th>
              <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Associated Lab Test</th>
              <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px]">Sample Details</th>
              <th
                className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] cursor-pointer select-none hover:text-indigo-600 transition"
                onClick={() => handleSort("collectionTime")}
              >
                <div className="flex items-center gap-1">
                  <span>Collection Time</span>
                  {sortField === "collectionTime" && <span>{sortAsc ? "▲" : "▼"}</span>}
                </div>
              </th>
              <th
                className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] cursor-pointer select-none hover:text-indigo-600 transition"
                onClick={() => handleSort("status")}
              >
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  {sortField === "status" && <span>{sortAsc ? "▲" : "▼"}</span>}
                </div>
              </th>
              <th
                className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] cursor-pointer select-none hover:text-indigo-600 transition"
                onClick={() => handleSort("priority")}
              >
                <div className="flex items-center gap-1">
                  <span>Priority</span>
                  {sortField === "priority" && <span>{sortAsc ? "▲" : "▼"}</span>}
                </div>
              </th>
              <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? "divide-slate-800" : "divide-slate-100"}`}>
            {paginatedSpecimens.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="text-3xl">🔬</span>
                    <p className={`text-sm font-semibold ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                      No specimens match the specified criteria
                    </p>
                    <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                      Try resetting filters or intake a new laboratory sample.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedSpecimens.map((specimen, idx) => {
                const isSelected = store.selectedSpecimen?.id === specimen.id;
                return (
                  <tr
                    key={specimen.id || `specimen-row-${idx}`}
                    className={`transition-colors ${
                      isSelected
                        ? darkMode
                          ? "bg-indigo-950/40"
                          : "bg-indigo-50/60"
                        : darkMode
                        ? "hover:bg-slate-800/40"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Barcode / ID */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs tracking-tight text-indigo-600 dark:text-indigo-400">
                              {specimen.barcode}
                            </span>
                            <button
                              onClick={() => handleCopyBarcode(specimen.barcode)}
                              title="Copy Barcode"
                              className="text-slate-400 hover:text-slate-600 transition"
                            >
                              {copiedBarcode === specimen.barcode ? (
                                <span className="text-[10px] text-emerald-600 font-semibold">Copied!</span>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                          <span className={`text-[11px] font-mono ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                            {specimen.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Patient Name & ID */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {specimen.patientName}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>{specimen.patientId}</span>
                          {specimen.patientAge && <span>• {specimen.patientAge}y</span>}
                          {specimen.patientGender && <span>• {specimen.patientGender}</span>}
                        </div>
                      </div>
                    </td>

                    {/* Associated Lab Test ID & Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {specimen.testName}
                        </span>
                        {specimen.testId ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`font-mono text-[11px] px-1.5 py-0.2 rounded font-semibold ${
                              darkMode ? "bg-slate-800 text-indigo-400 border border-slate-700" : "bg-slate-100 text-indigo-700 border border-slate-200"
                            }`}>
                              ID: {specimen.testId}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                            Unlinked requisition
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Sample Details */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium capitalize text-slate-800 dark:text-slate-200">
                            {SAMPLE_TYPE_LABELS[specimen.sampleType] || specimen.sampleType}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            ({specimen.volume || "Standard"})
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {CONTAINER_LABELS[specimen.container] || specimen.container}
                        </span>
                      </div>
                    </td>

                    {/* Collection Time */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {formatDateTime(specimen.collectionTime)}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          By: {specimen.collectedBy || "Phlebotomy"}
                        </span>
                      </div>
                    </td>

                    {/* Specimen Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(specimen.status)}
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4">
                      {getPriorityBadge(specimen.priority)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Quick Status Advance Button */}
                        {specimen.status !== SPECIMEN_STATUS.ANALYZED && specimen.status !== SPECIMEN_STATUS.REJECTED && (
                          <button
                            onClick={() => {
                              setActiveModalSpecimen(specimen);
                              setModalMode("advance");
                            }}
                            title="Advance to next workflow stage"
                            className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:text-indigo-300 rounded-lg transition"
                          >
                            Advance
                          </button>
                        )}

                        {/* View Details / Open Modal */}
                        <button
                          onClick={() => {
                            store.setSelectedSpecimen(specimen);
                            setActiveModalSpecimen(specimen);
                            setModalMode("details");
                            if (onSelectSpecimen) {
                              onSelectSpecimen(specimen);
                            }
                          }}
                          title="View Specimen Details"
                          className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>

                        {/* Print Label Trigger */}
                        {onPrintLabel && (
                          <button
                            onClick={() => onPrintLabel(specimen)}
                            title="Print Barcode Label"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
        darkMode ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-500"
      }`}>
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className={`px-2 py-1 rounded border text-xs outline-none ${
              darkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-200 text-slate-700"
            }`}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="ml-2">
            Showing {filteredSpecimens.length === 0 ? 0 : (page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, filteredSpecimens.length)} of {filteredSpecimens.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={`px-2.5 py-1 rounded border font-medium transition ${
              page <= 1
                ? "opacity-40 cursor-not-allowed border-transparent"
                : darkMode
                ? "border-slate-700 hover:bg-slate-800 text-slate-200"
                : "border-slate-200 hover:bg-slate-100 text-slate-700"
            }`}
          >
            Previous
          </button>
          <span className="px-2 font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className={`px-2.5 py-1 rounded border font-medium transition ${
              page >= totalPages
                ? "opacity-40 cursor-not-allowed border-transparent"
                : darkMode
                ? "border-slate-700 hover:bg-slate-800 text-slate-200"
                : "border-slate-200 hover:bg-slate-100 text-slate-700"
            }`}
          >
            Next
          </button>
        </div>
      </div>

      {/* Advance Status Modal */}
      {modalMode === "advance" && activeModalSpecimen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border shadow-xl p-5 ${
            darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <h4 className="text-base font-bold mb-1">Advance Specimen Workflow Stage</h4>
            <p className="text-xs text-slate-500 mb-4">
              Specimen: <span className="font-mono font-semibold">{activeModalSpecimen.barcode}</span> • Patient: {activeModalSpecimen.patientName}
            </p>

            <div className="space-y-2 mb-4">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Stage:</label>
              <div className="grid grid-cols-2 gap-2">
                {activeModalSpecimen.status === SPECIMEN_STATUS.COLLECTED && (
                  <button
                    onClick={() => handleAdvanceStatus(activeModalSpecimen, SPECIMEN_STATUS.RECEIVED)}
                    className="p-3 border rounded-xl text-left hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition"
                  >
                    <div className="font-bold text-xs text-indigo-600 dark:text-indigo-400">Receive / Accession</div>
                    <div className="text-[11px] text-slate-500">Log reception at laboratory desk</div>
                  </button>
                )}
                {(activeModalSpecimen.status === SPECIMEN_STATUS.COLLECTED || activeModalSpecimen.status === SPECIMEN_STATUS.RECEIVED) && (
                  <button
                    onClick={() => handleAdvanceStatus(activeModalSpecimen, SPECIMEN_STATUS.PROCESSING)}
                    className="p-3 border rounded-xl text-left hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition"
                  >
                    <div className="font-bold text-xs text-indigo-600 dark:text-indigo-400">In Processing</div>
                    <div className="text-[11px] text-slate-500">Send to analyzer / centrifugation</div>
                  </button>
                )}
                {activeModalSpecimen.status === SPECIMEN_STATUS.PROCESSING && (
                  <button
                    onClick={() => handleAdvanceStatus(activeModalSpecimen, SPECIMEN_STATUS.ANALYZED)}
                    className="p-3 border rounded-xl text-left hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition"
                  >
                    <div className="font-bold text-xs text-emerald-600 dark:text-emerald-400">Analyzed & Ready</div>
                    <div className="text-[11px] text-slate-500">Analysis completed for reporting</div>
                  </button>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Technician Notes (Optional):
              </label>
              <input
                type="text"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="e.g. Rack A2, Centrifuged at 3000 RPM"
                className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                  darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              />
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setModalMode("reject");
                }}
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                Log Rejection
              </button>
              <button
                onClick={() => {
                  setModalMode(null);
                  setActiveModalSpecimen(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {modalMode === "reject" && activeModalSpecimen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border shadow-xl p-5 ${
            darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <h4 className="text-base font-bold text-rose-600 mb-1">Reject Specimen (Quality Fail)</h4>
            <p className="text-xs text-slate-500 mb-3">
              Specimen: <span className="font-mono font-semibold">{activeModalSpecimen.barcode}</span>
            </p>

            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                Reason for Rejection:
              </label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border outline-none mb-2 ${
                  darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              >
                <option value="">Select standard rejection reason...</option>
                <option value="Severe hemolysis detected">Severe hemolysis detected</option>
                <option value="Clotted EDTA hematology sample">Clotted EDTA hematology sample</option>
                <option value="Insufficient specimen quantity (QNS)">Insufficient specimen quantity (QNS)</option>
                <option value="Mislabeled / unlabeled container">Mislabeled / unlabeled container</option>
                <option value="Incorrect container type / anticoagulant">Incorrect container type / anticoagulant</option>
                <option value="Temperature excursion during transport">Temperature excursion during transport</option>
              </select>
              <input
                type="text"
                placeholder="Or specify custom reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border outline-none ${
                  darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setModalMode(null);
                  setActiveModalSpecimen(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectSpecimen(activeModalSpecimen)}
                disabled={!rejectReason.trim()}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Slide-Over / Modal */}
      {modalMode === "details" && activeModalSpecimen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl border shadow-xl p-6 ${
            darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔬</span>
                <div>
                  <h4 className="text-base font-bold">Specimen Dossier</h4>
                  <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                    {activeModalSpecimen.barcode}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalMode(null);
                  setActiveModalSpecimen(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
              <div className={`p-2.5 rounded-xl border ${darkMode ? "border-slate-800 bg-slate-800/50" : "border-slate-100 bg-slate-50"}`}>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Patient</span>
                <span className="font-semibold">{activeModalSpecimen.patientName}</span>
                <span className="block text-slate-500 text-[11px]">{activeModalSpecimen.patientId}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${darkMode ? "border-slate-800 bg-slate-800/50" : "border-slate-100 bg-slate-50"}`}>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Associated Test</span>
                <span className="font-semibold">{activeModalSpecimen.testName}</span>
                <span className="block font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                  {activeModalSpecimen.testId ? `ID: ${activeModalSpecimen.testId}` : "None"}
                </span>
              </div>
              <div className={`p-2.5 rounded-xl border ${darkMode ? "border-slate-800 bg-slate-800/50" : "border-slate-100 bg-slate-50"}`}>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Sample & Tube</span>
                <span className="font-semibold capitalize">{activeModalSpecimen.sampleType} ({activeModalSpecimen.volume || "4 mL"})</span>
                <span className="block text-slate-500 text-[11px]">{CONTAINER_LABELS[activeModalSpecimen.container] || activeModalSpecimen.container}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${darkMode ? "border-slate-800 bg-slate-800/50" : "border-slate-100 bg-slate-50"}`}>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Status & Quality</span>
                <div className="mt-0.5">{getStatusBadge(activeModalSpecimen.status)}</div>
                <span className="block text-slate-500 text-[11px] mt-1">QC: {activeModalSpecimen.integrity || "Adequate"}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${darkMode ? "border-slate-800 bg-slate-800/50" : "border-slate-100 bg-slate-50"}`}>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Collection Time</span>
                <span className="font-semibold">{formatDateTime(activeModalSpecimen.collectionTime)}</span>
                <span className="block text-slate-500 text-[11px]">Collector: {activeModalSpecimen.collectedBy}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${darkMode ? "border-slate-800 bg-slate-800/50" : "border-slate-100 bg-slate-50"}`}>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Storage Location</span>
                <span className="font-semibold">{activeModalSpecimen.storageLocation || "Rack B4 • Specimen Fridge"}</span>
                <span className="block text-slate-500 text-[11px]">{activeModalSpecimen.temperatureCondition || "Refrigerated (2-8°C)"}</span>
              </div>
            </div>

            {activeModalSpecimen.notes && (
              <div className={`p-3 rounded-xl border mb-4 text-xs ${darkMode ? "border-slate-800 bg-slate-800/30" : "border-slate-200 bg-slate-50"}`}>
                <span className="font-bold text-slate-500 block mb-0.5">Clinical Notes:</span>
                <p className="text-slate-700 dark:text-slate-300">{activeModalSpecimen.notes}</p>
              </div>
            )}

            {activeModalSpecimen.rejectionReason && (
              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs mb-4">
                <span className="font-bold block mb-0.5">Rejection Cause:</span>
                <p>{activeModalSpecimen.rejectionReason}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setModalMode(null);
                  setActiveModalSpecimen(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpecimenTable;
