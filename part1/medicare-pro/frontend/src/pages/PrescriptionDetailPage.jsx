import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trash2, ShieldCheck, FileImage } from 'lucide-react';
import { OcrTextViewer } from '../components/prescriptions/OcrTextViewer';
import { Spinner } from '../components/common/Spinner';
import { fetchPrescription, fetchPrescriptionAuditTrail, deletePrescription } from '../api/prescriptions';

export function PrescriptionDetailPage({ pushToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prescription, setPrescription] = useState(null);
  const [auditTrail, setAuditTrail] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, audit] = await Promise.all([
        fetchPrescription(id),
        fetchPrescriptionAuditTrail(id),
      ]);
      setPrescription(p);
      setAuditTrail(audit);
    } catch (err) {
      pushToast(err.friendlyMessage || 'Failed to load prescription.', 'error');
      navigate('/prescriptions');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate, pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!window.confirm('Delete this prescription record permanently?')) return;
    setIsDeleting(true);
    try {
      await deletePrescription(id);
      pushToast('Prescription deleted.', 'success');
      navigate('/prescriptions');
    } catch (err) {
      pushToast(err.friendlyMessage || 'Failed to delete prescription.', 'error');
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size={26} className="text-clinical-500" />
      </div>
    );
  }

  if (!prescription) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/prescriptions"
          className="flex items-center gap-1.5 text-sm text-ink-light hover:text-ink dark:text-ink-faint dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={15} /> All records
        </Link>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center gap-1.5 text-sm text-ink-light hover:text-danger transition-colors disabled:opacity-50"
        >
          <Trash2 size={15} /> Delete
        </button>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-display text-xl sm:text-2xl font-semibold text-ink dark:text-white truncate">
          {prescription.originalFilename}
        </h1>
        <p className="text-xs font-mono text-ink-faint mt-1">
          {new Date(prescription.createdAt).toLocaleString()} · {prescription.id}
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint mb-2">
            <FileImage size={13} /> Original scan
          </p>
          <div className="rounded-xl border border-border dark:border-border-dark bg-white dark:bg-surface-dark p-2 flex items-center justify-center min-h-[240px]">
            {prescription.mimeType === 'application/pdf' ? (
              <a
                href={prescription.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-clinical-600 dark:text-clinical-300 underline underline-offset-2"
              >
                Open PDF in new tab
              </a>
            ) : (
              <img
                src={prescription.fileUrl}
                alt="Uploaded prescription"
                className="max-h-96 rounded-lg object-contain"
              />
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-faint mb-2">Extracted text</p>
          <OcrTextViewer prescription={prescription} />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-8"
      >
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint mb-2">
          <ShieldCheck size={13} /> Audit trail
        </p>
        <div className="rounded-xl border border-border dark:border-border-dark bg-white dark:bg-surface-dark divide-y divide-border dark:divide-border-dark">
          {auditTrail.length === 0 ? (
            <p className="p-4 text-sm text-ink-faint">No audit events recorded.</p>
          ) : (
            auditTrail.map((event) => (
              <div key={event.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="font-mono text-ink dark:text-ink-faint">{event.action}</span>
                <span className="text-xs text-ink-faint">{new Date(event.created_at).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
