import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, AlertTriangle } from "lucide-react";
import Dialog from "../ui/Dialog.tsx";
import { loadQrScanner } from "../../lib/qr/qrLoader.ts";

type QRScannerModalProps = {
  open: boolean;
  onClose: () => void;
  onResult: (decodedText: string) => void;
};

const SCANNER_ELEMENT_ID = "qr-scanner-region";

export default function QRScannerModal({ open, onClose, onResult }: QRScannerModalProps) {
  const [status, setStatus] = useState<"loading" | "scanning" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting status before a fresh async camera start, not a render-time write
    setStatus("loading");
    setErrorMessage("");

    loadQrScanner()
      .then(async (Html5QrcodeCtor) => {
        if (cancelled) return;
        const scanner = new Html5QrcodeCtor(SCANNER_ELEMENT_ID);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 220 },
          (decodedText: string) => {
            onResult(decodedText);
          },
          () => {
            // per-frame scan misses are expected and not surfaced as errors
          }
        );
        if (!cancelled) setStatus("scanning");
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          error instanceof Error && error.message.toLowerCase().includes("permission")
            ? "Camera access was denied. Allow camera permission in your browser and try again."
            : "Couldn't start the camera scanner. Check your camera permissions and connection, then try again."
        );
      });

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop?.().catch(() => {});
        scannerRef.current.clear?.();
        scannerRef.current = null;
      }
    };
  }, [open, onResult]);

  return (
    <Dialog open={open} onClose={onClose} title="Scan QR code">
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Scan a patient, doctor, appointment, invoice, lab, or prescription QR code to jump straight to that record.
        </p>
        <div className="relative overflow-hidden rounded-lg bg-slate-900" style={{ minHeight: 260 }}>
          <div id={SCANNER_ELEMENT_ID} className="mx-auto" />
          {status === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Starting camera...</p>
            </div>
          )}
        </div>
        {status === "error" && (
          <p className="flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {errorMessage}
          </p>
        )}
        {status === "scanning" && (
          <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Camera className="h-4 w-4" /> Point the camera at a QR code.
          </p>
        )}
      </div>
    </Dialog>
  );
}
