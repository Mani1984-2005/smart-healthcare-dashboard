import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RotateCcw, Check, X } from 'lucide-react';

/**
 * Uses getUserMedia to capture a prescription photo directly from the
 * device camera (primarily for mobile). Falls back gracefully with an
 * error message if the browser/device denies camera access.
 */
export function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');

  const startStream = useCallback(async () => {
    setError(null);
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Camera access was denied or is unavailable on this device.');
    }
  }, [facingMode]);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    startStream();
    return () => stopStream();
  }, [startStream]);

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => setCapturedBlob(blob), 'image/jpeg', 0.92);
  }

  function handleConfirm() {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
    onCapture(file);
  }

  function handleRetake() {
    setCapturedBlob(null);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <p className="text-sm font-medium">Capture prescription</p>
        <button onClick={onClose} aria-label="Close camera" className="p-1">
          <X size={20} />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden bg-black flex items-center justify-center">
        {error ? (
          <p className="text-white text-sm px-8 text-center">{error}</p>
        ) : (
          <>
            <AnimatePresence mode="wait">
              {!capturedBlob ? (
                <motion.video
                  key="live"
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              ) : (
                <motion.img
                  key="preview"
                  src={URL.createObjectURL(capturedBlob)}
                  alt="Captured prescription"
                  className="h-full w-full object-contain bg-black"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              )}
            </AnimatePresence>
            {/* Document framing guide */}
            {!capturedBlob && (
              <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/50" />
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex items-center justify-center gap-8 py-6 bg-black">
        {!capturedBlob ? (
          <>
            <button
              onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
              className="p-3 rounded-full bg-white/10 text-white"
              aria-label="Flip camera"
            >
              <RotateCcw size={20} />
            </button>
            <button
              onClick={handleCapture}
              disabled={!!error}
              className="h-16 w-16 rounded-full bg-white ring-4 ring-white/30 disabled:opacity-40"
              aria-label="Capture photo"
            />
            <div className="w-11" />
          </>
        ) : (
          <>
            <button
              onClick={handleRetake}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/10 text-white text-sm"
            >
              <RotateCcw size={16} /> Retake
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-clinical-500 text-white text-sm font-medium"
            >
              <Check size={16} /> Use photo
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

export function CameraTriggerIcon(props) {
  return <Camera {...props} />;
}
