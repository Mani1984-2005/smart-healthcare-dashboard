// FILE PATH: src/pages/PrescriptionOcrPage.jsx
//
// PaddleOCR prescription document intake + machine-extracted text review.
//
// IMPORTANT SAFETY RULES ENFORCED HERE:
//  - Every result is labelled as machine-extracted / AI-extracted data.
//  - Mandatory warning is always visible: AI-extracted prescription
//    information must be reviewed and verified by a qualified healthcare
//    professional before clinical use.
//  - This page NEVER creates or modifies prescriptions, patients or any
//    clinical record — OCR output is stored as an isolated upload document
//    with its own audit trail.
//  - The original document is fetched through an access-gated API route
//    (never a public static /uploads URL).

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  ExternalLink,
  FileText,
  RefreshCw,
  ScanLine,
  Trash2,
  Upload,
} from "lucide-react";

import { PageHeader, Button, EmptyState } from "../components/ui";
import {
  OCR_UPLOAD_SOURCES,
  OCR_MAX_FILE_SIZE_MB,
  validateUploadFile,
  deriveUploadSource,
  uploadPrescriptionOcr,
  fetchPrescriptionUploads,
  fetchPrescriptionUploadAudit,
  deletePrescriptionUpload,
  prescriptionDocumentUrl,
} from "../api/prescriptionUploads";

const MANDATORY_WARNING =
  "AI-extracted prescription information must be reviewed and verified by a qualified healthcare professional before clinical use.";

