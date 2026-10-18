import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  getAllSpecimens,
  intakeSpecimen,
  updateSpecimenStatus,
  updateSpecimen,
  deleteSpecimen,
  getSpecimenStats,
  getAllOrders,
  updateOrderStatus,
} from "../services/laboratoryService";
import {
  SAMPLE_TYPES,
  SAMPLE_TYPE_LABELS,
  SPECIMEN_CONTAINERS,
  CONTAINER_LABELS,
  SPECIMEN_STATUS,
  SPECIMEN_STATUS_LABELS,
  SPECIMEN_INTEGRITY,
  SPECIMEN_INTEGRITY_LABELS,
  LAB_PRIORITY,
  LAB_STATUS,
} from "../constants/labConstants";
import { SpecimenTable } from "../components/laboratory/SpecimenTable";
export { SpecimenTable };

export interface SpecimenRecord {
  id: string;
  barcode: string;
  testId?: string;
  testName: string;
  patientId: string;
  patientName: string;
  patientAge?: number | string;
  patientGender?: string;
  sampleType: string;
  container: string;
  volume: string;
  collectionTime: string;
  collectedBy: string;
  receivedTime?: string;
  receivedBy?: string;
  status: string;
  integrity: string;
  temperatureCondition?: string;
  storageLocation?: string;
  fastingStatus?: string;
  priority: string;
  notes?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SpecimenIntakeProps {
  darkMode?: boolean;
  onSpecimenStatusChange?: (specimen: SpecimenRecord) => void;
}

export function SpecimenIntakeSection({ darkMode = false, onSpecimenStatusChange }: SpecimenIntakeProps) {
  const [specimens, setSpecimens] = useState<SpecimenRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    collected: 0,
    received: 0,
    processing: 0,
    analyzed: 0,
    rejected: 0,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sampleTypeFilter, setSampleTypeFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [selectedSpecimen, setSelectedSpecimen] = useState<SpecimenRecord | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState<SpecimenRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "warning" | "error" } | null>(null);

  // Available tests / orders for linking
  const [pendingOrders, setPendingOrders] = useState<Array<{ id: string; patientName: string; patientId: string; testName: string }>>([]);

