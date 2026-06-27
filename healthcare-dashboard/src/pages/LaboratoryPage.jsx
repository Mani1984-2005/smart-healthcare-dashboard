// FILE PATH: src/pages/LaboratoryPage.jsx
// Day 2 — Laboratory Module | MediCare Pro
// Features: Test requests, results entry, status tracking, search/filter, LocalStorage

import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "lab_tests";
const PATIENTS_KEY = "patients";

const TEST_CATEGORIES = [
  "Blood Test",
  "Urine Test",
  "X-Ray",
  "MRI",
  "CT Scan",
  "ECG",
  "Ultrasound",
  "Biopsy",
  "Culture & Sensitivity",
  "Other",
];

const STATUS_OPTIONS = ["Pending", "In Progress", "Completed", "Cancelled"];

const PRIORITY_OPTIONS = ["Routine", "Urgent", "Emergency"];
const LAB_TEST_PROFILES = {
  CBC: [
    "Hemoglobin",
    "WBC",
    "Platelets",
  ],
  "Blood Sugar": [
    "Blood Sugar Fasting",
  ],
};
const LAB_TEST_REFERENCES = {
  Hemoglobin: {
    unit: "g/dL",
    min: 13,
    max: 17,
    lowText: "Hemoglobin is lower than normal. Possible anemia. Doctor review recommended.",
    highText: "Hemoglobin is higher than normal. Doctor review recommended.",
  },
  WBC: {
    unit: "cells/µL",
    min: 4000,
    max: 11000,
    lowText: "WBC is lower than normal. Immunity-related review may be needed.",
    highText: "WBC is higher than normal. Infection or inflammation should be checked.",
  },
  Platelets: {
    unit: "lakh/µL",
    min: 1.5,
    max: 4.5,
    lowText: "Platelets are lower than normal. Bleeding risk review recommended.",
    highText: "Platelets are higher than normal. Doctor review recommended.",
  },
  "Blood Sugar Fasting": {
    unit: "mg/dL",
    min: 70,
    max: 99,
    lowText: "Sugar level is lower than normal.",
    highText: "Sugar level is higher than normal. Diabetes screening may be needed.",
  },
};
const emptyForm = {
  testId: "",
  patientName: "",
  patientId: "",
  testName: "",
  category: "",
  priority: "Routine",
  requestedBy: "",
  requestDate: "",
  resultDate: "",
  status: "Pending",
  result: "",
  profileResults: {},
  resultStatus: "",
  referenceRange: "",
  interpretation: "",
  notes: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() {
  return "LAB-" + Date.now().toString().slice(-6);
}

function today() {
  return new Date().toISOString().split("T")[0];
}
function judgeLabResult(testName, value) {
  const ref = LAB_TEST_REFERENCES[testName];
  const num = Number(value);

  if (!ref || value === "" || Number.isNaN(num)) {
    return {
      status: "Manual Review",
      unit: "",
      referenceRange: "Not available",
      interpretation: "Reference range not available. Doctor/lab review required.",
    };
  }

  if (num < ref.min) {
    return {
      status: "Low",
      unit: ref.unit,
      referenceRange: `${ref.min} - ${ref.max} ${ref.unit}`,
      interpretation: ref.lowText,
    };
  }

  if (num > ref.max) {
    return {
      status: "High",
      unit: ref.unit,
      referenceRange: `${ref.min} - ${ref.max} ${ref.unit}`,
      interpretation: ref.highText,
    };
  }

  return {
    status: "Normal",
    unit: ref.unit,
    referenceRange: `${ref.min} - ${ref.max} ${ref.unit}`,
    interpretation: "Result is within normal reference range.",
  };
}

function readArrayFromStorage(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function dispatchPatientsUpdate() {
  window.dispatchEvent(new Event("patientsUpdated"));
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
  };

  return (
    <div
      className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg text-white shadow-lg flex items-center gap-3 ${
        colors[type] || "bg-gray-700"
      }`}
    >
      <span>{message}</span>
      <button onClick={onClose} className="font-bold text-xl leading-none">
        ×
      </button>
    </div>
  );
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

function downloadLabReportPDF(test) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text("MediCare Pro", 20, 20);

  doc.setFontSize(14);
  doc.text("Laboratory Report", 20, 35);

  doc.line(20, 40, 190, 40);

  doc.setFontSize(11);

  doc.text(`Report ID: ${test.testId}`, 20, 55);
  doc.text(`Patient Name: ${test.patientName}`, 20, 65);
  doc.text(`Patient ID: ${test.patientId || "-"}`, 20, 75);
  doc.text(`Test Name: ${test.testName}`, 20, 85);
  doc.text(`Category: ${test.category}`, 20, 95);
  doc.text(`Priority: ${test.priority}`, 20, 105);
  doc.text(`Doctor: Dr. ${test.requestedBy}`, 20, 115);
  doc.text(`Request Date: ${test.requestDate}`, 20, 125);
  doc.text(`Result Date: ${test.resultDate || "-"}`, 20, 135);
  doc.text(`Status: ${test.status}`, 20, 145);

  doc.line(20, 155, 190, 155);

  doc.setFontSize(12);
  doc.text("Result", 20, 170);

  doc.setFontSize(10);
  const resultLines = doc.splitTextToSize(test.result || "No result entered.", 165);
  doc.text(resultLines, 20, 182);

  if (test.notes) {
    const noteLines = doc.splitTextToSize(`Notes: ${test.notes}`, 165);
    doc.text(noteLines, 20, 210);
  }

  doc.save(`${test.testId}_lab_report.pdf`);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LaboratoryPage() {
  const [tests, setTests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [toast, setToast] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [viewingTest, setViewingTest] = useState(null);

  // Load lab tests and patients
  useEffect(() => {
    setTests(readArrayFromStorage(STORAGE_KEY));
    setPatients(readArrayFromStorage(PATIENTS_KEY));
    setIsLoaded(true);
  }, []);

  // Keep patient dropdown fresh when PatientsPage updates localStorage
  useEffect(() => {
    const loadPatients = () => setPatients(readArrayFromStorage(PATIENTS_KEY));

    window.addEventListener("patientsUpdated", loadPatients);
    window.addEventListener("storage", loadPatients);

    return () => {
      window.removeEventListener("patientsUpdated", loadPatients);
      window.removeEventListener("storage", loadPatients);
    };
  }, []);

  // Save lab tests
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
    }
  }, [tests, isLoaded]);

  function showToast(message, type = "success") {
    setToast({ message, type });
  }
function handleChange(e) {
  const { name, value } = e.target;

  setForm((prev) => {
    const updated = { ...prev, [name]: value };

    if (name === "testName" || name === "result") {
      const judgement = judgeLabResult(
        name === "testName" ? value : updated.testName,
        name === "result" ? value : updated.result
      );

      updated.resultStatus = judgement.status;
      updated.referenceRange = judgement.referenceRange;
      updated.interpretation = judgement.interpretation;
    }
    return updated;
  });
}
    function handleProfileResultChange(testName, value) {
  const judgement = judgeLabResult(testName, value);

  setForm((prev) => ({
    ...prev,
    profileResults: {
      ...prev.profileResults,
      [testName]: {
        value,
        status: judgement.status,
        referenceRange: judgement.referenceRange,
        interpretation: judgement.interpretation,
      },
    },
  }));
}

  function openAddForm() {
    setForm({ ...emptyForm, testId: genId(), requestDate: today() });
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(test) {
    setForm({ ...emptyForm, ...test });
    setEditingId(test.testId);
    setShowForm(true);
  }

  function closeForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  function validate() {
    if (!form.patientId) return "Please select a patient.";
    if (!form.patientName.trim()) return "Patient Name is required.";
    if (!form.testName.trim()) return "Test Name is required.";
    if (!form.category) return "Category is required.";
    if (!form.requestedBy.trim()) return "Requested By is required.";
    if (!form.requestDate) return "Request Date is required.";
    return null;
  }

  function syncLabEventToPatientTimeline(test) {
    const savedPatients = readArrayFromStorage(PATIENTS_KEY);

    const updatedPatients = savedPatients.map((patient) => {
      const isSamePatient =
        patient.id === test.patientId ||
        patient.name?.toLowerCase() === test.patientName?.toLowerCase();

      if (!isSamePatient) return patient;

      const timeline = patient.timeline || [];
      const timelineEvent = {
        id: `TL-${test.testId}`,
        labTestId: test.testId,
        date: test.resultDate || test.requestDate || today(),
        type: "Lab Test",
        title: `${test.testName} - ${test.status}`,
        details: `Lab test ${test.testId} - ${test.category}. Priority: ${test.priority}. Status: ${test.status}.`,
      };

      const alreadyExists = timeline.some(
        (event) => event.labTestId === test.testId || event.id === `TL-${test.testId}`
      );

      return {
        ...patient,
        status: test.status === "Completed" ? patient.status : "Lab Test",
        timeline: alreadyExists
          ? timeline.map((event) =>
              event.labTestId === test.testId || event.id === `TL-${test.testId}`
                ? { ...event, ...timelineEvent }
                : event
            )
          : [...timeline, timelineEvent],
      };
    });

    localStorage.setItem(PATIENTS_KEY, JSON.stringify(updatedPatients));
    setPatients(updatedPatients);
    dispatchPatientsUpdate();
  }

  function handleSubmit() {
    const error = validate();
    if (error) {
      showToast(error, "error");
      return;
    }

    const savedTest = {
      ...form,
      resultDate:
        form.status === "Completed" && !form.resultDate ? today() : form.resultDate,
    };

    if (editingId) {
      setTests((prev) =>
        prev.map((test) => (test.testId === editingId ? savedTest : test))
      );
      syncLabEventToPatientTimeline(savedTest);
      showToast("Lab test updated and patient timeline synced.", "success");
    } else {
      setTests((prev) => [savedTest, ...prev]);
      syncLabEventToPatientTimeline(savedTest);
      showToast("Lab test added and patient timeline synced.", "success");
    }

    closeForm();
  }

  function handleDelete(testId) {
    if (!window.confirm("Delete this lab test record?")) return;
    setTests((prev) => prev.filter((test) => test.testId !== testId));
    showToast("Record deleted.", "warning");
  }

  function updateStatus(testId, newStatus) {
    setTests((prev) =>
      prev.map((test) => {
        if (test.testId !== testId) return test;

        const updatedTest = {
          ...test,
          status: newStatus,
          resultDate: newStatus === "Completed" ? today() : test.resultDate,
        };

        syncLabEventToPatientTimeline(updatedTest);
        return updatedTest;
      })
    );

    showToast(`Status updated to ${newStatus}.`, "success");
  }

  const filtered = tests.filter((test) => {
    const term = search.toLowerCase();

    const matchSearch =
      test.patientName?.toLowerCase().includes(term) ||
      test.testName?.toLowerCase().includes(term) ||
      test.testId?.toLowerCase().includes(term) ||
      test.requestedBy?.toLowerCase().includes(term);

    const matchCat = filterCategory === "All" || test.category === filterCategory;
    const matchStatus = filterStatus === "All" || test.status === filterStatus;
    const matchPriority = filterPriority === "All" || test.priority === filterPriority;

    return matchSearch && matchCat && matchStatus && matchPriority;
  });

  const pending = tests.filter((test) => test.status === "Pending").length;
  const inProgress = tests.filter((test) => test.status === "In Progress").length;
  const completed = tests.filter((test) => test.status === "Completed").length;
  const emergency = tests.filter((test) => test.priority === "Emergency").length;

  const statusColor = {
    Pending: "bg-yellow-100 text-yellow-700",
    "In Progress": "bg-blue-100 text-blue-700",
    Completed: "bg-green-100 text-green-700",
    Cancelled: "bg-gray-100 text-gray-500",
  };

  const priorityColor = {
    Routine: "bg-gray-100 text-gray-600",
    Urgent: "bg-orange-100 text-orange-700",
    Emergency: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🔬 Laboratory</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage lab test requests and results.
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg transition shadow"
        >
          + New Test Request
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Pending", value: pending, color: "yellow", icon: "⏳" },
          { label: "In Progress", value: inProgress, color: "blue", icon: "🔄" },
          { label: "Completed", value: completed, color: "green", icon: "✅" },
          { label: "Emergency", value: emergency, color: "red", icon: "🚨" },
        ].map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      {/* Emergency Alert */}
      {emergency > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded mb-4 text-sm">
          🚨 {emergency} emergency test(s) require immediate attention!
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
        <input
          type="text"
          placeholder="Search patient, test, doctor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="All">All Categories</option>
          {TEST_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="All">All Statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="All">All Priorities</option>
          {PRIORITY_OPTIONS.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Test ID</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Test</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Requested By</th>
              <th className="px-4 py-3">Request Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  No lab tests found. Click "+ New Test Request" to add one.
                </td>
              </tr>
            ) : (
              filtered.map((test) => (
                <tr
                  key={test.testId}
                  className={
                    test.priority === "Emergency" ? "bg-red-50" : "hover:bg-gray-50"
                  }
                >
                  <td className="px-4 py-3 font-mono text-gray-500 text-xs">
                    {test.testId}
                  </td>

                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{test.patientName}</p>
                    <p className="text-xs text-gray-400">{test.patientId}</p>
                  </td>

                  <td className="px-4 py-3 font-medium text-gray-700">
                    {test.testName}
                  </td>

                  <td className="px-4 py-3 text-gray-600">{test.category}</td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        priorityColor[test.priority]
                      }`}
                    >
                      {test.priority}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-gray-600">Dr. {test.requestedBy}</td>

                  <td className="px-4 py-3 text-gray-500">{test.requestDate}</td>

                  <td className="px-4 py-3">
                    <select
                      value={test.status}
                      onChange={(e) => updateStatus(test.testId, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${
                        statusColor[test.status]
                      }`}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setViewingTest(test)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-medium border border-indigo-200 hover:border-indigo-400 px-2 py-1 rounded transition"
                      >
                        View
                      </button>

                      <button
                        onClick={() => openEditForm(test)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 px-2 py-1 rounded transition"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => downloadLabReportPDF(test)}
                        className="text-green-600 hover:text-green-800 text-xs font-medium border border-green-200 px-2 py-1 rounded transition"
                      >
                        PDF
                      </button>

                      <button
                        onClick={() => handleDelete(test.testId)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium border border-red-200 px-2 py-1 rounded transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {filtered.length > 0 && (
          <div className="px-4 py-2 text-xs text-gray-400 border-t">
            Showing {filtered.length} of {tests.length} test(s)
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
          onClick={closeForm}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">
                {editingId ? "✏️ Edit Lab Test" : "➕ New Test Request"}
              </h2>
              <button
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LabeledField label="Test ID" name="testId" value={form.testId} disabled />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Patient *</label>
                <select
                  value={form.patientId}
                  onChange={(e) => {
                    const patient = patients.find((p) => p.id === e.target.value);

                    setForm((prev) => ({
                      ...prev,
                      patientId: patient?.id || "",
                      patientName: patient?.name || "",
                    }));
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">Select Patient</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.id} - {patient.name}
                    </option>
                  ))}
                </select>
              </div>

              <LabeledField
                label="Patient ID"
                name="patientId"
                value={form.patientId}
                disabled
              />

              <LabeledSelect
                label="Lab Profile *"
                name="testName"
                value={form.testName}
                onChange={handleChange}
                options={Object.keys(LAB_TEST_PROFILES)}
                placeholder="Select Lab Profile..."
              />

              {form.testName && LAB_TEST_PROFILES[form.testName] && (
                <div className="sm:col-span-2 rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <p className="text-sm font-semibold text-blue-800 mb-2">
                    Tests Included
                  </p>

                  <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                    {LAB_TEST_PROFILES[form.testName].map((test) => (
                      <li key={test}>{test}</li>
                    ))}
                  </ul>
                </div>
              )}

              {form.testName && LAB_TEST_PROFILES[form.testName] && (
                <div className="sm:col-span-2 space-y-4">
                  <h3 className="font-semibold text-gray-800">
                    Enter Test Values
                  </h3>

                  {LAB_TEST_PROFILES[form.testName].map((test) => {
                    const result = form.profileResults?.[test] || {};

                    return (
                      <div key={test} className="border rounded-lg p-3 bg-gray-50">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {test}
                        </label>

                        <input
                          type="number"
                          value={result.value || ""}
                          onChange={(e) =>
                            handleProfileResultChange(test, e.target.value)
                          }
                          placeholder={`Enter ${test} value`}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />

                        {result.status && (
                          <div className="mt-2 text-sm">
                            <strong>Status:</strong>{" "}
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-bold ${
                                result.status === "Normal"
                                  ? "bg-green-100 text-green-700"
                                  : result.status === "Low"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : result.status === "High"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {result.status}
                            </span>
                          </div>
                        )}

                        {result.referenceRange && (
                          <p className="mt-2 text-xs text-gray-600">
                            <strong>Reference:</strong> {result.referenceRange}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <LabeledSelect
                label="Category *"
                name="category"
                value={form.category}
                onChange={handleChange}
                options={TEST_CATEGORIES}
                placeholder="Select category…"
              />

              <LabeledSelect
                label="Priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                options={PRIORITY_OPTIONS}
              />

              <LabeledField
                label="Requested By (Doctor) *"
                name="requestedBy"
                value={form.requestedBy}
                onChange={handleChange}
                placeholder="Doctor name"
              />

              <LabeledField
                label="Request Date *"
                name="requestDate"
                value={form.requestDate}
                onChange={handleChange}
                type="date"
              />

              <LabeledField
                label="Result Date"
                name="resultDate"
                value={form.resultDate}
                onChange={handleChange}
                type="date"
              />

              <LabeledSelect
                label="Status"
                name="status"
                value={form.status}
                onChange={handleChange}
                options={STATUS_OPTIONS}
              />

              {!LAB_TEST_PROFILES[form.testName] && (
                <div className="sm:col-span-2 flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-700">
                    Result Value
                  </label>

                  <input
                    type="number"
                    name="result"
                    value={form.result}
                    onChange={handleChange}
                    placeholder="Enter numeric value"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  {form.result !== "" && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">Auto Result:</span>

                        <span
                          className={`px-3 py-1 rounded-full text-white text-xs font-bold ${
                            form.resultStatus === "Normal"
                              ? "bg-green-600"
                              : form.resultStatus === "Low"
                              ? "bg-yellow-500"
                              : form.resultStatus === "High"
                              ? "bg-red-600"
                              : "bg-gray-500"
                          }`}
                        >
                          {form.resultStatus}
                        </span>
                      </div>

                      <p>
                        <strong>Reference Range:</strong>{" "}
                        {form.referenceRange}
                      </p>

                      <p className="mt-2">
                        <strong>Interpretation:</strong>{" "}
                        {form.interpretation}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Notes
                </label>

                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Any additional notes…"
                  rows={2}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={closeForm}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium transition"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow"
              >
                {editingId ? "Save Changes" : "Add Test"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Result Modal */}
      {viewingTest && (
        <div
          className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setViewingTest(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">🧾 Test Result</h2>
              <button
                onClick={() => setViewingTest(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5 space-y-3 text-sm">
              {[
                ["Test ID", viewingTest.testId],
                ["Patient", viewingTest.patientName],
                ["Test", viewingTest.testName],
                ["Category", viewingTest.category],
                ["Priority", viewingTest.priority],
                ["Requested By", `Dr. ${viewingTest.requestedBy}`],
                ["Request Date", viewingTest.requestDate],
                ["Result Date", viewingTest.resultDate || "—"],
                ["Status", viewingTest.status],
              ].map(([key, value]) => (
                <div key={key} className="flex justify-between border-b pb-2">
                  <span className="text-gray-500 font-medium">{key}</span>
                  <span className="text-gray-800 text-right max-w-[60%]">
                    {value}
                  </span>
                </div>
              ))}

              {viewingTest.profileResults &&
              Object.keys(viewingTest.profileResults).length > 0 ? (
                <div>
                  <p className="text-gray-500 font-medium mb-2">Profile Results</p>

                  <div className="space-y-2">
                    {Object.entries(viewingTest.profileResults).map(
                      ([testName, result]) => (
                        <div
                          key={testName}
                          className="bg-gray-50 rounded-lg p-3 text-gray-700"
                        >
                          <div className="flex justify-between gap-3">
                            <strong>{testName}</strong>
                            <span>{result.value || "—"}</span>
                          </div>
                          <p className="text-xs mt-1">
                            Status: {result.status || "Manual Review"}
                          </p>
                          <p className="text-xs">
                            Reference: {result.referenceRange || "Not available"}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-500 font-medium mb-1">Result</p>
                  <p className="bg-gray-50 rounded-lg p-3 text-gray-700 whitespace-pre-wrap">
                    {viewingTest.result || "No result entered yet."}
                  </p>
                </div>
              )}

              {viewingTest.notes && (
                <div>
                  <p className="text-gray-500 font-medium mb-1">Notes</p>
                  <p className="bg-gray-50 rounded-lg p-3 text-gray-700 whitespace-pre-wrap">
                    {viewingTest.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t text-right">
              <button
                onClick={() => setViewingTest(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

// ─── Shared small components ──────────────────────────────────────────────────

function SummaryCard({ label, value, color, icon }) {
  const colorMap = {
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colorMap[color]}`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        <p className="text-xs font-medium opacity-80">{label}</p>
      </div>
    </div>
  );
}

function LabeledField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
          disabled ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""
        }`}
      />
    </div>
  );
}

function LabeledSelect({ label, name, value, onChange, options, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
