// FILE PATH: src/pages/XRaySharingPage.jsx
// Day 7 — X-Ray / Medical Imaging Sharing | MediCare Pro
//
// Features:
//   - Upload X-Ray / scan images (stored as base64 in localStorage)
//   - View images in a lightbox
//   - Annotate with notes / diagnosis
//   - Filter by patient, body part, modality
//   - Delete records
//   - Share link (copies URL+ID to clipboard)
//   - Responsive grid layout

import { useState, useEffect, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "xray_images";

const MODALITIES = ["X-Ray", "MRI", "CT Scan", "Ultrasound", "PET Scan", "Mammography", "Other"];

const BODY_PARTS = [
  "Chest", "Abdomen", "Head / Brain", "Spine", "Pelvis",
  "Left Arm", "Right Arm", "Left Leg", "Right Leg",
  "Knee", "Shoulder", "Foot / Ankle", "Other",
];

const emptyForm = {
  imageId: "",
  patientName: "",
  patientId: "",
  modality: "X-Ray",
  bodyPart: "Chest",
  studyDate: "",
  requestedBy: "",
  diagnosis: "",
  notes: "",
  imageData: "", // base64
  fileName: "",
  fileSize: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() {
  return "IMG-" + Date.now().toString().slice(-8);
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  const colors = { success: "bg-green-500", error: "bg-red-500", warning: "bg-yellow-500" };
  return (
    <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg text-white shadow-lg flex items-center gap-3 ${colors[type] || "bg-gray-700"}`}>
      <span>{message}</span>
      <button onClick={onClose} className="font-bold text-xl leading-none">×</button>
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ record, onClose }) {
  if (!record) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={onClose}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="text-white">
          <p className="font-bold text-base">{record.patientName} — {record.modality}</p>
          <p className="text-gray-400 text-sm">{record.bodyPart} | {record.studyDate} | {record.imageId}</p>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white text-3xl leading-none">×</button>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {record.imageData ? (
          <img
            src={record.imageData}
            alt={`${record.modality} — ${record.bodyPart}`}
            className="max-w-full max-h-full object-contain rounded-lg select-none"
            style={{ filter: "brightness(1.05) contrast(1.1)" }}
          />
        ) : (
          <div className="text-gray-500 text-center">
            <p className="text-6xl mb-4">🩻</p>
            <p>No image available</p>
          </div>
        )}
      </div>

      {/* Bottom info */}
      {(record.diagnosis || record.notes) && (
        <div className="bg-gray-900 text-white px-6 py-4 shrink-0" onClick={(e) => e.stopPropagation()}>
          {record.diagnosis && (
            <p className="text-sm"><span className="text-gray-400 font-medium">Diagnosis: </span>{record.diagnosis}</p>
          )}
          {record.notes && (
            <p className="text-sm mt-1"><span className="text-gray-400 font-medium">Notes: </span>{record.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function XRaySharingPage() {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [lightboxRecord, setLightboxRecord] = useState(null);
  const [search, setSearch] = useState("");
  const [filterModality, setFilterModality] = useState("All");
  const [filterBodyPart, setFilterBodyPart] = useState("All");
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const fileInputRef = useRef(null);

  // Load
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setRecords(JSON.parse(saved)); } catch { setRecords([]); }
    }
  }, []);

  // Save — with localStorage size guard
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      setStorageWarning(false);
    } catch (e) {
      if (e.name === "QuotaExceededError") {
        setStorageWarning(true);
      }
    }
  }, [records]);

  function showToast(msg, type = "success") { setToast({ message: msg, type }); }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // ── File upload: convert to base64 ─────────────────────────────────────────

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Only allow images
    if (!file.type.startsWith("image/")) {
      showToast("Please upload an image file (JPEG, PNG, WEBP).", "error");
      return;
    }

    // Warn if file is very large (base64 in localStorage is limited)
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image is large (>2MB). It may fail to save in localStorage. Consider a smaller file.", "warning");
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm((prev) => ({
        ...prev,
        imageData: ev.target.result,
        fileName: file.name,
        fileSize: formatBytes(file.size),
      }));
      setUploading(false);
    };
    reader.onerror = () => {
      showToast("Failed to read image file.", "error");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  function openAddForm() {
    setForm({ ...emptyForm, imageId: genId(), studyDate: today() });
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(record) {
    setForm(record);
    setEditingId(record.imageId);
    setShowForm(true);
  }

  function closeForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function validate() {
    if (!form.patientName.trim()) return "Patient Name is required.";
    if (!form.studyDate) return "Study Date is required.";
    return null;
  }

  function handleSubmit() {
    const error = validate();
    if (error) { showToast(error, "error"); return; }

    if (editingId) {
      setRecords((prev) => prev.map((r) => r.imageId === editingId ? { ...form } : r));
      showToast("Record updated.", "success");
    } else {
      setRecords((prev) => [{ ...form }, ...prev]);
      showToast("Image uploaded and saved.", "success");
    }
    closeForm();
  }

  function handleDelete(imageId) {
    if (!window.confirm("Delete this imaging record and its image? This cannot be undone.")) return;
    setRecords((prev) => prev.filter((r) => r.imageId !== imageId));
    showToast("Record deleted.", "warning");
  }

  function handleShare(record) {
    const shareText = `MediCare Pro — Imaging Record\nID: ${record.imageId}\nPatient: ${record.patientName}\nModality: ${record.modality} (${record.bodyPart})\nDate: ${record.studyDate}`;
    navigator.clipboard.writeText(shareText)
      .then(() => showToast("Record details copied to clipboard.", "success"))
      .catch(() => showToast("Could not copy to clipboard.", "error"));
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = records.filter((r) => {
    const term = search.toLowerCase();
    const matchSearch =
      r.patientName.toLowerCase().includes(term) ||
      r.imageId.toLowerCase().includes(term) ||
      (r.requestedBy || "").toLowerCase().includes(term);
    const matchModality = filterModality === "All" || r.modality === filterModality;
    const matchBody = filterBodyPart === "All" || r.bodyPart === filterBodyPart;
    return matchSearch && matchModality && matchBody;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🩻 X-Ray & Imaging</h1>
          <p className="text-sm text-gray-500 mt-1">Upload, store, and share medical imaging records.</p>
        </div>
        <button onClick={openAddForm}
          className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-5 py-2.5 rounded-lg transition shadow">
          + Upload Image
        </button>
      </div>

      {/* Storage Warning */}
      {storageWarning && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded mb-4 text-sm">
          ⚠️ <strong>Storage full!</strong> Browser localStorage is at capacity. Please delete old images before adding new ones.
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Images", value: records.length, icon: "🗂️", color: "blue" },
          { label: "X-Rays", value: records.filter((r) => r.modality === "X-Ray").length, icon: "🩻", color: "indigo" },
          { label: "MRI Scans", value: records.filter((r) => r.modality === "MRI").length, icon: "🧲", color: "purple" },
          { label: "CT Scans", value: records.filter((r) => r.modality === "CT Scan").length, icon: "💿", color: "teal" },
        ].map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
        <input type="text" placeholder="Search patient, image ID, doctor…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400" />
        <select value={filterModality} onChange={(e) => setFilterModality(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
          <option value="All">All Modalities</option>
          {MODALITIES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filterBodyPart} onChange={(e) => setFilterBodyPart(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
          <option value="All">All Body Parts</option>
          {BODY_PARTS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Image Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
          <p className="text-5xl mb-3">🩻</p>
          <p className="text-base font-medium">No imaging records found.</p>
          <p className="text-sm mt-1">Click "Upload Image" to add the first record.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((record) => (
            <ImageCard
              key={record.imageId}
              record={record}
              onView={() => setLightboxRecord(record)}
              onEdit={() => openEditForm(record)}
              onDelete={() => handleDelete(record.imageId)}
              onShare={() => handleShare(record)}
            />
          ))}
        </div>
      )}

      {/* Showing count */}
      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 mt-4">Showing {filtered.length} of {records.length} record(s)</p>
      )}

      {/* Upload / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={closeForm}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">{editingId ? "✏️ Edit Record" : "⬆️ Upload New Image"}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Image upload area */}
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Image File * <span className="text-gray-400 font-normal">(JPEG, PNG, WEBP — max ~2MB for localStorage)</span>
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 hover:border-sky-400 rounded-xl p-6 text-center cursor-pointer transition"
                  >
                    {form.imageData ? (
                      <div>
                        <img src={form.imageData} alt="Preview" className="max-h-40 mx-auto object-contain rounded-lg mb-2" />
                        <p className="text-sm text-gray-600">{form.fileName} ({form.fileSize})</p>
                        <p className="text-xs text-sky-500 mt-1">Click to change image</p>
                      </div>
                    ) : (
                      <div>
                        {uploading
                          ? <p className="text-gray-500">Loading image…</p>
                          : <>
                              <p className="text-4xl mb-2">📁</p>
                              <p className="text-sm text-gray-500">Click to browse, or drag & drop</p>
                            </>
                        }
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>
              )}

              {/* Form fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <LabeledField label="Image ID" name="imageId" value={form.imageId} disabled />
                <LabeledField label="Patient Name *" name="patientName" value={form.patientName} onChange={handleChange} placeholder="Full name" />
                <LabeledField label="Patient ID" name="patientId" value={form.patientId} onChange={handleChange} placeholder="e.g. PAT-001" />
                <LabeledSelect label="Modality" name="modality" value={form.modality} onChange={handleChange} options={MODALITIES} />
                <LabeledSelect label="Body Part" name="bodyPart" value={form.bodyPart} onChange={handleChange} options={BODY_PARTS} />
                <LabeledField label="Study Date *" name="studyDate" value={form.studyDate} onChange={handleChange} type="date" />
                <LabeledField label="Requested By (Doctor)" name="requestedBy" value={form.requestedBy} onChange={handleChange} placeholder="Dr. Name" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Diagnosis / Findings</label>
                <textarea name="diagnosis" value={form.diagnosis} onChange={handleChange} rows={2}
                  placeholder="e.g. No acute cardiopulmonary process identified…"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Additional Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
                  placeholder="Any additional clinical notes…"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
              <button onClick={closeForm} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium transition">Cancel</button>
              <button onClick={handleSubmit} className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition shadow">
                {editingId ? "Save Changes" : "Upload Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxRecord && <Lightbox record={lightboxRecord} onClose={() => setLightboxRecord(null)} />}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Image Card ───────────────────────────────────────────────────────────────

function ImageCard({ record, onView, onEdit, onDelete, onShare }) {
  return (
    <div className="bg-white rounded-xl shadow hover:shadow-md transition overflow-hidden group">
      {/* Thumbnail */}
      <div
        onClick={onView}
        className="relative bg-gray-900 cursor-pointer overflow-hidden"
        style={{ aspectRatio: "4/3" }}
      >
        {record.imageData ? (
          <img
            src={record.imageData}
            alt={`${record.modality} — ${record.bodyPart}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            style={{ filter: "brightness(0.95) contrast(1.1)" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <span className="text-5xl">🩻</span>
          </div>
        )}
        {/* Modality badge */}
        <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
          {record.modality}
        </span>
        {/* View overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-semibold">
            🔍 View
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-3">
        <p className="font-semibold text-gray-800 text-sm truncate">{record.patientName}</p>
        <p className="text-xs text-gray-500 mt-0.5">{record.bodyPart} | {record.studyDate}</p>
        {record.diagnosis && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{record.diagnosis}</p>
        )}
        <p className="text-xs text-gray-300 mt-1 font-mono">{record.imageId}</p>

        {/* Actions */}
        <div className="flex gap-1 mt-3 flex-wrap">
          <button onClick={onView}
            className="flex-1 text-sky-600 hover:text-sky-800 text-xs font-medium border border-sky-200 hover:border-sky-400 px-2 py-1 rounded transition">
            View
          </button>
          <button onClick={onShare}
            className="text-purple-600 hover:text-purple-800 text-xs font-medium border border-purple-200 px-2 py-1 rounded transition">
            Share
          </button>
          <button onClick={onEdit}
            className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 px-2 py-1 rounded transition">
            Edit
          </button>
          <button onClick={onDelete}
            className="text-red-500 hover:text-red-700 text-xs font-medium border border-red-200 px-2 py-1 rounded transition">
            Del
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    teal: "bg-teal-50 text-teal-700 border-teal-200",
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

function LabeledField({ label, name, value, onChange, type = "text", placeholder, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} disabled={disabled}
        className={`border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 ${disabled ? "bg-gray-100 cursor-not-allowed text-gray-500" : ""}`} />
    </div>
  );
}

function LabeledSelect({ label, name, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select name={name} value={value} onChange={onChange}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}