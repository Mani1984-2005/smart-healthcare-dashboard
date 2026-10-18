import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Image as ImageIcon, Camera, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

const STATUS_CONFIG = {
  uploaded: { label: 'Queued', icon: Clock, classes: 'text-ink-faint bg-black/5 dark:bg-white/5' },
  preprocessing: { label: 'Enhancing', icon: Loader2, classes: 'text-trust-600 bg-trust-50 dark:bg-trust-900/40 dark:text-trust-300', spin: true },
  ocr_running: { label: 'Reading text', icon: Loader2, classes: 'text-trust-600 bg-trust-50 dark:bg-trust-900/40 dark:text-trust-300', spin: true },
  ocr_complete: { label: 'Ready', icon: CheckCircle2, classes: 'text-clinical-700 bg-clinical-50 dark:bg-clinical-900/40 dark:text-clinical-300' },
  ocr_failed: { label: 'Failed', icon: XCircle, classes: 'text-danger bg-red-50 dark:bg-red-950/40' },
};

const SOURCE_ICON = { image: ImageIcon, pdf: FileText, camera: Camera };

export function PrescriptionCard({ prescription, index = 0 }) {
  const status = STATUS_CONFIG[prescription.status] || STATUS_CONFIG.uploaded;
  const StatusIcon = status.icon;
  const SourceIcon = SOURCE_ICON[prescription.uploadSource] || FileText;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.3 }}
    >
      <Link
        to={`/prescriptions/${prescription.id}`}
        className="group flex items-center gap-4 rounded-xl border border-border dark:border-border-dark bg-white dark:bg-surface-dark p-3.5 sm:p-4 shadow-card hover:shadow-cardHover hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="h-12 w-12 shrink-0 rounded-lg bg-paper dark:bg-paper-dark border border-border dark:border-border-dark flex items-center justify-center text-ink-faint">
          <SourceIcon size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-ink dark:text-white truncate">
            {prescription.originalFilename}
          </p>
          <p className="text-xs text-ink-faint font-mono mt-0.5">
            {new Date(prescription.createdAt).toLocaleString()} · {(prescription.fileSizeBytes / 1024).toFixed(0)} KB
          </p>
        </div>

        <span
          className={clsx(
            'flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
            status.classes
          )}
        >
          <StatusIcon size={13} className={status.spin ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{status.label}</span>
        </span>
      </Link>
    </motion.div>
  );
}
