// FILE PATH: src/components/BarcodeScanner.jsx
// Day 6 — Barcode Scanner | MediCare Pro
//
// Uses the browser's native BarcodeDetector API (supported in Chrome/Edge 88+, Android Chrome).
// Falls back to a manual entry field on unsupported browsers (Safari, Firefox).
//
// HOW TO USE in any page:
//   import BarcodeScanner from "../components/BarcodeScanner";
//
//   <BarcodeScanner
//     onScan={(code) => console.log("Scanned:", code)}
//     onClose={() => setShowScanner(false)}
//   />
//
// Props:
//   onScan(code: string) — called when a barcode is successfully detected
//   onClose()            — called when user dismisses the scanner
//   label (optional)     — header label, default "Scan Barcode"

import { useEffect, useRef, useState, useCallback } from "react";

// ─── Check browser support ─────────────────────────────────────────────────────

const isSupported = typeof window !== "undefined" && "BarcodeDetector" in window;

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BarcodeScanner({ onScan, onClose, label = "Scan Barcode" }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const detectorRef = useRef(null);

  const [status, setStatus] = useState("idle"); // idle | requesting | scanning | error | unsupported
  const [errorMsg, setErrorMsg] = useState("");
  const [lastCode, setLastCode] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [useManual, setUseManual] = useState(!isSupported);
  const [torchOn, setTorchOn] = useState(false);
  const [cameras, setCameras] = useState([]); // list of video devices
  const [activeCameraId, setActiveCameraId] = useState(null);

  // ── Start camera ────────────────────────────────────────────────────────────

  const startCamera = useCallback(async (deviceId) => {
    // Stop any existing stream
    stopCamera();

    setStatus("requesting");
    setErrorMsg("");

    try {
      const constraints = {
        video: {
          facingMode: deviceId ? undefined : "environment", // prefer rear camera by default
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Enumerate cameras after permission granted
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setCameras(videoDevices);
      if (!deviceId && videoDevices.length > 0) {
        setActiveCameraId(videoDevices[0].deviceId);
      }

      setStatus("scanning");
    } catch (err) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        setErrorMsg("Camera access denied. Please allow camera permissions in your browser.");
      } else if (err.name === "NotFoundError") {
        setErrorMsg("No camera found on this device.");
      } else {
        setErrorMsg(`Camera error: ${err.message}`);
      }
      setStatus("error");
    }
  }, []);

  // ── Stop camera ─────────────────────────────────────────────────────────────

  function stopCamera() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  // ── Toggle torch ────────────────────────────────────────────────────────────

  async function toggleTorch() {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const newState = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: newState }] });
      setTorchOn(newState);
    } catch {
      // Torch not supported on this device — silently ignore
    }
  }

  // ── Scan loop using BarcodeDetector ─────────────────────────────────────────

  useEffect(() => {
    if (useManual || status !== "scanning") return;
    if (!isSupported) return;

    if (!detectorRef.current) {
      // Prefer common formats
      detectorRef.current = new window.BarcodeDetector({
        formats: [
          "qr_code",
          "ean_13",
          "ean_8",
          "code_128",
          "code_39",
          "upc_a",
          "upc_e",
          "data_matrix",
          "pdf417",
        ],
      });
    }

    let lastDetected = "";
    let lastDetectedTime = 0;

    async function detect() {
      if (!videoRef.current || videoRef.current.readyState !== 4) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        const barcodes = await detectorRef.current.detect(videoRef.current);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          const now = Date.now();
          // Debounce: same code within 2 seconds = ignore
          if (code !== lastDetected || now - lastDetectedTime > 2000) {
            lastDetected = code;
            lastDetectedTime = now;
            setLastCode(code);
            // Beep feedback
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 880;
              gain.gain.setValueAtTime(0.3, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.15);
            } catch { /* audio not critical */ }
          }
        }
      } catch { /* ignore frame errors */ }

      animFrameRef.current = requestAnimationFrame(detect);
    }

    animFrameRef.current = requestAnimationFrame(detect);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [status, useManual]);

  // ── Start camera on mount (if supported, not manual) ───────────────────────

  useEffect(() => {
    if (!useManual && isSupported) {
      startCamera(null);
    }
    return () => stopCamera();
  }, [useManual, startCamera]);

  // ── Handle switching camera ─────────────────────────────────────────────────

  function switchCamera(deviceId) {
    setActiveCameraId(deviceId);
    startCamera(deviceId);
  }

  // ── Confirm a scanned code ──────────────────────────────────────────────────

  function confirmCode(code) {
    if (!code.trim()) return;
    onScan(code.trim());
  }

  // ── Manual submit ───────────────────────────────────────────────────────────

  function handleManualSubmit(e) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    confirmCode(manualCode);
    setManualCode("");
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
          <h2 className="text-base font-bold text-gray-800">📷 {label}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* ── Unsupported Browser Notice ──────────────────────────────────── */}
          {!isSupported && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800">
              ⚠️ Your browser does not support automatic barcode detection (BarcodeDetector API).
              <br />
              <strong>Works in:</strong> Chrome 88+, Edge 88+, Android Chrome.
              <br />
              Use the manual entry below instead.
            </div>
          )}

          {/* ── Mode Toggle ────────────────────────────────────────────────── */}
          {isSupported && (
            <div className="flex gap-2">
              <button
                onClick={() => { setUseManual(false); if (!streamRef.current) startCamera(null); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition ${!useManual ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
              >
                📷 Camera Scan
              </button>
              <button
                onClick={() => { setUseManual(true); stopCamera(); setStatus("idle"); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg border transition ${useManual ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
              >
                ⌨️ Manual Entry
              </button>
            </div>
          )}

          {/* ── Camera View ────────────────────────────────────────────────── */}
          {!useManual && (
            <div>
              {/* Video */}
              <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                {/* Scan frame overlay */}
                {status === "scanning" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-4 border-blue-400 rounded-xl relative">
                      {/* Corner decorations */}
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br" />
                      {/* Scan line animation */}
                      <div className="absolute left-1 right-1 top-1/2 h-0.5 bg-blue-400 opacity-70 animate-ping" />
                    </div>
                  </div>
                )}
                {/* Loading state */}
                {status === "requesting" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm">Starting camera…</p>
                  </div>
                )}
                {/* Error state */}
                {status === "error" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 p-4">
                    <span className="text-4xl">⚠️</span>
                    <p className="text-sm text-center text-red-300">{errorMsg}</p>
                    <button onClick={() => startCamera(activeCameraId)}
                      className="bg-white text-gray-800 px-4 py-2 rounded-lg text-sm font-medium">
                      Retry
                    </button>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {cameras.length > 1 && (
                  <select
                    value={activeCameraId || ""}
                    onChange={(e) => switchCamera(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                  >
                    {cameras.map((cam, i) => (
                      <option key={cam.deviceId} value={cam.deviceId}>
                        {cam.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={toggleTorch}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${torchOn ? "bg-yellow-400 border-yellow-400 text-yellow-900" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                >
                  {torchOn ? "🔦 Light On" : "🔦 Light"}
                </button>
              </div>

              {/* Last Detected */}
              {lastCode && (
                <div className="mt-4 bg-green-50 border border-green-300 rounded-xl p-4">
                  <p className="text-xs text-green-600 font-semibold uppercase mb-1">Detected</p>
                  <p className="text-gray-800 font-mono text-sm break-all">{lastCode}</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => confirmCode(lastCode)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                    >
                      ✅ Use This Code
                    </button>
                    <button
                      onClick={() => setLastCode("")}
                      className="px-4 py-2 border border-gray-300 text-gray-500 rounded-lg text-sm hover:bg-gray-50 transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {status === "scanning" && !lastCode && (
                <p className="text-center text-xs text-gray-400 mt-3">
                  Point your camera at a barcode or QR code
                </p>
              )}
            </div>
          )}

          {/* ── Manual Entry ───────────────────────────────────────────────── */}
          {useManual && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter barcode / QR code manually
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleManualSubmit(e); }}
                  placeholder="Type or paste barcode…"
                  autoFocus
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
                />
                <button
                  onClick={handleManualSubmit}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                >
                  Submit
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Press Enter or click Submit to use the code.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-gray-50 text-right">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Example wrapper: how to add a "Scan" button on any page ─────────────────
//
// import { useState } from "react";
// import BarcodeScanner from "../components/BarcodeScanner";
//
// function MyPage() {
//   const [showScanner, setShowScanner] = useState(false);
//   const [scannedCode, setScannedCode] = useState("");
//
//   function handleScan(code) {
//     setScannedCode(code);
//     setShowScanner(false);
//     // do something with `code` — e.g. look up medicine by ID
//   }
//
//   return (
//     <div>
//       <button onClick={() => setShowScanner(true)}>📷 Scan Barcode</button>
//       {scannedCode && <p>Last scan: {scannedCode}</p>}
//       {showScanner && (
//         <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
//       )}
//     </div>
//   );
// }