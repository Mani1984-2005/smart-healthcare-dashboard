import React, { useState, useMemo } from "react";
import { useLabStore } from "../../stores/useLabStore.js";
import {
  SPECIMEN_STATUS,
  SPECIMEN_STATUS_LABELS,
  SAMPLE_TYPE_LABELS,
  CONTAINER_LABELS,
} from "../../constants/labConstants.js";

export function SpecimenTable({
  specimens: propSpecimens,
  onStatusChange,
  onSelectSpecimen,
  onPrintLabel,
  darkMode = false,
  hideFilters = false,
  filterStatus: propFilterStatus,
  searchTerm: propSearchTerm,
}) {
  const store = useLabStore();
  const rawSpecimens = propSpecimens || store.specimens || [];

  const [localSearch, setLocalSearch] = useState(propSearchTerm || "");
  const [localStatusFilter, setLocalStatusFilter] = useState(propFilterStatus || "All");
  const [sampleTypeFilter, setSampleTypeFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [sortField, setSortField] = useState("collectionTime");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [activeModalSpecimen, setActiveModalSpecimen] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [copiedBarcode, setCopiedBarcode] = useState(null);

  const effectiveSearch = propSearchTerm !== undefined ? propSearchTerm : localSearch;
  const effectiveStatusFilter = propFilterStatus !== undefined ? propFilterStatus : localStatusFilter;

  const filteredSpecimens = useMemo(() => {
    return rawSpecimens.filter((spec) => {
      if (effectiveStatusFilter !== "All" && spec.status !== effectiveStatusFilter) {
        return false;
      }
      if (sampleTypeFilter !== "All" && spec.sampleType !== sampleTypeFilter) {
        return false;
      }
      if (priorityFilter !== "All" && spec.priority !== priorityFilter) {
        return false;
      }
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
        const pOrder = { Emergency: 3, STAT: 3, Urgent: 2, Routine: 1 };
        comp = (pOrder[a.priority] || 0) - (pOrder[b.priority] || 0);
      }
      return sortAsc ? comp : -comp;
    });
  }, [rawSpecimens, effectiveStatusFilter, sampleTypeFilter, priorityFilter, effectiveSearch, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredSpecimens.length / pageSize) || 1;
  const paginatedSpecimens = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSpecimens.slice(start, start + pageSize);
  }, [filteredSpecimens, page, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleCopyBarcode = (barcode) => {
    if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(barcode);
    }
    setCopiedBarcode(barcode);
    setTimeout(() => setCopiedBarcode(null), 2000);
  };

  const handleAdvanceStatus = (specimen, targetStatus) => {
    store.updateSpecimenStatus(specimen.id, targetStatus, actionNotes || undefined);
    if (onStatusChange) {
      onStatusChange(specimen.id, targetStatus);
    }
    setModalMode(null);
    setActiveModalSpecimen(null);
    setActionNotes("");
  };

  const handleRejectSpecimen = (specimen) => {
    if (!rejectReason.trim()) return;
    store.updateSpecimenStatus(specimen.id, SPECIMEN_STATUS.REJECTED, rejectReason.trim());
    if (onStatusChange) {
      onStatusChange(specimen.id, SPECIMEN_STATUS.REJECTED);
    }
    setModalMode(null);
    setActiveModalSpecimen(null);
    setRejectReason("");
  };

  const getStatusBadge = (status) => {
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            {SPECIMEN_STATUS_LABELS[status] || "Analyzed"}
          </span>
        );
      case SPECIMEN_STATUS.REJECTED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <svg className="w-3.5 h-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
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

  const getPriorityBadge = (priority) => {
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

  const formatDateTime = (isoString) => {
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

          <div className="flex flex-wrap items-center gap-2.5 mt-4 pt-3 border-t border-dashed border-slate-200/60 dark:border-slate-800">
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
                    <td className="py-3.5 px-4">
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
                    </td>

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

                    <td className="py-3.5 px-4">
                      {getStatusBadge(specimen.status)}
                    </td>

                    <td className="py-3.5 px-4">
                      {getPriorityBadge(specimen.priority)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
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
    </div>
  );
}

export default SpecimenTable;
