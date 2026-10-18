import { motion } from 'framer-motion';

const STAGE_LABELS = {
  uploading: 'Uploading file…',
  preprocessing: 'Enhancing image for OCR…',
  ocr_running: 'Extracting prescription text…',
  ocr_complete: 'Complete',
};

export function UploadProgress({ stage, percent }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-sm font-medium text-ink dark:text-white">
          {STAGE_LABELS[stage] || 'Processing…'}
        </p>
        {typeof percent === 'number' && (
          <p className="text-xs font-mono text-ink-faint">{percent}%</p>
        )}
      </div>
      <div className="h-1.5 w-full rounded-full bg-border dark:bg-border-dark overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-clinical-500"
          initial={{ width: 0 }}
          animate={{ width: `${percent ?? 100}%` }}
          transition={{ ease: 'easeOut', duration: 0.4 }}
        />
      </div>
    </div>
  );
}