  const showToast = useCallback((text: string, type: "success" | "warning" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const loadData = useCallback(() => {
    const res = getAllSpecimens({
      status: statusFilter,
      sampleType: sampleTypeFilter,
      priority: priorityFilter,
      search,
    });
    setSpecimens(res.data as SpecimenRecord[]);
    setStats(getSpecimenStats());

    // Fetch existing lab orders from laboratoryService
    try {
      const ordersRes = getAllOrders();
      if (ordersRes.data) {
        setPendingOrders(
          ordersRes.data.map((o: any) => ({
            id: o.id || o.testId,
            patientName: o.patientName || "Patient",
            patientId: o.patientId || "P-000",
            testName: o.testName || o.test || "Diagnostic Test",
          }))
        );
      }
    } catch {
      // fallback
    }
  }, [statusFilter, sampleTypeFilter, priorityFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Form State for new Specimen Intake
  const [form, setForm] = useState({
    barcode: "",
    testId: "",
    testName: "Complete Blood Count (CBC)",
    patientId: "",
    patientName: "",
    patientAge: "",
    patientGender: "Female",
    sampleType: "blood",
    container: "lavender_top",
    volume: "5 mL",
    collectionTime: new Date().toISOString().slice(0, 16),
    collectedBy: "Nurse Phlebotomist",
    receivedBy: "Lab Technician",
    temperatureCondition: "Room Temp (20-25°C)",
    storageLocation: "Accession Station A-01",
    fastingStatus: "Fasting 8-12h",
    priority: "Routine",
    integrity: "adequate",
    notes: "",
  });

  const handleOpenIntakeModal = (presetTest?: { id: string; patientName: string; patientId: string; testName: string }) => {
    const autoBarcode = `BC-${Math.floor(10000000 + Math.random() * 90000000)}`;
    if (presetTest) {
      setForm((prev) => ({
        ...prev,
        barcode: autoBarcode,
        testId: presetTest.id,
        testName: presetTest.testName,
        patientId: presetTest.patientId,
        patientName: presetTest.patientName,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        barcode: autoBarcode,
        testId: "",
        testName: "Complete Blood Count (CBC)",
        patientId: `P-${Math.floor(100 + Math.random() * 900)}`,
        patientName: "",
      }));
    }
    setShowIntakeModal(true);
  };

  const handleOrderSelect = (orderId: string) => {
    const found = pendingOrders.find((o) => o.id === orderId);
    if (found) {
      setForm((prev) => ({
        ...prev,
        testId: found.id,
        testName: found.testName,
        patientId: found.patientId,
        patientName: found.patientName,
      }));
    } else {
      setForm((prev) => ({ ...prev, testId: orderId }));
    }
  };

  const handleSubmitIntake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientName.trim()) {
      showToast("Patient name is required for specimen accessioning", "error");
      return;
    }

    try {
      const newRecord = intakeSpecimen({
        ...form,
        patientAge: form.patientAge ? Number(form.patientAge) : undefined,
        collectionTime: new Date(form.collectionTime).toISOString(),
        receivedTime: new Date().toISOString(),
      });

      showToast(`Specimen ${newRecord.data.id} accessioned. Status synced with Test #${newRecord.data.testId || "N/A"}.`, "success");
      setShowIntakeModal(false);
      loadData();
      onSpecimenStatusChange?.(newRecord.data as SpecimenRecord);
    } catch (err: any) {
      showToast(err.message || "Failed to intake specimen", "error");
    }
  };

  const handleAdvanceStatus = (specimen: SpecimenRecord, nextStatus: string) => {
    try {
      const updated = updateSpecimenStatus(specimen.id, nextStatus, {
        notes: `${specimen.notes || ""}\n[${new Date().toLocaleTimeString()}] Status updated to ${nextStatus}.`.trim(),
      });
      showToast(`Specimen ${specimen.barcode} moved to ${SPECIMEN_STATUS_LABELS[nextStatus] || nextStatus}.`, "success");
      loadData();
      if (selectedSpecimen?.id === specimen.id) {
        setSelectedSpecimen(updated.data as SpecimenRecord);
      }
      onSpecimenStatusChange?.(updated.data as SpecimenRecord);
    } catch (err: any) {
      showToast(err.message || "Failed to update status", "error");
    }
  };

  const handleRejectSpecimen = (specimen: SpecimenRecord) => {
    const reason = prompt("Enter specimen rejection reason (e.g. Severely hemolyzed, Clotted, Insufficient Volume):");
    if (!reason) return;

    try {
      const updated = updateSpecimenStatus(specimen.id, SPECIMEN_STATUS.REJECTED, {
        integrity: "clotted",
        rejectionReason: reason,
        notes: `${specimen.notes || ""}\n[REJECTED]: ${reason}`.trim(),
      });
      showToast(`Specimen ${specimen.id} rejected. Recollection flag sent to physician.`, "warning");
      loadData();
      if (selectedSpecimen?.id === specimen.id) {
        setSelectedSpecimen(updated.data as SpecimenRecord);
      }
      onSpecimenStatusChange?.(updated.data as SpecimenRecord);
    } catch (err: any) {
      showToast(err.message || "Failed to reject specimen", "error");
    }
  };

  const handleDeleteSpecimen = (id: string) => {
    if (!window.confirm("Remove this specimen record from intake ledger?")) return;
    try {
      deleteSpecimen(id);
      showToast("Specimen record removed", "warning");
      if (selectedSpecimen?.id === id) setSelectedSpecimen(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Delete failed", "error");
    }
  };

  const getContainerBadge = (containerKey: string) => {
    const label = CONTAINER_LABELS[containerKey] || containerKey;
    let colorClass = "bg-slate-100 text-slate-700 border-slate-300";
    if (containerKey.includes("lavender")) colorClass = "bg-purple-50 text-purple-700 border-purple-300";
    else if (containerKey.includes("red")) colorClass = "bg-rose-50 text-rose-700 border-rose-300";
    else if (containerKey.includes("green")) colorClass = "bg-emerald-50 text-emerald-700 border-emerald-300";
    else if (containerKey.includes("blue")) colorClass = "bg-sky-50 text-sky-700 border-sky-300";
    else if (containerKey.includes("yellow")) colorClass = "bg-amber-50 text-amber-700 border-amber-300";
    else if (containerKey.includes("urine")) colorClass = "bg-yellow-50 text-yellow-800 border-yellow-300";

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    let style = "bg-slate-100 text-slate-700 border-slate-200";
    let icon = "⚪";
    if (status === SPECIMEN_STATUS.COLLECTED) {
      style = "bg-amber-50 text-amber-800 border-amber-200";
      icon = "🚚";
    } else if (status === SPECIMEN_STATUS.RECEIVED) {
      style = "bg-blue-50 text-blue-800 border-blue-200";
      icon = "📥";
    } else if (status === SPECIMEN_STATUS.PROCESSING) {
      style = "bg-indigo-50 text-indigo-800 border-indigo-200 animate-pulse";
      icon = "⚙️";
    } else if (status === SPECIMEN_STATUS.ANALYZED) {
      style = "bg-emerald-50 text-emerald-800 border-emerald-200";
      icon = "✅";
    } else if (status === SPECIMEN_STATUS.REJECTED) {
      style = "bg-red-50 text-red-800 border-red-200";
      icon = "⛔";
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${style}`}>
        <span>{icon}</span>
        <span>{SPECIMEN_STATUS_LABELS[status] || status}</span>
      </span>
    );
  };

  return (
    <div className={`space-y-6 ${darkMode ? "text-slate-100" : "text-slate-800"}`}>
      {/* Toast notification */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500"
              : toastMessage.type === "warning"
              ? "bg-amber-600 text-white border-amber-500"
              : "bg-rose-600 text-white border-rose-500"
          }`}
        >
          <span className="text-sm font-medium">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="text-white hover:opacity-75 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Header and Intake trigger */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🩸</span>
            <h2 className="text-xl font-bold tracking-tight">Specimen Intake & Accessioning Station</h2>
            <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">
              LIMS Workflow
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time accessioning, barcode verification, sample integrity triage & test order status synchronization
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenIntakeModal()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition"
          >
            <span>+</span>
            <span>Intake New Specimen</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <span className="text-xs font-semibold text-slate-400 uppercase">Total Intake</span>
          <span className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</span>
          <span className="text-[11px] text-slate-400 mt-auto pt-1">All registered vials</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm flex flex-col">
          <span className="text-xs font-semibold text-amber-600 uppercase">In Transit</span>
          <span className="text-2xl font-bold text-amber-700 mt-1">{stats.collected}</span>
          <span className="text-[11px] text-amber-600/80 mt-auto pt-1">Collected at clinic</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex flex-col">
          <span className="text-xs font-semibold text-blue-600 uppercase">Accessioned</span>
          <span className="text-2xl font-bold text-blue-700 mt-1">{stats.received}</span>
          <span className="text-[11px] text-blue-600/80 mt-auto pt-1">Desk verified</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm flex flex-col">
          <span className="text-xs font-semibold text-indigo-600 uppercase">In Processing</span>
          <span className="text-2xl font-bold text-indigo-700 mt-1">{stats.processing}</span>
          <span className="text-[11px] text-indigo-600/80 mt-auto pt-1">Centrifuge / Analyzer</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm flex flex-col">
          <span className="text-xs font-semibold text-emerald-600 uppercase">Analyzed</span>
          <span className="text-2xl font-bold text-emerald-700 mt-1">{stats.analyzed}</span>
          <span className="text-[11px] text-emerald-600/80 mt-auto pt-1">Results populated</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm flex flex-col">
          <span className="text-xs font-semibold text-rose-600 uppercase">Rejected / QNS</span>
          <span className="text-2xl font-bold text-rose-700 mt-1">{stats.rejected}</span>
          <span className="text-[11px] text-rose-600/80 mt-auto pt-1">Recollect required</span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              🔍
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search barcode, specimen ID, patient, or test..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="All">All Statuses</option>
            {Object.entries(SPECIMEN_STATUS_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={sampleTypeFilter}
            onChange={(e) => setSampleTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="All">All Sample Types</option>
            {Object.entries(SAMPLE_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="All">All Priorities</option>
            <option value="Routine">Routine</option>
            <option value="Urgent">Urgent</option>
            <option value="STAT">STAT Emergency</option>
          </select>
        </div>
      </div>

      {/* Main Specimen Table & Interactive Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Barcode / Accession ID</th>
                <th className="px-4 py-3.5 font-semibold">Patient</th>
                <th className="px-4 py-3.5 font-semibold">Test Order</th>
                <th className="px-4 py-3.5 font-semibold">Sample & Tube</th>
                <th className="px-4 py-3.5 font-semibold">Quality & Condition</th>
                <th className="px-4 py-3.5 font-semibold">Intake Time</th>
                <th className="px-4 py-3.5 font-semibold">Specimen Status</th>
                <th className="px-4 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {specimens.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <div className="text-3xl mb-2">🧪</div>
                    <p className="font-medium text-slate-600">No specimen intake records found.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click "Intake New Specimen" above to scan and accession a patient sample.
                    </p>
                  </td>
                </tr>
              ) : (
                specimens.map((item) => {
                  const isSTAT = item.priority === "STAT";
                  const isUrgent = item.priority === "Urgent";
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSTAT ? "bg-rose-50/30" : isUrgent ? "bg-amber-50/20" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowBarcodeModal(item)}
                            title="View / Print Barcode"
                            className="font-mono text-xs font-bold px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded border border-slate-200 transition"
                          >
                            ||| {item.barcode}
                          </button>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">{item.id}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800">{item.patientName}</p>
                        <p className="text-xs text-slate-400">
                          {item.patientId} {item.patientAge ? `• ${item.patientAge}y` : ""} {item.patientGender ? `• ${item.patientGender}` : ""}
                        </p>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-700">{item.testName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs text-slate-400 font-mono">Linked: {item.testId || "Order N/A"}</span>
                          {isSTAT && (
                            <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.2 rounded uppercase">
                              STAT
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-800 capitalize">
                            {SAMPLE_TYPE_LABELS[item.sampleType] || item.sampleType} ({item.volume || "Standard"})
                          </p>
                          <div>{getContainerBadge(item.container)}</div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="text-xs">
                          <span
                            className={`font-semibold ${
                              item.integrity === SPECIMEN_INTEGRITY.ADEQUATE
                                ? "text-emerald-700"
                                : "text-rose-600"
                            }`}
                          >
                            {SPECIMEN_INTEGRITY_LABELS[item.integrity] || item.integrity}
                          </span>
                          <p className="text-[11px] text-slate-400 mt-0.5">{item.temperatureCondition || "Room Temp"}</p>
                          {item.storageLocation && (
                            <p className="text-[11px] text-slate-500 font-mono">📍 {item.storageLocation}</p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        <p>
                          {item.receivedTime
                            ? new Date(item.receivedTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "Pending Receipt"}
                        </p>
                        <p className="text-[11px] text-slate-400">By: {item.receivedBy || "Desk"}</p>
                      </td>

                      <td className="px-4 py-3.5">{getStatusBadge(item.status)}</td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Lifecycle Progress buttons */}
                          {item.status === SPECIMEN_STATUS.COLLECTED && (
                            <button
                              onClick={() => handleAdvanceStatus(item, SPECIMEN_STATUS.RECEIVED)}
                              className="px-2.5 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                              title="Confirm receipt at lab intake desk"
                            >
                              Receive
                            </button>
                          )}

                          {item.status === SPECIMEN_STATUS.RECEIVED && (
                            <button
                              onClick={() => handleAdvanceStatus(item, SPECIMEN_STATUS.PROCESSING)}
                              className="px-2.5 py-1 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                              title="Send to centrifuge or analyzer"
                            >
                              Spin / Process
                            </button>
                          )}

                          {item.status === SPECIMEN_STATUS.PROCESSING && (
                            <button
                              onClick={() => handleAdvanceStatus(item, SPECIMEN_STATUS.ANALYZED)}
                              className="px-2.5 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
                              title="Mark analyzer run complete"
                            >
                              Complete Run
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedSpecimen(item)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                            title="View Full Specimen Card & History"
                          >
                            👁️
                          </button>

                          {item.status !== SPECIMEN_STATUS.REJECTED && item.status !== SPECIMEN_STATUS.ANALYZED && (
                            <button
                              onClick={() => handleRejectSpecimen(item)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Reject Sample (Hemolysis/QNS/Clot)"
                            >
                              ⚠️
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteSpecimen(item.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Specimen Intake Modal */}
      {showIntakeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowIntakeModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-indigo-700 to-indigo-600 text-white rounded-t-2xl">
              <div>
                <h3 className="text-lg font-bold">Accession Specimen Intake</h3>
                <p className="text-indigo-200 text-xs mt-0.5">
                  Scan barcode, associate patient order & verify specimen integrity
                </p>
              </div>
              <button
                onClick={() => setShowIntakeModal(false)}
                className="text-white/80 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitIntake} className="p-6 space-y-4">
              {/* Linked Order auto-populate */}
              <div className="bg-indigo-50/70 p-3.5 rounded-xl border border-indigo-100 space-y-2">
                <label className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                  1. Link to Diagnostic Test Order (Optional)
                </label>
                <div className="flex gap-2">
                  <select
                    value={form.testId}
                    onChange={(e) => handleOrderSelect(e.target.value)}
                    className="flex-1 text-sm bg-white border border-indigo-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">-- Select Pending Order or Enter Manually --</option>
                    {pendingOrders.map((ord) => (
                      <option key={ord.id} value={ord.id}>
                        {ord.id} — {ord.patientName} ({ord.testName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Barcode & Patient */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Accession Barcode *</label>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      required
                      value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                      placeholder="e.g. BC-88210940"
                      className="w-full pl-3 pr-10 py-2 font-mono text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, barcode: `BC-${Math.floor(10000000 + Math.random() * 90000000)}` })
                      }
                      className="absolute right-2 top-2 text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      Gen
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Test / Examination Name *</label>
                  <input
                    type="text"
                    required
                    value={form.testName}
                    onChange={(e) => setForm({ ...form, testName: e.target.value })}
                    placeholder="e.g. Complete Blood Count (CBC)"
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.patientName}
                    onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Patient ID</label>
                    <input
                      type="text"
                      value={form.patientId}
                      onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                      placeholder="P-101"
                      className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Age / Gender</label>
                    <div className="flex gap-1 mt-1">
                      <input
                        type="number"
                        value={form.patientAge}
                        onChange={(e) => setForm({ ...form, patientAge: e.target.value })}
                        placeholder="Age"
                        className="w-1/2 px-2 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <select
                        value={form.patientGender}
                        onChange={(e) => setForm({ ...form, patientGender: e.target.value })}
                        className="w-1/2 px-1 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="Female">F</option>
                        <option value="Male">M</option>
                        <option value="Other">O</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Specimen Container & Sample Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Sample Type</label>
                  <select
                    value={form.sampleType}
                    onChange={(e) => setForm({ ...form, sampleType: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20 capitalize"
                  >
                    {Object.entries(SAMPLE_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Primary Container / Tube</label>
                  <select
                    value={form.container}
                    onChange={(e) => setForm({ ...form, container: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {Object.entries(CONTAINER_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Sample Volume</label>
                  <input
                    type="text"
                    value={form.volume}
                    onChange={(e) => setForm({ ...form, volume: e.target.value })}
                    placeholder="e.g. 4 mL"
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Integrity & Quality Check */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Visual Quality Check</label>
                  <select
                    value={form.integrity}
                    onChange={(e) => setForm({ ...form, integrity: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  >
                    {Object.entries(SPECIMEN_INTEGRITY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Triage Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                  >
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="STAT">STAT Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Temp / Storage Target</label>
                  <input
                    type="text"
                    value={form.temperatureCondition}
                    onChange={(e) => setForm({ ...form, temperatureCondition: e.target.value })}
                    placeholder="e.g. Refrigerated 2-8°C"
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Collectors & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Rack / Shelf Location</label>
                  <input
                    type="text"
                    value={form.storageLocation}
                    onChange={(e) => setForm({ ...form, storageLocation: e.target.value })}
                    placeholder="e.g. Rack B-12"
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Collector / Phlebotomist</label>
                  <input
                    type="text"
                    value={form.collectedBy}
                    onChange={(e) => setForm({ ...form, collectedBy: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Receiving Tech</label>
                  <input
                    type="text"
                    value={form.receivedBy}
                    onChange={(e) => setForm({ ...form, receivedBy: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Specimen Condition Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Patient verified with 2 identifiers. Clear golden serum. No clot observed."
                  className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowIntakeModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition"
                >
                  Confirm Accession & Sync Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Label Dialog */}
      {showBarcodeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowBarcodeModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full border border-slate-200 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 bg-slate-50">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>MEDICARE LAB</span>
                <span>{showBarcodeModal.priority}</span>
              </div>
              <p className="font-bold text-slate-900 text-base mt-2">{showBarcodeModal.patientName}</p>
              <p className="text-xs font-mono text-slate-500">ID: {showBarcodeModal.patientId}</p>

              {/* Barcode Visualizer */}
              <div className="my-4 py-2 bg-white rounded border border-slate-200">
                <div className="font-mono text-2xl tracking-[0.25em] font-black text-slate-900 select-all">
                  ||||| | |||| | ||| |||| |
                </div>
                <p className="font-mono text-xs font-bold text-slate-700 mt-1">{showBarcodeModal.barcode}</p>
              </div>

              <div className="text-left text-xs space-y-1 text-slate-600">
                <p>
                  <strong>Test:</strong> {showBarcodeModal.testName}
                </p>
                <p>
                  <strong>Tube:</strong> {CONTAINER_LABELS[showBarcodeModal.container] || showBarcodeModal.container}
                </p>
                <p>
                  <strong>Accessioned:</strong> {new Date(showBarcodeModal.createdAt || "").toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"
              >
                🖨️ Print Label
              </button>
              <button
                onClick={() => setShowBarcodeModal(null)}
                className="px-4 py-2 border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Specimen Detail Modal */}
      {selectedSpecimen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedSpecimen(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                    {selectedSpecimen.barcode}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{selectedSpecimen.id}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedSpecimen.testName}</h3>
              </div>
              <button
                onClick={() => setSelectedSpecimen(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-xs text-slate-400">Patient</span>
                  <p className="font-semibold text-slate-800">{selectedSpecimen.patientName}</p>
                  <p className="text-xs text-slate-500 font-mono">{selectedSpecimen.patientId}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Current Status</span>
                  <div className="mt-1">{getStatusBadge(selectedSpecimen.status)}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Sample & Container</span>
                  <p className="font-medium text-slate-700 capitalize">
                    {selectedSpecimen.sampleType} ({selectedSpecimen.volume})
                  </p>
                  <div className="mt-1">{getContainerBadge(selectedSpecimen.container)}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Quality Assessment</span>
                  <p
                    className={`font-semibold ${
                      selectedSpecimen.integrity === SPECIMEN_INTEGRITY.ADEQUATE
                        ? "text-emerald-700"
                        : "text-rose-600"
                    }`}
                  >
                    {SPECIMEN_INTEGRITY_LABELS[selectedSpecimen.integrity] || selectedSpecimen.integrity}
                  </p>
                  <p className="text-xs text-slate-500">{selectedSpecimen.temperatureCondition}</p>
                </div>
              </div>

              {/* Status Stepper Tracker */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Specimen Lifecycle Timeline
                </span>
                <div className="mt-4 flex items-center justify-between relative">
                  <div className="absolute top-3 left-4 right-4 h-0.5 bg-slate-200 -z-0" />
                  {[
                    { key: SPECIMEN_STATUS.COLLECTED, label: "Collected" },
                    { key: SPECIMEN_STATUS.RECEIVED, label: "Accessioned" },
                    { key: SPECIMEN_STATUS.PROCESSING, label: "Processing" },
                    { key: SPECIMEN_STATUS.ANALYZED, label: "Analyzed" },
                  ].map((step, idx) => {
                    const statusKeys = [
                      SPECIMEN_STATUS.COLLECTED,
                      SPECIMEN_STATUS.RECEIVED,
                      SPECIMEN_STATUS.PROCESSING,
                      SPECIMEN_STATUS.ANALYZED,
                    ];
                    const currentIdx = statusKeys.indexOf(selectedSpecimen.status);
                    const isDone = currentIdx >= idx;
                    const isCurrent = currentIdx === idx;
                    return (
                      <div key={step.key} className="flex flex-col items-center z-10">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCurrent
                              ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                              : isDone
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {isDone ? "✓" : idx + 1}
                        </div>
                        <span
                          className={`text-[11px] mt-1 font-medium ${
                            isCurrent ? "text-indigo-600 font-bold" : isDone ? "text-slate-800" : "text-slate-400"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedSpecimen.notes && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase">Technician Notes & Log</span>
                  <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{selectedSpecimen.notes}</p>
                </div>
              )}

              {selectedSpecimen.rejectionReason && (
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-rose-800 text-xs">
                  <span className="font-bold">Rejection Reason:</span> {selectedSpecimen.rejectionReason}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-slate-50 flex items-center justify-between rounded-b-2xl">
              <button
                onClick={() => setShowBarcodeModal(selectedSpecimen)}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50"
              >
                Barcode Label
              </button>

              <div className="flex gap-2">
                {selectedSpecimen.status !== SPECIMEN_STATUS.ANALYZED &&
                  selectedSpecimen.status !== SPECIMEN_STATUS.REJECTED && (
                    <button
                      onClick={() => {
                        const next =
                          selectedSpecimen.status === SPECIMEN_STATUS.COLLECTED
                            ? SPECIMEN_STATUS.RECEIVED
                            : selectedSpecimen.status === SPECIMEN_STATUS.RECEIVED
                            ? SPECIMEN_STATUS.PROCESSING
                            : SPECIMEN_STATUS.ANALYZED;
                        handleAdvanceStatus(selectedSpecimen, next);
                      }}
                      className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                    >
                      Advance to Next Stage
                    </button>
                  )}
                <button
                  onClick={() => setSelectedSpecimen(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Laboratory({ darkMode = false, initialTab = "specimen" }: { darkMode?: boolean; initialTab?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className={`min-h-screen ${darkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl border mb-6 bg-white border-slate-200 shadow-sm w-fit">
          <button
            onClick={() => setActiveTab("specimen")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === "specimen"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span>🩸</span>
            <span>Specimen Intake & Accessioning</span>
          </button>
          <button
            onClick={() => setActiveTab("table")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              activeTab === "table"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span>🔬</span>
            <span>Specimen Repository Table (useLabStore)</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "specimen" ? (
          <SpecimenIntakeSection darkMode={darkMode} />
        ) : (
          <div className="space-y-6">
            <SpecimenTable darkMode={darkMode} />
          </div>
        )}
      </div>
    </div>
  );
}

