import { useEffect, useRef, useState } from "react";
import { Download, QrCode, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "../ui";
import { loadQrCodeGenerator } from "../../lib/qr/qrLoader.ts";

type QRCodeCardProps = {
  value: string;
  label: string;
  filename: string;
};

export default function QRCodeCard({ value, label, filename }: QRCodeCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting status before a fresh async load, not a render-time write
    setStatus("loading");
    loadQrCodeGenerator()
      .then((QRCodeCtor) => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = "";
        new QRCodeCtor(containerRef.current, { text: value, width: 140, height: 140, colorDark: "#0b6e99", colorLight: "#ffffff" });
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const handleDownload = () => {
    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${filename}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-card dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <QrCode className="h-4 w-4" /> {label}
      </div>
      <div className="flex h-[140px] w-[140px] items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900" ref={containerRef}>
        {status === "loading" && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
        {status === "error" && <AlertTriangle className="h-5 w-5 text-rose-500" />}
      </div>
      {status === "error" && <p className="text-xs text-rose-600 dark:text-rose-300">Couldn't load the QR generator. Check your connection and try again.</p>}
      <Button variant="ghost" onClick={handleDownload} disabled={status !== "ready"} className="gap-1 text-xs">
        <Download className="h-3.5 w-3.5" /> Download
      </Button>
    </div>
  );
}
