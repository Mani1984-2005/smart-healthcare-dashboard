import { useState } from 'react';
import { Copy, Check, AlertTriangle } from 'lucide-react';

export function OcrTextViewer({ prescription }) {
  const [copied, setCopied] = useState(false);
  const { status, rawOcrText, ocrConfidence, ocrDurationMs, errorMessage } = prescription;

  async function handleCopy() {
    if (!rawOcrText) return;
    await navigator.clipboard.writeText(rawOcrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (status === 'ocr_failed') {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 flex gap-3">
        <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-800 dark:text-red-200">OCR processing failed</p>
          <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{errorMessage || 'Unknown error.'}</p>
        </div>
      </div>
    );
  }

  if (status !== 'ocr_complete') {
    return (
      <div className="rounded-xl border border-border dark:border-border-dark bg-white dark:bg-surface-dark p-4">
        <p className="text-sm text-ink-light dark:text-ink-faint">Extracted text will appear here once OCR completes.</p>
      </div>
    );
  }

  const confidenceTone =
    ocrConfidence == null ? 'text-ink-faint' : ocrConfidence >= 80 ? 'text-clinical-600 dark:text-clinical-300' : ocrConfidence >= 50 ? 'text-warning' : 'text-danger';

  return (
    <div className="rounded-xl border border-border dark:border-border-dark bg-white dark:bg-surface-dark overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border dark:border-border-dark bg-black/[0.015] dark:bg-white/[0.02]">
        <div className="flex items-center gap-3 text-xs font-mono">
          {ocrConfidence != null && (
            <span className={confidenceTone}>confidence {ocrConfidence.toFixed(1)}%</span>
          )}
          {ocrDurationMs != null && <span className="text-ink-faint">{ocrDurationMs}ms</span>}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-light hover:text-clinical-600 dark:hover:text-clinical-300 transition-colors"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy text'}
        </button>
      </div>
      <pre className="p-4 text-sm font-mono whitespace-pre-wrap leading-relaxed text-ink dark:text-ink-faint max-h-96 overflow-y-auto">
        {rawOcrText?.trim() || '— No text detected —'}
      </pre>
    </div>
  );
}