const STATUS_STYLES = {
  uploaded: "bg-slate-100 text-slate-700 border-slate-200",
  preprocessing: "bg-amber-50 text-amber-700 border-amber-200",
  ocr_running: "bg-blue-50 text-blue-700 border-blue-200",
  ocr_complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ocr_failed: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABELS = {
  uploaded: "Uploaded",
  preprocessing: "Preprocessing",
  ocr_running: "OCR running",
  ocr_complete: "OCR complete",
  ocr_failed: "OCR failed",
};

// apiClient throws { message, status, data } (see src/api/client.js).
function apiErrorMessage(err, fallback) {
  return err?.data?.error?.message || err?.message || fallback;
}

function StatusPill({ status }) {
  const cls = STATUS_STYLES[status] || "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium ${cls}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function PrescriptionOcrPage({ addToast }) {
  const [file, setFile] = useState(null);
  const [uploadSource, setUploadSource] = useState("image");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState("");
  const [uploads, setUploads] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [auditEntries, setAuditEntries] = useState([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const fileInputRef = useRef(null);

  const loadList = useCallback(async (targetPage = page) => {
    setIsLoadingList(true);
    try {
      const res = await fetchPrescriptionUploads({ page: targetPage, limit: 10 });
      setUploads(res.data || []);
      setTotal(res.pagination?.total || 0);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      addToast?.("Could not load uploads", apiErrorMessage(err, "Request failed."), "error");
    } finally {
      setIsLoadingList(false);
    }
  }, [page, addToast]);

  useEffect(() => {
    loadList(1);
  }, []);

  function selectFile(nextFile) {
    setLocalError("");
    if (!nextFile) return;

    const source = deriveUploadSource(nextFile);
    const check = validateUploadFile(nextFile, { uploadSource: source });
    if (!check.ok) {
      setFile(null);
      setLocalError(check.error);
      return;
    }
    setFile(nextFile);
    setUploadSource(source);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    selectFile(e.dataTransfer.files?.[0]);
  }

  function handleChange(e) {
    selectFile(e.target.files?.[0]);
    e.target.value = "";
  }

  async function handleUpload() {
    const check = validateUploadFile(file, { uploadSource });
    if (!check.ok) {
      setLocalError(check.error);
      return;
    }

    setIsUploading(true);
    setLocalError("");
    try {
      const result = await uploadPrescriptionOcr(file, { uploadSource });
      setFile(null);
      addToast?.(
        "Document processed",
        result.status === "ocr_complete"
          ? "Machine-extracted text is ready for review."
          : result.status === "ocr_failed"
            ? `OCR failed: ${result.errorMessage || "unknown error"}`
            : "Upload recorded.",
        result.status === "ocr_failed" ? "error" : "success"
      );
      setPage(1);
      await loadList(1);
      setSelectedId(result.id);
      loadAudit(result.id);
    } catch (err) {
      const apiMessage = apiErrorMessage(err, "Upload failed.");
      setLocalError(apiMessage);
      addToast?.("Upload failed", apiMessage, "error");
    } finally {
      setIsUploading(false);
    }
  }

  async function loadAudit(id) {
    setIsLoadingAudit(true);
    setAuditEntries([]);
    try {
      setAuditEntries(await fetchPrescriptionUploadAudit(id));
    } catch {
      setAuditEntries([]);
    } finally {
      setIsLoadingAudit(false);
    }
  }

  function handleSelect(id) {
    setSelectedId(id);
    loadAudit(id);
  }

  async function handleDelete(id) {
    try {
      await deletePrescriptionUpload(id);
      addToast?.("Upload deleted", "The record was soft-deleted (files retained).", "success");
      if (selectedId === id) {
        setSelectedId(null);
        setAuditEntries([]);
      }
      await loadList(page);
    } catch (err) {
      const apiMessage = apiErrorMessage(err, "Delete failed.");
      addToast?.("Delete failed", apiMessage, "error");
    }
  }

  const selected = uploads.find((u) => u.id === selectedId) || null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prescription OCR"
        subtitle="Upload prescription documents for machine text extraction and review"
        icon={<ScanLine size={22} />}
      />

      {/* Mandatory safety warning — always visible */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800">
        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold mb-1">{MANDATORY_WARNING}</p>
          <p>
            Extracted values below are <strong>machine-extracted (AI OCR) output</strong> and may
            contain errors. They do not constitute a prescription, and no clinical record is created
            from an upload.
          </p>
        </div>
      </div>

      {/* Upload panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <Upload size={18} /> Upload document
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          JPG, PNG, WEBP or PDF — up to {OCR_MAX_FILE_SIZE_MB} MB. Documents are stored privately
          and are never exposed through a public URL.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
            isDragging
              ? "border-indigo-500 bg-indigo-50"
              : localError
                ? "border-red-300 bg-red-50"
                : "border-slate-300 bg-slate-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Select prescription document"
          />
          <FileText size={32} className="mx-auto text-slate-400 mb-3" />
          {file ? (
            <p className="text-sm text-slate-700">
              <span className="font-semibold">{file.name}</span> ({(file.size / 1024).toFixed(0)} KB)
              — source: <span className="font-medium">{uploadSource}</span>
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              Drag & drop a prescription document here, or{" "}
              <span className="text-indigo-600 font-medium">browse files</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <label className="text-sm text-slate-600">Upload source</label>
          <select
            value={uploadSource}
            onChange={(e) => setUploadSource(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
            disabled={file?.type === "application/pdf"}
          >
            {OCR_UPLOAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <div className="flex-1" />

          <Button onClick={handleUpload} disabled={!file || isUploading} loading={isUploading}>
            {isUploading ? "Processing…" : "Upload & Extract Text"}
          </Button>
        </div>

        {localError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {localError}
          </p>
        )}
      </div>

      {/* History + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-soft p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <ClipboardList size={18} /> Upload history
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadList(page)}
              disabled={isLoadingList}
            >
              <RefreshCw size={14} />
            </Button>
          </div>

          {isLoadingList ? (
            <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
          ) : uploads.length === 0 ? (
            <EmptyState
              title="No uploads yet"
              description="Uploaded prescription documents will appear here."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {uploads.map((u) => (
                <li
                  key={u.id}
                  className={`py-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2 ${
                    u.id === selectedId ? "bg-indigo-50" : ""
                  }`}
                  onClick={() => handleSelect(u.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {u.originalFilename}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {u.uploadSource} · {new Date(u.createdAt).toLocaleString()} ·{" "}
                      {(u.fileSizeBytes / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <StatusPill status={u.status} />
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <button
                className="text-indigo-600 disabled:text-slate-300"
                disabled={page <= 1}
                onClick={() => {
                  const next = page - 1;
                  setPage(next);
                  loadList(next);
                }}
              >
                ← Previous
              </button>
              <span className="text-slate-500">
                Page {page} of {totalPages} ({total} total)
              </span>
              <button
                className="text-indigo-600 disabled:text-slate-300"
                disabled={page >= totalPages}
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  loadList(next);
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-soft p-5">
          {!selected ? (
            <EmptyState
              title="Select an upload"
              description="Choose an entry to view its machine-extracted text and audit history."
            />
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900 truncate">
                    {selected.originalFilename}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selected.mimeType} · SHA-256{" "}
                    <span className="font-mono">
                      {(selected.checksumSha256 || "").slice(0, 16)}…
                    </span>
                    {selected.ocrEngine ? ` · engine: ${selected.ocrEngine}` : ""}
                  </p>
                </div>
                <StatusPill status={selected.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500">Confidence</p>
                  <p className="font-semibold text-slate-800">
                    {selected.ocrConfidence !== null ? `${selected.ocrConfidence}%` : "—"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500">Source</p>
                  <p className="font-semibold text-slate-800">{selected.uploadSource}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500">Duration</p>
                  <p className="font-semibold text-slate-800">
                    {selected.ocrDurationMs !== null ? `${selected.ocrDurationMs} ms` : "—"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-500">Language</p>
                  <p className="font-semibold text-slate-800">{selected.ocrLanguage || "—"}</p>
                </div>
              </div>

              {selected.status === "ocr_failed" && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                  OCR failed: {selected.errorMessage || "unknown error"}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Machine-extracted text{" "}
                    <span className="font-normal text-slate-400">(AI OCR output)</span>
                  </h3>
                  <a
                    href={prescriptionDocumentUrl(selected.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                  >
                    View original <ExternalLink size={12} />
                  </a>
                </div>
                <pre className="whitespace-pre-wrap max-h-64 overflow-auto p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 font-mono">
                  {selected.rawOcrText ||
                    (selected.status === "ocr_failed"
                      ? "No text extracted — OCR failed."
                      : "No extracted text yet.")}
                </pre>
                <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {MANDATORY_WARNING}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Audit history</h3>
                {isLoadingAudit ? (
                  <p className="text-sm text-slate-500">Loading audit trail…</p>
                ) : auditEntries.length === 0 ? (
                  <p className="text-sm text-slate-500">No audit entries.</p>
                ) : (
                  <ul className="space-y-1.5 max-h-48 overflow-auto">
                    {auditEntries.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-start gap-2 text-xs text-slate-600"
                      >
                        <span className="font-mono font-semibold text-slate-700 shrink-0">
                          {entry.action}
                        </span>
                        <span className="text-slate-400 shrink-0">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                        <span className="truncate">
                          {entry.actorLabel || "unknown actor"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(selected.id)}
                >
                  <Trash2 size={14} /> Soft delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
