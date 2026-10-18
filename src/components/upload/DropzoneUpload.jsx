import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, Image as ImageIcon, X } from 'lucide-react';
import clsx from 'clsx';

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/heic': ['.heic'],
  'application/pdf': ['.pdf'],
};

const MAX_SIZE_BYTES = 15 * 1024 * 1024;

export function DropzoneUpload({ onFileSelected, selectedFile, isProcessing, onClear }) {
  const [rejectionError, setRejectionError] = useState(null);

  const onDrop = useCallback(
    (acceptedFiles, fileRejections) => {
      setRejectionError(null);
      if (fileRejections.length > 0) {
        const reason = fileRejections[0].errors[0]?.message || 'File was rejected';
        setRejectionError(reason);
        return;
      }
      if (acceptedFiles.length > 0) {
        onFileSelected(acceptedFiles[0]);
      }
    },
    [onFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE_BYTES,
    multiple: false,
    disabled: isProcessing,
  });

  const isPdf = selectedFile?.type === 'application/pdf';
  const previewUrl = selectedFile && !isPdf ? URL.createObjectURL(selectedFile) : null;

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={clsx(
          'relative overflow-hidden rounded-2xl border-2 border-dashed transition-colors duration-200 cursor-pointer',
          'flex flex-col items-center justify-center text-center px-6 py-12 sm:py-16',
          isDragActive
            ? 'border-clinical-400 bg-clinical-50 dark:bg-clinical-900/30'
            : 'border-border dark:border-border-dark bg-white dark:bg-surface-dark hover:border-clinical-300',
          isProcessing && 'cursor-wait'
        )}
      >
        <input {...getInputProps()} aria-label="Upload prescription file" />

        {/* Signature: OCR scan-line sweep while processing */}
        {isProcessing && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-0 h-1/4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-clinical-400 to-transparent shadow-[0_0_12px_2px_rgba(14,124,102,0.55)] animate-scan" />
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!selectedFile ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-clinical-50 dark:bg-clinical-900/40 text-clinical-600 dark:text-clinical-300">
                <UploadCloud size={26} />
              </span>
              <div>
                <p className="font-medium text-ink dark:text-white">
                  {isDragActive ? 'Drop the prescription here' : 'Drag & drop a prescription'}
                </p>
                <p className="mt-1 text-sm text-ink-light dark:text-ink-faint">
                  or tap to browse — JPG, PNG, WEBP, HEIC, or PDF, up to 15MB
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="file"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 w-full"
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Selected prescription preview"
                  className="max-h-56 rounded-lg border border-border dark:border-border-dark object-contain shadow-card"
                />
              ) : (
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-trust-50 dark:bg-trust-900/40 text-trust-600 dark:text-trust-300">
                  <FileText size={26} />
                </span>
              )}
              <div className="flex items-center gap-2 max-w-full">
                <ImageIcon size={14} className="text-ink-faint shrink-0" />
                <p className="text-sm font-mono text-ink dark:text-ink-faint truncate max-w-[16rem]">
                  {selectedFile.name}
                </p>
              </div>
              {!isProcessing && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClear();
                  }}
                  className="flex items-center gap-1 text-xs text-ink-light hover:text-danger transition-colors"
                >
                  <X size={13} /> Remove file
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {rejectionError && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {rejectionError}
        </p>
      )}
    </div>
  );
}
