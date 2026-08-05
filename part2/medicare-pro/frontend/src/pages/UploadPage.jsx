import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera as CameraIcon, ArrowRight } from 'lucide-react';
import { DropzoneUpload } from '../components/upload/DropzoneUpload';
import { CameraCapture } from '../components/upload/CameraCapture';
import { UploadProgress } from '../components/upload/UploadProgress';
import { uploadPrescription } from '../api/prescriptions';

export function UploadPage({ pushToast }) {
  const [file, setFile] = useState(null);
  const [source, setSource] = useState('image');
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [stage, setStage] = useState(null);
  const navigate = useNavigate();

  function handleFileSelected(selected) {
    setFile(selected);
    setSource(selected.type === 'application/pdf' ? 'pdf' : 'image');
  }

  function handleCameraCapture(capturedFile) {
    setFile(capturedFile);
    setSource('camera');
    setShowCamera(false);
  }

  async function handleAnalyze() {
    if (!file) return;
    setIsProcessing(true);
    setStage('uploading');
    setUploadPercent(0);

    try {
      const result = await uploadPrescription(file, source, (pct) => {
        setUploadPercent(pct);
        if (pct >= 100) setStage('ocr_running');
      });

      if (result.status === 'ocr_failed') {
        pushToast(`Uploaded, but OCR failed: ${result.errorMessage}`, 'warning');
      } else {
        pushToast('Prescription uploaded and text extracted successfully.', 'success');
      }
      navigate(`/prescriptions/${result.id}`);
    } catch (err) {
      pushToast(err.friendlyMessage || 'Upload failed. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
      setStage(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-8"
      >
        <p className="text-xs font-mono uppercase tracking-[0.16em] text-clinical-600 dark:text-clinical-300 mb-2">
          Prescription capture
        </p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink dark:text-white tracking-tight">
          Turn a prescription photo into structured text
        </h1>
        <p className="mt-3 text-ink-light dark:text-ink-faint max-w-md mx-auto">
          Drop an image or PDF, or capture one with your camera. We enhance the scan and read every line automatically.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col gap-4"
      >
        <DropzoneUpload
          onFileSelected={handleFileSelected}
          selectedFile={file}
          isProcessing={isProcessing}
          onClear={() => setFile(null)}
        />

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border dark:bg-border-dark" />
          <span className="text-xs text-ink-faint uppercase tracking-wide">or</span>
          <div className="h-px flex-1 bg-border dark:bg-border-dark" />
        </div>

        <button
          onClick={() => setShowCamera(true)}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 rounded-xl border border-border dark:border-border-dark bg-white dark:bg-surface-dark py-3 text-sm font-medium text-ink dark:text-white hover:border-clinical-300 hover:text-clinical-700 dark:hover:text-clinical-300 transition-colors disabled:opacity-50"
        >
          <CameraIcon size={17} /> Use camera
        </button>

        <AnimatePresence>
          {isProcessing && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <UploadProgress stage={stage} percent={stage === 'uploading' ? uploadPercent : undefined} />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleAnalyze}
          disabled={!file || isProcessing}
          className="flex items-center justify-center gap-2 rounded-xl bg-clinical-500 hover:bg-clinical-600 disabled:bg-border disabled:dark:bg-border-dark disabled:text-ink-faint text-white font-medium py-3.5 transition-colors shadow-card"
        >
          {isProcessing ? 'Processing…' : 'Analyze prescription'}
          {!isProcessing && <ArrowRight size={17} />}
        </button>
      </motion.div>

      <AnimatePresence>
        {showCamera && (
          <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
